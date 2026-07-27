alter table mercury_plans
  add column if not exists root_plan_id text,
  add column if not exists supersedes_plan_id text,
  add column if not exists version integer,
  add column if not exists superseded_at timestamptz,
  add column if not exists evidence_status text not null default 'unavailable',
  add column if not exists evidence_limitation text not null default
    'No live commerce evidence is connected to this plan. Routing is based only on the submitted objective and configured capability rules.';

update mercury_plans
set
  root_plan_id = coalesce(root_plan_id, id),
  version = coalesce(version, 1);

alter table mercury_plans
  alter column root_plan_id set not null,
  alter column version set not null,
  alter column version set default 1;

alter table mercury_plans
  drop constraint if exists mercury_plans_status_check,
  add constraint mercury_plans_status_check
    check (
      status in (
        'ready',
        'awaiting_approval',
        'running',
        'completed',
        'failed',
        'rejected',
        'superseded'
      )
    ),
  drop constraint if exists mercury_plans_evidence_status_check,
  add constraint mercury_plans_evidence_status_check
    check (evidence_status in ('available', 'partial', 'unavailable'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'mercury_plans_root_plan_fk'
  ) then
    alter table mercury_plans
      add constraint mercury_plans_root_plan_fk
      foreign key (root_plan_id)
      references mercury_plans(id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'mercury_plans_supersedes_plan_fk'
  ) then
    alter table mercury_plans
      add constraint mercury_plans_supersedes_plan_fk
      foreign key (supersedes_plan_id)
      references mercury_plans(id);
  end if;
end
$$;

create unique index if not exists mercury_plans_root_version_idx
  on mercury_plans (root_plan_id, version);

create unique index if not exists mercury_plans_supersedes_idx
  on mercury_plans (supersedes_plan_id)
  where supersedes_plan_id is not null;

create unique index if not exists mercury_plans_id_org_idx
  on mercury_plans (id, organization_id);

alter table mercury_messages
  add column if not exists request_key text;

create unique index if not exists mercury_messages_request_key_idx
  on mercury_messages (organization_id, conversation_id, request_key)
  where request_key is not null;

create table if not exists mercury_request_keys (
  organization_id text not null,
  request_key text not null,
  operation text not null,
  resource_id text not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, request_key)
);

create index if not exists mercury_request_keys_created_idx
  on mercury_request_keys (created_at desc);

create table if not exists mercury_evidence_sources (
  id text primary key,
  organization_id text not null,
  connection_id uuid
    references commerce_integrations(id) on delete set null,
  source_type text not null,
  display_name text not null,
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mercury_evidence_sources_org_idx
  on mercury_evidence_sources (organization_id, created_at desc);

create unique index if not exists mercury_evidence_sources_id_org_idx
  on mercury_evidence_sources (id, organization_id);

create table if not exists mercury_evidence_items (
  id text primary key,
  organization_id text not null,
  source_id text not null,
  source_record_reference text,
  title text not null,
  summary text not null,
  observed_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  date_range_start timestamptz,
  date_range_end timestamptz,
  freshness text not null
    check (freshness in ('current', 'delayed', 'stale', 'unavailable')),
  limitations jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint mercury_evidence_items_source_org_fk
    foreign key (source_id, organization_id)
    references mercury_evidence_sources(id, organization_id)
    on delete restrict,
  constraint mercury_evidence_items_date_range_check
    check (date_range_end is null or date_range_start is null or date_range_end >= date_range_start)
);

create index if not exists mercury_evidence_items_org_observed_idx
  on mercury_evidence_items (organization_id, observed_at desc);

create unique index if not exists mercury_evidence_items_id_org_idx
  on mercury_evidence_items (id, organization_id);

create table if not exists mercury_plan_evidence (
  organization_id text not null,
  plan_id text not null,
  evidence_item_id text not null,
  usage_type text not null
    check (usage_type in ('input', 'support', 'limitation')),
  created_at timestamptz not null default now(),
  primary key (plan_id, evidence_item_id, usage_type),
  constraint mercury_plan_evidence_plan_org_fk
    foreign key (plan_id, organization_id)
    references mercury_plans(id, organization_id)
    on delete cascade,
  constraint mercury_plan_evidence_item_org_fk
    foreign key (evidence_item_id, organization_id)
    references mercury_evidence_items(id, organization_id)
    on delete restrict
);

alter table mercury_approvals
  add column if not exists organization_id text,
  add column if not exists plan_version integer,
  add column if not exists policy_version text,
  add column if not exists proposal_snapshot jsonb,
  add column if not exists decision_key text;

update mercury_approvals as approval
set
  organization_id = plan.organization_id,
  plan_version = coalesce(plan.version, 1),
  policy_version = coalesce(approval.policy_version, '2026-07-27.v1'),
  proposal_snapshot = coalesce(approval.proposal_snapshot, plan.payload)
from mercury_plans as plan
where plan.id = approval.plan_id;

alter table mercury_approvals
  alter column organization_id set not null,
  alter column plan_version set not null,
  alter column policy_version set not null,
  alter column proposal_snapshot set not null,
  drop constraint if exists mercury_approvals_status_check,
  add constraint mercury_approvals_status_check
    check (status in ('pending', 'approved', 'rejected', 'superseded'));

create unique index if not exists mercury_approvals_org_decision_key_idx
  on mercury_approvals (organization_id, decision_key)
  where decision_key is not null;
