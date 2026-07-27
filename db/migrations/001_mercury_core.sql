create extension if not exists pgcrypto;

create table if not exists mercury_plans (
  id text primary key,
  objective text not null,
  summary text not null,
  status text not null check (status in ('ready', 'awaiting_approval', 'running', 'completed', 'failed')),
  confidence numeric(5,4) not null check (confidence >= 0 and confidence <= 1),
  requires_approval boolean not null default false,
  approval_reasons jsonb not null default '[]'::jsonb,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mercury_plans_created_at_idx
  on mercury_plans (created_at desc);

create table if not exists mercury_tasks (
  id text primary key,
  plan_id text not null references mercury_plans(id) on delete cascade,
  worker text not null,
  capability text not null,
  title text not null,
  description text not null,
  priority text not null,
  route_status text not null,
  requires_approval boolean not null default false,
  dependencies jsonb not null default '[]'::jsonb,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists mercury_tasks_plan_id_idx
  on mercury_tasks (plan_id);

create table if not exists mercury_events (
  id text primary key,
  plan_id text not null references mercury_plans(id) on delete cascade,
  task_id text,
  event_type text not null,
  message text not null,
  created_at timestamptz not null
);

create index if not exists mercury_events_plan_id_created_at_idx
  on mercury_events (plan_id, created_at);

create table if not exists mercury_approvals (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null references mercury_plans(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_by text,
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists mercury_approvals_pending_plan_idx
  on mercury_approvals (plan_id)
  where status = 'pending';
