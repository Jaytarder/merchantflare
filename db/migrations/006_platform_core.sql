create table if not exists platform_organizations (
  id text primary key,
  slug text not null unique,
  name text not null,
  status text not null default 'active'
    check (status in ('active', 'suspended')),
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

with organization_ids as (
  select organization_id from mercury_conversations
  union
  select organization_id from mercury_plans
  union
  select organization_id from mercury_request_keys
  union
  select organization_id from mercury_evidence_sources
  union
  select organization_id from mercury_evidence_items
  union
  select organization_id from mercury_approvals
  union
  select organization_id from commerce_evidence_sync_runs
  union
  select organization_id from commerce_evidence_sync_cursors
  union
  select organization_id from commerce_evidence_cache
)
insert into platform_organizations (
  id,
  slug,
  name,
  status,
  created_by
)
select
  organization_id,
  left(
    trim(both '-' from regexp_replace(lower(organization_id), '[^a-z0-9]+', '-', 'g')),
    48
  ) || '-' || left(md5(organization_id), 8),
  organization_id,
  'active',
  'migration:006'
from organization_ids
where organization_id is not null
on conflict (id) do nothing;

insert into platform_organizations (
  id,
  slug,
  name,
  status,
  created_by
) values (
  'org_legacy',
  'legacy-' || left(md5('org_legacy'), 8),
  'Legacy organization',
  'active',
  'migration:006'
)
on conflict (id) do nothing;

create table if not exists platform_users (
  id text primary key,
  email text not null,
  display_name text not null,
  identity_provider text not null
    check (identity_provider in ('legacy-cookie', 'cognito')),
  identity_subject text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (identity_provider, identity_subject)
);

create unique index if not exists platform_users_email_idx
  on platform_users (lower(email));

create table if not exists platform_organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null
    references platform_organizations(id) on delete cascade,
  user_id text not null
    references platform_users(id) on delete cascade,
  role text not null
    check (role in ('owner', 'admin', 'manager', 'analyst', 'viewer')),
  status text not null default 'active'
    check (status in ('active', 'suspended')),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists platform_memberships_user_idx
  on platform_organization_memberships (user_id, status);

create table if not exists platform_organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null
    references platform_organizations(id) on delete cascade,
  email text not null,
  role text not null
    check (role in ('admin', 'manager', 'analyst', 'viewer')),
  token_hash text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by text not null
    references platform_users(id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists platform_invitations_pending_email_idx
  on platform_organization_invitations (organization_id, lower(email))
  where status = 'pending';

create index if not exists platform_invitations_expiry_idx
  on platform_organization_invitations (status, expires_at);

create table if not exists platform_organization_settings (
  organization_id text primary key
    references platform_organizations(id) on delete cascade,
  timezone text not null default 'UTC',
  currency text not null default 'USD'
    check (currency ~ '^[A-Z]{3}$'),
  locale text not null default 'en-US',
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into platform_organization_settings (organization_id)
select id from platform_organizations
on conflict (organization_id) do nothing;

create table if not exists platform_audit_events (
  id uuid primary key,
  organization_id text not null
    references platform_organizations(id) on delete restrict,
  actor_type text not null
    check (actor_type in ('user', 'service', 'system')),
  actor_id text not null,
  actor_email text,
  action text not null,
  resource_type text not null,
  resource_id text not null,
  correlation_id text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists platform_audit_org_occurred_idx
  on platform_audit_events (organization_id, occurred_at desc, id desc);

create index if not exists platform_audit_resource_idx
  on platform_audit_events (
    organization_id,
    resource_type,
    resource_id,
    occurred_at desc
  );

create or replace function reject_platform_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'platform_audit_events is append-only';
end;
$$;

drop trigger if exists platform_audit_events_immutable
  on platform_audit_events;

create trigger platform_audit_events_immutable
before update or delete on platform_audit_events
for each row execute function reject_platform_audit_mutation();

create table if not exists platform_notifications (
  id uuid primary key,
  organization_id text not null
    references platform_organizations(id) on delete cascade,
  recipient_user_id text
    references platform_users(id) on delete cascade,
  recipient_scope text generated always as (
    coalesce(recipient_user_id, '*')
  ) stored,
  category text not null
    check (
      category in (
        'approval',
        'integration',
        'evidence',
        'billing',
        'security',
        'system'
      )
    ),
  severity text not null
    check (severity in ('info', 'success', 'warning', 'critical')),
  title text not null,
  body text not null,
  action_href text,
  source_type text not null,
  source_id text not null,
  deduplication_key text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create unique index if not exists platform_notifications_dedup_idx
  on platform_notifications (
    organization_id,
    recipient_scope,
    deduplication_key
  )
  where deduplication_key is not null;

create index if not exists platform_notifications_inbox_idx
  on platform_notifications (
    organization_id,
    recipient_user_id,
    read_at,
    created_at desc
  );

create table if not exists platform_notification_receipts (
  notification_id uuid not null
    references platform_notifications(id) on delete cascade,
  user_id text not null
    references platform_users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create index if not exists platform_notification_receipts_user_idx
  on platform_notification_receipts (user_id, read_at desc);

create table if not exists platform_feature_flags (
  key text primary key,
  description text not null,
  default_value jsonb not null,
  enabled boolean not null default false,
  rollout_percentage integer not null default 0
    check (rollout_percentage between 0 and 100),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists platform_feature_flag_overrides (
  flag_key text not null
    references platform_feature_flags(key) on delete cascade,
  scope text not null
    check (scope in ('organization', 'user')),
  scope_id text not null,
  value jsonb not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (flag_key, scope, scope_id)
);

create table if not exists platform_subscription_plans (
  plan_key text not null,
  version integer not null check (version > 0),
  name text not null,
  active boolean not null default false,
  stripe_product_id text,
  stripe_price_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (plan_key, version)
);

create table if not exists platform_plan_entitlements (
  plan_key text not null,
  plan_version integer not null,
  entitlement_key text not null,
  entitlement_value jsonb not null,
  created_at timestamptz not null default now(),
  primary key (plan_key, plan_version, entitlement_key),
  foreign key (plan_key, plan_version)
    references platform_subscription_plans(plan_key, version)
    on delete cascade
);

create table if not exists platform_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null
    references platform_organizations(id) on delete cascade,
  plan_key text not null,
  plan_version integer not null,
  status text not null
    check (status in ('trialing', 'active', 'past_due', 'paused', 'cancelled')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (plan_key, plan_version)
    references platform_subscription_plans(plan_key, version)
    on delete restrict
);

create unique index if not exists platform_subscriptions_active_org_idx
  on platform_subscriptions (organization_id)
  where status in ('trialing', 'active', 'past_due', 'paused');

create unique index if not exists platform_subscriptions_customer_idx
  on platform_subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists platform_subscriptions_stripe_idx
  on platform_subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

create table if not exists platform_entitlement_overrides (
  organization_id text not null
    references platform_organizations(id) on delete cascade,
  entitlement_key text not null,
  entitlement_value jsonb not null,
  reason text not null,
  expires_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, entitlement_key)
);

create or replace view platform_effective_entitlements as
select
  subscription.organization_id,
  subscription.id as subscription_id,
  entitlement.entitlement_key,
  entitlement.entitlement_value,
  'plan'::text as source
from platform_subscriptions subscription
join platform_plan_entitlements entitlement
  on entitlement.plan_key = subscription.plan_key
  and entitlement.plan_version = subscription.plan_version
union all
select
  subscription.organization_id,
  subscription.id as subscription_id,
  entitlement.entitlement_key,
  entitlement.entitlement_value,
  'organization_override'::text as source
from platform_subscriptions subscription
join platform_entitlement_overrides entitlement
  on entitlement.organization_id = subscription.organization_id
where entitlement.expires_at is null or entitlement.expires_at > now();

alter table commerce_integrations
  add column if not exists organization_id text;

update commerce_integrations
set organization_id = 'org_legacy'
where organization_id is null;

alter table commerce_integrations
  alter column organization_id set not null,
  drop constraint if exists commerce_integrations_provider_marketplace_key,
  drop constraint if exists commerce_integrations_organization_fk,
  add constraint commerce_integrations_organization_fk
    foreign key (organization_id)
    references platform_organizations(id)
    on delete cascade;

create unique index if not exists commerce_integrations_org_provider_marketplace_idx
  on commerce_integrations (organization_id, provider, marketplace);

create unique index if not exists commerce_integrations_id_org_idx
  on commerce_integrations (id, organization_id);

update mercury_evidence_sources source
set connection_id = null
from commerce_integrations integration
where source.connection_id = integration.id
  and source.organization_id <> integration.organization_id;

alter table mercury_evidence_sources
  drop constraint if exists mercury_evidence_sources_connection_id_fkey,
  drop constraint if exists mercury_evidence_sources_connection_org_fk,
  add constraint mercury_evidence_sources_connection_org_fk
    foreign key (connection_id, organization_id)
    references commerce_integrations(id, organization_id)
    on delete restrict;

alter table mercury_conversations
  drop constraint if exists mercury_conversations_organization_fk,
  add constraint mercury_conversations_organization_fk
    foreign key (organization_id)
    references platform_organizations(id)
    on delete restrict;

alter table mercury_messages
  drop constraint if exists mercury_messages_organization_fk,
  add constraint mercury_messages_organization_fk
    foreign key (organization_id)
    references platform_organizations(id)
    on delete restrict;

alter table mercury_plans
  drop constraint if exists mercury_plans_organization_fk,
  add constraint mercury_plans_organization_fk
    foreign key (organization_id)
    references platform_organizations(id)
    on delete restrict;

alter table mercury_request_keys
  drop constraint if exists mercury_request_keys_organization_fk,
  add constraint mercury_request_keys_organization_fk
    foreign key (organization_id)
    references platform_organizations(id)
    on delete cascade;

alter table mercury_evidence_sources
  drop constraint if exists mercury_evidence_sources_organization_fk,
  add constraint mercury_evidence_sources_organization_fk
    foreign key (organization_id)
    references platform_organizations(id)
    on delete restrict;

alter table mercury_evidence_items
  drop constraint if exists mercury_evidence_items_organization_fk,
  add constraint mercury_evidence_items_organization_fk
    foreign key (organization_id)
    references platform_organizations(id)
    on delete restrict;

alter table mercury_approvals
  drop constraint if exists mercury_approvals_organization_fk,
  add constraint mercury_approvals_organization_fk
    foreign key (organization_id)
    references platform_organizations(id)
    on delete restrict;

alter table commerce_evidence_sync_runs
  drop constraint if exists commerce_evidence_sync_runs_organization_fk,
  add constraint commerce_evidence_sync_runs_organization_fk
    foreign key (organization_id)
    references platform_organizations(id)
    on delete restrict;

alter table commerce_evidence_sync_cursors
  drop constraint if exists commerce_evidence_sync_cursors_organization_fk,
  add constraint commerce_evidence_sync_cursors_organization_fk
    foreign key (organization_id)
    references platform_organizations(id)
    on delete cascade;

alter table commerce_evidence_cache
  drop constraint if exists commerce_evidence_cache_organization_fk,
  add constraint commerce_evidence_cache_organization_fk
    foreign key (organization_id)
    references platform_organizations(id)
    on delete cascade;
