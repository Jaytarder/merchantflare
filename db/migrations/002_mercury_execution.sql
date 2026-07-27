alter table mercury_tasks
  add column if not exists execution_status text not null default 'pending'
    check (execution_status in ('pending', 'running', 'succeeded', 'failed', 'blocked')),
  add column if not exists attempts integer not null default 0,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists output jsonb,
  add column if not exists error text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists mercury_tasks_plan_status_idx
  on mercury_tasks (plan_id, execution_status);

alter table mercury_events
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists commerce_integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('amazon-sp-api', 'amazon-ads')),
  marketplace text not null default 'amazon-us',
  status text not null default 'disconnected'
    check (status in ('connected', 'attention', 'disconnected')),
  display_name text not null,
  credentials_ref text,
  configuration jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, marketplace)
);
