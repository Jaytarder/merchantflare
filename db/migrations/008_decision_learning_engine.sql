-- Additive learning, calibration, execution, and knowledge-reuse records.
-- Migration 007 remains immutable. All new records are organization scoped.

create table if not exists decision_predictions (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references platform_organizations(id) on delete restrict,
  decision_case_id uuid not null,
  belief_id uuid not null,
  experiment_id uuid not null,
  confidence numeric(5,4) not null check (confidence between 0 and 1),
  predicted_at timestamptz not null,
  success_criteria jsonb not null,
  succeeded boolean,
  posterior_confidence numeric(5,4) check (posterior_confidence between 0 and 1),
  resolved_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, experiment_id),
  constraint decision_predictions_case_org_fk foreign key (decision_case_id, organization_id)
    references decision_cases(id, organization_id) on delete restrict,
  constraint decision_predictions_belief_org_fk foreign key (belief_id, organization_id)
    references decision_beliefs(id, organization_id) on delete restrict,
  constraint decision_predictions_experiment_org_fk foreign key (experiment_id, organization_id)
    references decision_experiments(id, organization_id) on delete restrict,
  constraint decision_predictions_resolution_check check (
    (succeeded is null and posterior_confidence is null and resolved_at is null) or
    (succeeded is not null and posterior_confidence is not null and resolved_at is not null)
  )
);

create index if not exists decision_predictions_org_time_idx
  on decision_predictions (organization_id, predicted_at desc, id);

create table if not exists decision_executions (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references platform_organizations(id) on delete restrict,
  decision_case_id uuid not null,
  experiment_id uuid not null,
  intervention_id uuid not null,
  idempotency_key text not null,
  status text not null check (status in ('started', 'completed', 'failed', 'rolled_back')),
  execution_mode text not null check (execution_mode in ('manual', 'provider')),
  result jsonb not null default '{}'::jsonb,
  rollback_result jsonb,
  executed_by text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  rolled_back_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, idempotency_key),
  constraint decision_executions_case_org_fk foreign key (decision_case_id, organization_id)
    references decision_cases(id, organization_id) on delete restrict,
  constraint decision_executions_experiment_org_fk foreign key (experiment_id, organization_id)
    references decision_experiments(id, organization_id) on delete restrict,
  constraint decision_executions_intervention_org_fk foreign key (intervention_id, organization_id)
    references decision_interventions(id, organization_id) on delete restrict
);

create index if not exists decision_executions_org_case_idx
  on decision_executions (organization_id, decision_case_id, started_at desc);

create table if not exists decision_lesson_reuse (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references platform_organizations(id) on delete restrict,
  lesson_id uuid not null,
  source_decision_case_id uuid not null,
  target_decision_case_id uuid not null,
  rationale text not null,
  reused_by text not null,
  reused_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, lesson_id, target_decision_case_id),
  constraint decision_lesson_reuse_lesson_org_fk foreign key (lesson_id, organization_id)
    references decision_lessons(id, organization_id) on delete restrict,
  constraint decision_lesson_reuse_source_org_fk foreign key (source_decision_case_id, organization_id)
    references decision_cases(id, organization_id) on delete restrict,
  constraint decision_lesson_reuse_target_org_fk foreign key (target_decision_case_id, organization_id)
    references decision_cases(id, organization_id) on delete restrict
);

create index if not exists decision_lesson_reuse_org_time_idx
  on decision_lesson_reuse (organization_id, reused_at desc);

create or replace function reject_resolved_prediction_mutation()
returns trigger language plpgsql as $$
begin
  if old.resolved_at is not null then
    raise exception 'resolved predictions are immutable';
  end if;
  if new.confidence <> old.confidence or new.predicted_at <> old.predicted_at or
     new.belief_id <> old.belief_id or new.experiment_id <> old.experiment_id or
     new.success_criteria <> old.success_criteria then
    raise exception 'prediction inputs are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists decision_predictions_immutable on decision_predictions;
create trigger decision_predictions_immutable before update on decision_predictions
for each row execute function reject_resolved_prediction_mutation();

create or replace function reject_decision_prediction_delete()
returns trigger language plpgsql as $$
begin
  raise exception 'decision predictions are append-only';
end;
$$;

drop trigger if exists decision_predictions_no_delete on decision_predictions;
create trigger decision_predictions_no_delete before delete on decision_predictions
for each row execute function reject_decision_prediction_delete();
