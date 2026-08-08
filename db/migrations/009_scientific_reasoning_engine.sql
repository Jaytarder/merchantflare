-- Additive Scientific Reasoning Engine.
-- Graph edges and reasoning snapshots are immutable, organization-scoped
-- explanations. Existing Decision Platform and Mercury contracts are unchanged.

create table if not exists decision_belief_graph_edges (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references platform_organizations(id) on delete restrict,
  decision_case_id uuid not null,
  source_type text not null check (source_type in ('belief','evidence','hypothesis','experiment','outcome','lesson')),
  source_id uuid not null,
  target_type text not null check (target_type in ('belief','evidence','hypothesis','experiment','outcome','lesson')),
  target_id uuid not null,
  relationship text not null check (relationship in ('supports','contradicts','depends_on','tests','produced','revises','informs','reuses')),
  rationale text not null,
  weight numeric(5,4) not null default 1 check (weight between 0 and 1),
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, source_type, source_id, target_type, target_id, relationship),
  constraint decision_belief_graph_case_org_fk foreign key (decision_case_id, organization_id)
    references decision_cases(id, organization_id) on delete restrict,
  constraint decision_belief_graph_no_self_edge check (source_type <> target_type or source_id <> target_id)
);

create index if not exists decision_belief_graph_case_idx
  on decision_belief_graph_edges (organization_id, decision_case_id, created_at, id);

create table if not exists decision_reasoning_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references platform_organizations(id) on delete restrict,
  decision_case_id uuid not null,
  belief_id uuid,
  engine_version text not null,
  confidence numeric(5,4) not null check (confidence between 0 and 1),
  uncertainty numeric(5,4) not null check (uncertainty between 0 and 1),
  evidence_coverage numeric(5,4) not null check (evidence_coverage between 0 and 1),
  evidence_freshness numeric(5,4) not null check (evidence_freshness between 0 and 1),
  knowledge_completeness numeric(5,4) not null check (knowledge_completeness between 0 and 1),
  contradiction_score numeric(5,4) not null check (contradiction_score between 0 and 1),
  experiment_priority numeric(5,4) not null check (experiment_priority between 0 and 1),
  explanation jsonb not null,
  calculated_by text not null,
  calculated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint decision_reasoning_case_org_fk foreign key (decision_case_id, organization_id)
    references decision_cases(id, organization_id) on delete restrict,
  constraint decision_reasoning_belief_org_fk foreign key (belief_id, organization_id)
    references decision_beliefs(id, organization_id) on delete restrict
);

create index if not exists decision_reasoning_case_time_idx
  on decision_reasoning_snapshots (organization_id, decision_case_id, calculated_at desc, id);

create or replace function reject_reasoning_record_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'scientific reasoning records are append-only';
end;
$$;

drop trigger if exists decision_belief_graph_immutable on decision_belief_graph_edges;
create trigger decision_belief_graph_immutable before update or delete on decision_belief_graph_edges
for each row execute function reject_reasoning_record_mutation();

drop trigger if exists decision_reasoning_snapshots_immutable on decision_reasoning_snapshots;
create trigger decision_reasoning_snapshots_immutable before update or delete on decision_reasoning_snapshots
for each row execute function reject_reasoning_record_mutation();
