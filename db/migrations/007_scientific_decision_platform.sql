-- Additive Scientific Decision Platform foundation.
-- This migration preserves every existing Mercury, evidence, approval, and
-- Platform Core record. No production table or column is removed or renamed.

create table if not exists decision_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null
    references platform_organizations(id) on delete restrict,
  created_by text not null,
  title text not null,
  problem text not null,
  objective text not null,
  status text not null default 'draft'
    check (status in ('draft', 'investigating', 'proposed', 'approved', 'running', 'measuring', 'closed', 'archived')),
  current_belief_id uuid,
  risk_level text not null default 'medium'
    check (risk_level in ('low', 'medium', 'high', 'critical')),
  reversibility text not null default 'unknown'
    check (reversibility in ('easy', 'moderate', 'difficult', 'irreversible', 'unknown')),
  approval_status text not null default 'not_required'
    check (approval_status in ('not_required', 'pending', 'approved', 'rejected')),
  assumptions jsonb not null default '[]'::jsonb,
  confounders jsonb not null default '[]'::jsonb,
  expected_outcome text,
  mercury_conversation_id text
    references mercury_conversations(id) on delete set null,
  mercury_plan_id text
    references mercury_plans(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (id, organization_id)
);

create index if not exists decision_cases_org_updated_idx
  on decision_cases (organization_id, updated_at desc, id);

create table if not exists decision_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null
    references platform_organizations(id) on delete restrict,
  decision_case_id uuid not null,
  source text not null,
  source_reference text,
  statement text not null,
  observed_at timestamptz not null,
  freshness text not null
    check (freshness in ('current', 'delayed', 'stale', 'unavailable')),
  owner_id text not null,
  confidence numeric(5,4) not null
    check (confidence between 0 and 1),
  evidence_grade text not null
    check (evidence_grade in ('observed', 'correlated', 'controlled', 'quasi_causal', 'experimental', 'replicated')),
  relationships jsonb not null default '[]'::jsonb,
  supporting_references jsonb not null default '[]'::jsonb,
  limitations jsonb not null default '[]'::jsonb,
  mercury_evidence_item_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint decision_evidence_case_org_fk
    foreign key (decision_case_id, organization_id)
    references decision_cases(id, organization_id)
    on delete restrict,
  constraint decision_evidence_mercury_org_fk
    foreign key (mercury_evidence_item_id, organization_id)
    references mercury_evidence_items(id, organization_id)
    on delete restrict
);

create index if not exists decision_evidence_case_observed_idx
  on decision_evidence (organization_id, decision_case_id, observed_at desc);

create table if not exists decision_beliefs (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null
    references platform_organizations(id) on delete restrict,
  decision_case_id uuid not null,
  statement text not null,
  confidence numeric(5,4) not null
    check (confidence between 0 and 1),
  missing_evidence jsonb not null default '[]'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  what_would_change text not null,
  owner_id text not null,
  version integer not null default 1 check (version > 0),
  status text not null default 'active'
    check (status in ('active', 'superseded', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint decision_beliefs_case_org_fk
    foreign key (decision_case_id, organization_id)
    references decision_cases(id, organization_id)
    on delete restrict
);

alter table decision_cases
  drop constraint if exists decision_cases_current_belief_org_fk;

alter table decision_cases
  add constraint decision_cases_current_belief_org_fk
  foreign key (current_belief_id, organization_id)
  references decision_beliefs(id, organization_id)
  on delete restrict;

create index if not exists decision_beliefs_case_idx
  on decision_beliefs (organization_id, decision_case_id, status, version desc);

create table if not exists decision_belief_versions (
  belief_id uuid not null,
  organization_id text not null,
  version integer not null check (version > 0),
  statement text not null,
  confidence numeric(5,4) not null check (confidence between 0 and 1),
  missing_evidence jsonb not null default '[]'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  what_would_change text not null,
  changed_by text not null,
  change_reason text not null,
  created_at timestamptz not null default now(),
  primary key (belief_id, version),
  constraint decision_belief_versions_belief_org_fk
    foreign key (belief_id, organization_id)
    references decision_beliefs(id, organization_id)
    on delete restrict
);

create table if not exists decision_hypotheses (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null
    references platform_organizations(id) on delete restrict,
  decision_case_id uuid not null,
  statement text not null,
  likelihood numeric(5,4) not null check (likelihood between 0 and 1),
  confidence numeric(5,4) not null check (confidence between 0 and 1),
  expected_value numeric,
  estimated_risk text not null
    check (estimated_risk in ('low', 'medium', 'high', 'critical')),
  suggested_experiment text,
  status text not null default 'active'
    check (status in ('active', 'supported', 'weakened', 'rejected', 'inconclusive')),
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint decision_hypotheses_case_org_fk
    foreign key (decision_case_id, organization_id)
    references decision_cases(id, organization_id)
    on delete restrict
);

create index if not exists decision_hypotheses_case_idx
  on decision_hypotheses (organization_id, decision_case_id, created_at);

create table if not exists decision_evidence_links (
  organization_id text not null,
  evidence_id uuid not null,
  entity_type text not null
    check (entity_type in ('belief', 'hypothesis', 'experiment', 'outcome')),
  entity_id uuid not null,
  relationship text not null
    check (relationship in ('supports', 'counters', 'informs', 'confounds')),
  rationale text,
  created_by text not null,
  created_at timestamptz not null default now(),
  primary key (evidence_id, entity_type, entity_id, relationship),
  constraint decision_evidence_links_evidence_org_fk
    foreign key (evidence_id, organization_id)
    references decision_evidence(id, organization_id)
    on delete restrict
);

create index if not exists decision_evidence_links_entity_idx
  on decision_evidence_links (organization_id, entity_type, entity_id);

create table if not exists decision_experiments (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null
    references platform_organizations(id) on delete restrict,
  decision_case_id uuid not null,
  hypothesis_id uuid not null,
  title text not null,
  expected_lift numeric,
  expected_risk text not null
    check (expected_risk in ('low', 'medium', 'high', 'critical')),
  observation_window jsonb not null,
  rollback_plan text not null,
  success_criteria jsonb not null,
  approval_status text not null default 'pending'
    check (approval_status in ('not_required', 'pending', 'approved', 'rejected')),
  approved_by text,
  approved_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'awaiting_approval', 'approved', 'running', 'completed', 'cancelled', 'failed')),
  execution_time timestamptz,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint decision_experiments_case_org_fk
    foreign key (decision_case_id, organization_id)
    references decision_cases(id, organization_id)
    on delete restrict,
  constraint decision_experiments_hypothesis_org_fk
    foreign key (hypothesis_id, organization_id)
    references decision_hypotheses(id, organization_id)
    on delete restrict
);

create table if not exists decision_interventions (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null
    references platform_organizations(id) on delete restrict,
  experiment_id uuid not null,
  description text not null,
  exact_intent jsonb not null,
  reversibility text not null
    check (reversibility in ('easy', 'moderate', 'difficult', 'irreversible')),
  rollback_plan text not null,
  executed_by text,
  executed_at timestamptz,
  status text not null default 'proposed'
    check (status in ('proposed', 'approved', 'executed', 'rolled_back', 'failed')),
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint decision_interventions_experiment_org_fk
    foreign key (experiment_id, organization_id)
    references decision_experiments(id, organization_id)
    on delete restrict
);

create table if not exists decision_outcomes (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null
    references platform_organizations(id) on delete restrict,
  decision_case_id uuid not null,
  experiment_id uuid not null,
  observed_result text not null,
  evidence_grade text not null
    check (evidence_grade in ('observed', 'correlated', 'controlled', 'quasi_causal', 'experimental', 'replicated')),
  measured_impact jsonb not null,
  unexpected_effects jsonb not null default '[]'::jsonb,
  posterior_confidence numeric(5,4) not null check (posterior_confidence between 0 and 1),
  updated_belief_id uuid,
  observed_at timestamptz not null,
  recorded_by text not null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint decision_outcomes_case_org_fk
    foreign key (decision_case_id, organization_id)
    references decision_cases(id, organization_id)
    on delete restrict,
  constraint decision_outcomes_experiment_org_fk
    foreign key (experiment_id, organization_id)
    references decision_experiments(id, organization_id)
    on delete restrict,
  constraint decision_outcomes_belief_org_fk
    foreign key (updated_belief_id, organization_id)
    references decision_beliefs(id, organization_id)
    on delete restrict
);

create table if not exists decision_lessons (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null
    references platform_organizations(id) on delete restrict,
  decision_case_id uuid not null,
  outcome_id uuid not null,
  statement text not null,
  applicability jsonb not null,
  limitations jsonb not null default '[]'::jsonb,
  confidence numeric(5,4) not null check (confidence between 0 and 1),
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint decision_lessons_case_org_fk
    foreign key (decision_case_id, organization_id)
    references decision_cases(id, organization_id)
    on delete restrict,
  constraint decision_lessons_outcome_org_fk
    foreign key (outcome_id, organization_id)
    references decision_outcomes(id, organization_id)
    on delete restrict
);

create index if not exists decision_lessons_org_created_idx
  on decision_lessons (organization_id, created_at desc);

create table if not exists decision_confidence_history (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null
    references platform_organizations(id) on delete restrict,
  decision_case_id uuid not null,
  entity_type text not null check (entity_type in ('belief', 'hypothesis', 'outcome')),
  entity_id uuid not null,
  prior_confidence numeric(5,4) check (prior_confidence between 0 and 1),
  new_confidence numeric(5,4) not null check (new_confidence between 0 and 1),
  reason text not null,
  evidence_ids jsonb not null default '[]'::jsonb,
  changed_by text not null,
  created_at timestamptz not null default now(),
  constraint decision_confidence_history_case_org_fk
    foreign key (decision_case_id, organization_id)
    references decision_cases(id, organization_id)
    on delete restrict
);

create index if not exists decision_confidence_history_entity_idx
  on decision_confidence_history (organization_id, entity_type, entity_id, created_at);

create table if not exists decision_history_events (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null
    references platform_organizations(id) on delete restrict,
  decision_case_id uuid not null,
  actor_id text not null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint decision_history_case_org_fk
    foreign key (decision_case_id, organization_id)
    references decision_cases(id, organization_id)
    on delete restrict
);

create index if not exists decision_history_org_case_idx
  on decision_history_events (organization_id, decision_case_id, occurred_at desc, id);

create or replace function reject_decision_history_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'decision history is append-only';
end;
$$;

drop trigger if exists decision_history_events_immutable
  on decision_history_events;

create trigger decision_history_events_immutable
before update or delete on decision_history_events
for each row execute function reject_decision_history_mutation();
