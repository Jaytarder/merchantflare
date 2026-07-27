create table if not exists mercury_conversations (
  id text primary key,
  organization_id text not null,
  created_by text not null,
  title text not null,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mercury_conversations_org_updated_idx
  on mercury_conversations (organization_id, updated_at desc);

create table if not exists mercury_messages (
  id text primary key,
  conversation_id text not null
    references mercury_conversations(id) on delete cascade,
  organization_id text not null,
  author_type text not null
    check (author_type in ('user', 'mercury', 'system')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  sequence_number bigint not null,
  created_at timestamptz not null default now()
);

alter table mercury_messages
  add column if not exists sequence_number bigint;

with ordered_messages as (
  select
    id,
    row_number() over (
      partition by conversation_id
      order by created_at asc, id asc
    ) as sequence_number
  from mercury_messages
  where sequence_number is null
)
update mercury_messages as message
set sequence_number = ordered_messages.sequence_number
from ordered_messages
where message.id = ordered_messages.id;

alter table mercury_messages
  alter column sequence_number set not null;

create unique index if not exists mercury_messages_conversation_sequence_idx
  on mercury_messages (conversation_id, sequence_number);

alter table mercury_plans
  add column if not exists organization_id text,
  add column if not exists conversation_id text
    references mercury_conversations(id) on delete set null,
  add column if not exists source_message_id text
    references mercury_messages(id) on delete set null,
  add column if not exists response_message_id text
    references mercury_messages(id) on delete set null;

update mercury_plans
set organization_id = 'org_legacy'
where organization_id is null;

alter table mercury_plans
  alter column organization_id set not null;

create index if not exists mercury_plans_org_created_idx
  on mercury_plans (organization_id, created_at desc);

create index if not exists mercury_plans_conversation_idx
  on mercury_plans (conversation_id, created_at asc);

alter table mercury_messages
  add column if not exists plan_id text
    references mercury_plans(id) on delete set null;
