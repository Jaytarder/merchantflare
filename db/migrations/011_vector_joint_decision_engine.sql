-- Vector and Oracle–Vector Joint Decision Engine. Additive and backward compatible.
create table vector_advertising_models (
  id text primary key, organization_id text not null references platform_organizations(id) on delete restrict, name text not null,
  model_kind text not null check (model_kind in ('CHRISTIAN','VECTOR')), version text not null,
  rules jsonb not null default '{}'::jsonb, provenance jsonb not null default '{}'::jsonb,
  created_by text not null, created_at timestamptz not null default now(), unique (id, organization_id), unique (organization_id, name, version)
);
create table vector_christian_reports (
  id text primary key, organization_id text not null references platform_organizations(id) on delete restrict, source_message_id text not null,
  sender text not null, received_at timestamptz not null, subject text not null, fact_hash text not null,
  classification text not null check (classification in ('OBSERVATION','ASSUMPTION','HYPOTHESIS','INTERVENTION','PREDICTION','OUTCOME')),
  fact jsonb not null, provenance jsonb not null, created_at timestamptz not null default now(),
  unique (organization_id, source_message_id, fact_hash)
);
create table vector_product_identities (
  id text primary key, organization_id text not null references platform_organizations(id) on delete restrict, marketplace text not null,
  sku text not null, asin text, brand text, license text, source_entity_kind text not null,
  source_entity_id text not null, created_at timestamptz not null default now(),
  unique (organization_id, source_entity_kind, source_entity_id), unique (id, organization_id)
);
create table vector_advertising_evidence (
  id text primary key, organization_id text not null references platform_organizations(id) on delete restrict, product_identity_id text not null,
  decision_case_id uuid, source_evidence_id text, classification text not null,
  metric text not null, value numeric not null, unit text not null, period_start timestamptz not null,
  period_end timestamptz not null, observed_at timestamptz not null, confidence numeric(5,4) not null check (confidence between 0 and 1),
  provenance jsonb not null, created_at timestamptz not null default now(),
  foreign key (product_identity_id, organization_id) references vector_product_identities(id, organization_id),
  foreign key (decision_case_id, organization_id) references decision_cases(id, organization_id)
);
create table vector_forecasts (
  id text primary key, organization_id text not null references platform_organizations(id) on delete restrict, product_identity_id text not null,
  decision_case_id uuid, model_id text not null,
  prediction jsonb not null, assumptions jsonb not null default '[]'::jsonb, confidence numeric(5,4) not null check (confidence between 0 and 1),
  calculated_at timestamptz not null, created_at timestamptz not null default now(),
  foreign key (product_identity_id, organization_id) references vector_product_identities(id, organization_id),
  foreign key (decision_case_id, organization_id) references decision_cases(id, organization_id),
  foreign key (model_id, organization_id) references vector_advertising_models(id, organization_id)
);
create table vector_interventions (
  id text primary key, organization_id text not null references platform_organizations(id) on delete restrict, product_identity_id text not null,
  decision_case_id uuid, action text not null, current_state jsonb not null,
  proposed_change jsonb not null, expected_effect jsonb not null, status text not null default 'PROPOSED',
  requires_joint_decision boolean not null default true, idempotency_key text not null, approved_by text,
  approved_at timestamptz, created_by text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, idempotency_key), foreign key (product_identity_id, organization_id) references vector_product_identities(id, organization_id),
  foreign key (decision_case_id, organization_id) references decision_cases(id, organization_id)
);
create table joint_decision_cases (
  id text primary key, organization_id text not null references platform_organizations(id) on delete restrict, decision_case_id uuid,
  product_identity_id text not null, oracle_planning_case_id uuid, status text not null default 'DRAFT',
  objective jsonb not null, constraints jsonb not null default '[]'::jsonb, disagreement jsonb not null default '{}'::jsonb,
  final_decision jsonb, approved_by text, approved_at timestamptz, created_by text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (id, organization_id),
  foreign key (product_identity_id, organization_id) references vector_product_identities(id, organization_id),
  foreign key (decision_case_id, organization_id) references decision_cases(id, organization_id),
  foreign key (oracle_planning_case_id, organization_id) references oracle_planning_cases(id, organization_id)
);
create table joint_safe_demand_envelopes (
  id text primary key, organization_id text not null references platform_organizations(id) on delete restrict, joint_case_id text not null,
  current_weekly_demand numeric, maximum_sustainable_weekly_demand numeric, safe_incremental_units numeric,
  safe_advertising_acceleration numeric, minimum_buffer_units numeric, weeks_until_replenishment numeric,
  constraints jsonb not null, assumptions jsonb not null, calculated_at timestamptz not null, created_at timestamptz not null default now(),
  foreign key (joint_case_id, organization_id) references joint_decision_cases(id, organization_id)
);
create table joint_forecasts (
  id text primary key, organization_id text not null references platform_organizations(id) on delete restrict, joint_case_id text not null,
  perspective text not null check (perspective in ('MICHAEL','CHRISTIAN','ORACLE','VECTOR','JOINT','BASELINE')),
  forecast jsonb not null, confidence numeric(5,4) check (confidence between 0 and 1), calculated_at timestamptz not null,
  created_at timestamptz not null default now(), foreign key (joint_case_id, organization_id) references joint_decision_cases(id, organization_id)
);
create table joint_decision_options (
  id text primary key, organization_id text not null references platform_organizations(id) on delete restrict, joint_case_id text not null,
  option_kind text not null, expected_future jsonb not null, confidence numeric(5,4) not null check (confidence between 0 and 1),
  uncertainty numeric(5,4) not null check (uncertainty between 0 and 1), constraints_satisfied boolean not null,
  recommended boolean not null default false, created_at timestamptz not null default now(),
  foreign key (joint_case_id, organization_id) references joint_decision_cases(id, organization_id)
);
create table joint_dependency_events (
  id text primary key, organization_id text not null references platform_organizations(id) on delete restrict, source_domain text not null,
  source_id text not null, target_domain text not null, target_id text not null, event_type text not null,
  invalidates text not null, occurred_at timestamptz not null, created_at timestamptz not null default now()
);
create table joint_causal_edges (
  id text primary key, organization_id text not null references platform_organizations(id) on delete restrict, joint_case_id text,
  from_node text not null, to_node text not null, epistemic_status text not null check (epistemic_status in ('OBSERVED','ASSUMED','INFERRED','QUASI_CAUSAL','EXPERIMENTAL','REPLICATED')),
  evidence_ids jsonb not null default '[]'::jsonb, explanation text not null, created_at timestamptz not null default now(),
  unique (organization_id, joint_case_id, from_node, to_node), foreign key (joint_case_id, organization_id) references joint_decision_cases(id, organization_id)
);
create table joint_outcomes (
  id text primary key, organization_id text not null references platform_organizations(id) on delete restrict, joint_case_id text not null,
  predicted jsonb not null, actual jsonb not null, observed_at timestamptz not null, provenance jsonb not null,
  created_by text not null, created_at timestamptz not null default now(), unique (organization_id, joint_case_id),
  foreign key (joint_case_id, organization_id) references joint_decision_cases(id, organization_id)
);
create table joint_model_performance (
  id text primary key, organization_id text not null references platform_organizations(id) on delete restrict, joint_case_id text not null,
  model_kind text not null check (model_kind in ('CHRISTIAN','MICHAEL','VECTOR','ORACLE','JOINT')),
  scores jsonb not null, evidence_count integer not null check (evidence_count >= 0), calculated_at timestamptz not null,
  created_at timestamptz not null default now(), unique (organization_id, joint_case_id, model_kind),
  foreign key (joint_case_id, organization_id) references joint_decision_cases(id, organization_id)
);
create index vector_evidence_org_product_period_idx on vector_advertising_evidence (organization_id, product_identity_id, period_end desc);
create index vector_forecast_org_product_idx on vector_forecasts (organization_id, product_identity_id, calculated_at desc);
create index vector_intervention_org_status_idx on vector_interventions (organization_id, status, created_at desc);
create index joint_case_org_status_idx on joint_decision_cases (organization_id, status, updated_at desc);
create index joint_dependency_target_idx on joint_dependency_events (organization_id, target_domain, target_id, occurred_at desc);
create index joint_outcome_org_observed_idx on joint_outcomes (organization_id, observed_at desc);
create index joint_performance_org_model_idx on joint_model_performance (organization_id, model_kind, calculated_at desc);

create or replace function prevent_vector_joint_append_update() returns trigger language plpgsql as $$ begin raise exception 'append-only record cannot be changed'; end $$;
create trigger vector_christian_reports_immutable before update or delete on vector_christian_reports for each row execute function prevent_vector_joint_append_update();
create trigger vector_forecasts_immutable before update or delete on vector_forecasts for each row execute function prevent_vector_joint_append_update();
create trigger joint_dependency_events_immutable before update or delete on joint_dependency_events for each row execute function prevent_vector_joint_append_update();
create trigger joint_outcomes_immutable before update or delete on joint_outcomes for each row execute function prevent_vector_joint_append_update();
create trigger joint_model_performance_immutable before update or delete on joint_model_performance for each row execute function prevent_vector_joint_append_update();
