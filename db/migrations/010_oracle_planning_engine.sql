-- Additive Demand & Availability planning domain.
-- Planner models, forecasts, decisions, and outcomes remain independently measurable.
-- Existing Decision Platform, evidence, Mercury, authentication, and API contracts are unchanged.

create table if not exists oracle_planning_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references platform_organizations(id) on delete restrict,
  decision_case_id uuid not null,
  asin text,
  sku text not null,
  marketplace text,
  category text,
  license text,
  product_group text,
  lifecycle_state text not null check (lifecycle_state in ('NEWNESS','GROWTH','STABLE','PROMO_SPIKE','SEASONAL','MOVIE_RELEASE','POST_EVENT_DECAY','DECLINING','END_OF_LIFE')),
  coverage_horizon_date date not null,
  status text not null default 'draft' check (status in ('draft','review','approved','executed','measuring','closed')),
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint oracle_planning_cases_decision_org_fk foreign key (decision_case_id, organization_id)
    references decision_cases(id, organization_id) on delete restrict
);
create index if not exists oracle_planning_cases_attention_idx on oracle_planning_cases (organization_id, status, updated_at desc, id);
create index if not exists oracle_planning_cases_product_idx on oracle_planning_cases (organization_id, marketplace, sku, created_at desc);

create table if not exists oracle_planner_models (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references platform_organizations(id) on delete restrict,
  name text not null,
  version text not null,
  model_type text not null check (model_type in ('human','oracle','naive')),
  description text not null,
  configuration jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, name, version)
);

create table if not exists oracle_planning_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references platform_organizations(id) on delete restrict,
  planner_model_id uuid not null,
  rule_key text not null,
  version integer not null check (version > 0),
  statement text not null,
  configuration jsonb not null,
  effective_at timestamptz not null,
  retired_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, planner_model_id, rule_key, version),
  constraint oracle_planning_rules_model_org_fk foreign key (planner_model_id, organization_id)
    references oracle_planner_models(id, organization_id) on delete restrict
);

create table if not exists oracle_planning_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references platform_organizations(id) on delete restrict,
  decision_case_id uuid not null,
  planning_case_id uuid not null,
  decision_evidence_id uuid,
  source_message_id text not null,
  sender text not null,
  received_at timestamptz not null,
  subject text not null,
  asin text,
  sku text not null,
  metric_name text,
  metric_value numeric,
  unit text,
  period_start timestamptz,
  period_end timestamptz,
  classification text not null check (classification in ('OBSERVATION','PLANNER_ASSUMPTION','PLANNER_RULE','PLANNER_OVERRIDE','RECOMMENDATION','OUTCOME')),
  stated_rule text,
  stated_exception text,
  stated_reasoning text,
  recommended_action text,
  source_confidence numeric(5,4) not null check (source_confidence between 0 and 1),
  provenance jsonb not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, source_message_id, sku, classification, metric_name, period_start),
  constraint oracle_planning_evidence_case_org_fk foreign key (planning_case_id, organization_id)
    references oracle_planning_cases(id, organization_id) on delete restrict,
  constraint oracle_planning_evidence_decision_org_fk foreign key (decision_case_id, organization_id)
    references decision_cases(id, organization_id) on delete restrict,
  constraint oracle_planning_evidence_source_org_fk foreign key (decision_evidence_id, organization_id)
    references decision_evidence(id, organization_id) on delete restrict,
  constraint oracle_planning_evidence_commentary_check check (
    classification = 'OBSERVATION' or metric_value is null or stated_reasoning is not null
  )
);
create index if not exists oracle_planning_evidence_case_idx on oracle_planning_evidence (organization_id, planning_case_id, received_at desc, id);

create table if not exists oracle_demand_signals (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references platform_organizations(id) on delete restrict,
  decision_case_id uuid not null,
  planning_case_id uuid not null,
  normalized_evidence_item_id text,
  asin text,
  sku text not null,
  metric text not null,
  value numeric not null,
  unit text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  observed_at timestamptz not null,
  source text not null,
  freshness text not null check (freshness in ('current','delayed','stale','unavailable')),
  confidence numeric(5,4) not null check (confidence between 0 and 1),
  demand_censored boolean not null default false,
  censor_reason text,
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint oracle_demand_signals_case_org_fk foreign key (planning_case_id, organization_id)
    references oracle_planning_cases(id, organization_id) on delete restrict,
  constraint oracle_demand_signals_decision_org_fk foreign key (decision_case_id, organization_id)
    references decision_cases(id, organization_id) on delete restrict,
  constraint oracle_demand_signals_censor_check check (not demand_censored or censor_reason is not null)
);
create index if not exists oracle_demand_signals_product_time_idx on oracle_demand_signals (organization_id, sku, metric, period_end desc, id);

create table if not exists oracle_inventory_positions (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references platform_organizations(id) on delete restrict,
  decision_case_id uuid not null,
  planning_case_id uuid not null,
  asin text,
  sku text not null,
  as_of timestamptz not null,
  amazon_oh numeric not null default 0 check (amazon_oh >= 0),
  amazon_oo numeric not null default 0 check (amazon_oo >= 0),
  awc_oh numeric not null default 0 check (awc_oh >= 0),
  df_available numeric not null default 0 check (df_available >= 0),
  transferable numeric not null default 0 check (transferable >= 0),
  committed numeric not null default 0 check (committed >= 0),
  promo_committed numeric not null default 0 check (promo_committed >= 0),
  inbound numeric not null default 0 check (inbound >= 0),
  protected numeric not null default 0 check (protected >= 0),
  usable_inventory numeric not null check (usable_inventory >= 0),
  current_wos numeric,
  forward_wos numeric,
  days_of_cover numeric,
  projected_stockout_date timestamptz,
  projected_excess_date timestamptz,
  estimated_availability_date timestamptz,
  risk text not null check (risk in ('unknown','stockout','constrained','balanced','excess')),
  assumptions jsonb not null default '[]'::jsonb,
  missing_evidence jsonb not null default '[]'::jsonb,
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint oracle_inventory_positions_case_org_fk foreign key (planning_case_id, organization_id)
    references oracle_planning_cases(id, organization_id) on delete restrict,
  constraint oracle_inventory_positions_decision_org_fk foreign key (decision_case_id, organization_id)
    references decision_cases(id, organization_id) on delete restrict
);
create index if not exists oracle_inventory_positions_case_time_idx on oracle_inventory_positions (organization_id, planning_case_id, as_of desc, id);

create table if not exists oracle_forecasts (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references platform_organizations(id) on delete restrict,
  decision_case_id uuid not null,
  planning_case_id uuid not null,
  planner_model_id uuid not null,
  asin text,
  sku text not null,
  horizon_weeks numeric not null check (horizon_weeks > 0),
  base_forecast numeric not null check (base_forecast >= 0),
  lower_bound numeric not null check (lower_bound >= 0),
  upper_bound numeric not null check (upper_bound >= lower_bound),
  weekly_rate numeric not null check (weekly_rate >= 0),
  confidence numeric(5,4) not null check (confidence between 0 and 1),
  assumptions jsonb not null default '[]'::jsonb,
  missing_evidence jsonb not null default '[]'::jsonb,
  drivers jsonb not null default '[]'::jsonb,
  input_cutoff timestamptz not null,
  calculated_by text not null,
  calculated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint oracle_forecasts_case_org_fk foreign key (planning_case_id, organization_id)
    references oracle_planning_cases(id, organization_id) on delete restrict,
  constraint oracle_forecasts_decision_org_fk foreign key (decision_case_id, organization_id)
    references decision_cases(id, organization_id) on delete restrict,
  constraint oracle_forecasts_model_org_fk foreign key (planner_model_id, organization_id)
    references oracle_planner_models(id, organization_id) on delete restrict
);
create index if not exists oracle_forecasts_case_model_time_idx on oracle_forecasts (organization_id, planning_case_id, planner_model_id, calculated_at desc, id);

create table if not exists oracle_forecast_comparisons (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references platform_organizations(id) on delete restrict,
  decision_case_id uuid not null,
  planning_case_id uuid not null,
  michael_forecast_id uuid not null,
  oracle_forecast_id uuid not null,
  naive_forecast_id uuid,
  absolute_difference numeric not null check (absolute_difference >= 0),
  percentage_difference numeric,
  materially_disagrees boolean not null,
  disagreement_drivers jsonb not null,
  value_of_information jsonb not null,
  compared_at timestamptz not null default now(),
  compared_by text not null,
  unique (id, organization_id),
  constraint oracle_comparisons_case_org_fk foreign key (planning_case_id, organization_id) references oracle_planning_cases(id, organization_id) on delete restrict,
  constraint oracle_comparisons_decision_org_fk foreign key (decision_case_id, organization_id) references decision_cases(id, organization_id) on delete restrict,
  constraint oracle_comparisons_michael_org_fk foreign key (michael_forecast_id, organization_id) references oracle_forecasts(id, organization_id) on delete restrict,
  constraint oracle_comparisons_oracle_org_fk foreign key (oracle_forecast_id, organization_id) references oracle_forecasts(id, organization_id) on delete restrict,
  constraint oracle_comparisons_naive_org_fk foreign key (naive_forecast_id, organization_id) references oracle_forecasts(id, organization_id) on delete restrict
);

create table if not exists oracle_replenishment_options (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references platform_organizations(id) on delete restrict,
  decision_case_id uuid not null,
  planning_case_id uuid not null,
  forecast_comparison_id uuid not null,
  action text not null check (action in ('BUY','DO_NOT_BUY','BUY_SMALLER','BUY_LARGER','DF','BTR','TRANSFER_INVENTORY','WAIT_FOR_MORE_EVIDENCE','REDUCE_BUY','INCREASE_BUY','EXPEDITE','AIR_SHIP','DEFER','HUMAN_REVIEW')),
  quantity numeric not null check (quantity >= 0),
  expected_wos numeric,
  expected_stockout_probability numeric(5,4) not null check (expected_stockout_probability between 0 and 1),
  expected_excess_inventory numeric not null check (expected_excess_inventory >= 0),
  expected_service_level numeric(5,4) not null check (expected_service_level between 0 and 1),
  lead_time_days numeric,
  moq_impact text not null,
  cost_minor bigint,
  cost_currency text,
  risk text not null check (risk in ('low','medium','high','critical')),
  reversibility text not null check (reversibility in ('easy','moderate','difficult','irreversible')),
  confidence numeric(5,4) not null check (confidence between 0 and 1),
  why jsonb not null,
  what_could_make_wrong jsonb not null,
  rank integer not null check (rank > 0),
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint oracle_options_case_org_fk foreign key (planning_case_id, organization_id) references oracle_planning_cases(id, organization_id) on delete restrict,
  constraint oracle_options_decision_org_fk foreign key (decision_case_id, organization_id) references decision_cases(id, organization_id) on delete restrict,
  constraint oracle_options_comparison_org_fk foreign key (forecast_comparison_id, organization_id) references oracle_forecast_comparisons(id, organization_id) on delete restrict,
  constraint oracle_options_cost_check check ((cost_minor is null and cost_currency is null) or (cost_minor is not null and cost_minor >= 0 and cost_currency is not null))
);
create index if not exists oracle_options_case_rank_idx on oracle_replenishment_options (organization_id, planning_case_id, rank, id);

create table if not exists oracle_inventory_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references platform_organizations(id) on delete restrict,
  decision_case_id uuid not null,
  planning_case_id uuid not null,
  selected_option_id uuid not null,
  approval_status text not null default 'pending' check (approval_status in ('not_required','pending','approved','rejected')),
  status text not null default 'proposed' check (status in ('proposed','approved','executed','measuring','measured','cancelled')),
  expected_outcome jsonb not null,
  selected_by text not null,
  selected_at timestamptz not null default now(),
  approved_by text,
  approved_at timestamptz,
  executed_at timestamptz,
  unique (id, organization_id),
  constraint oracle_decisions_case_org_fk foreign key (planning_case_id, organization_id) references oracle_planning_cases(id, organization_id) on delete restrict,
  constraint oracle_decisions_decision_org_fk foreign key (decision_case_id, organization_id) references decision_cases(id, organization_id) on delete restrict,
  constraint oracle_decisions_option_org_fk foreign key (selected_option_id, organization_id) references oracle_replenishment_options(id, organization_id) on delete restrict
);

create table if not exists oracle_planner_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references platform_organizations(id) on delete restrict,
  decision_case_id uuid not null,
  planning_case_id uuid not null,
  inventory_decision_id uuid not null,
  planner_id text not null,
  asin text,
  sku text not null,
  original_recommendation jsonb not null,
  override_value jsonb not null,
  reason text not null,
  expected_outcome text not null,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint oracle_overrides_case_org_fk foreign key (planning_case_id, organization_id) references oracle_planning_cases(id, organization_id) on delete restrict,
  constraint oracle_overrides_decision_case_org_fk foreign key (decision_case_id, organization_id) references decision_cases(id, organization_id) on delete restrict,
  constraint oracle_overrides_inventory_decision_org_fk foreign key (inventory_decision_id, organization_id) references oracle_inventory_decisions(id, organization_id) on delete restrict
);

create table if not exists oracle_planning_outcomes (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references platform_organizations(id) on delete restrict,
  decision_case_id uuid not null,
  planning_case_id uuid not null,
  inventory_decision_id uuid not null,
  forecast_demand numeric not null,
  actual_demand numeric not null,
  recommended_buy numeric not null,
  actual_buy numeric not null,
  expected_stockout boolean not null,
  actual_stockout boolean not null,
  expected_wos numeric not null,
  actual_wos numeric not null,
  expected_excess numeric not null,
  actual_excess numeric not null,
  michael_score jsonb not null,
  oracle_score jsonb not null,
  winning_model text not null check (winning_model in ('MichaelModel','OracleModel','tie')),
  context jsonb not null,
  observed_at timestamptz not null,
  recorded_by text not null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, inventory_decision_id),
  constraint oracle_outcomes_case_org_fk foreign key (planning_case_id, organization_id) references oracle_planning_cases(id, organization_id) on delete restrict,
  constraint oracle_outcomes_decision_case_org_fk foreign key (decision_case_id, organization_id) references decision_cases(id, organization_id) on delete restrict,
  constraint oracle_outcomes_inventory_decision_org_fk foreign key (inventory_decision_id, organization_id) references oracle_inventory_decisions(id, organization_id) on delete restrict
);
create index if not exists oracle_outcomes_context_time_idx on oracle_planning_outcomes (organization_id, observed_at desc, id);

create or replace function reject_oracle_learning_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Oracle planning evidence, overrides, comparisons, and outcomes are append-only';
end;
$$;
drop trigger if exists oracle_planning_evidence_immutable on oracle_planning_evidence;
create trigger oracle_planning_evidence_immutable before update or delete on oracle_planning_evidence for each row execute function reject_oracle_learning_mutation();
drop trigger if exists oracle_forecast_comparisons_immutable on oracle_forecast_comparisons;
create trigger oracle_forecast_comparisons_immutable before update or delete on oracle_forecast_comparisons for each row execute function reject_oracle_learning_mutation();
drop trigger if exists oracle_planner_overrides_immutable on oracle_planner_overrides;
create trigger oracle_planner_overrides_immutable before update or delete on oracle_planner_overrides for each row execute function reject_oracle_learning_mutation();
drop trigger if exists oracle_planning_outcomes_immutable on oracle_planning_outcomes;
create trigger oracle_planning_outcomes_immutable before update or delete on oracle_planning_outcomes for each row execute function reject_oracle_learning_mutation();
