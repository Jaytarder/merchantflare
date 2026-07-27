alter table mercury_evidence_items
  add column if not exists provider text,
  add column if not exists account_id text,
  add column if not exists marketplace text,
  add column if not exists dataset text,
  add column if not exists evidence_kind text,
  add column if not exists schema_version text,
  add column if not exists normalized_value jsonb,
  add column if not exists provenance jsonb,
  add column if not exists content_hash text,
  add column if not exists expires_at timestamptz;

update mercury_evidence_items as item
set
  provider = coalesce(item.provider, source.provider, 'internal'),
  dataset = coalesce(item.dataset, 'executive'),
  evidence_kind = coalesce(item.evidence_kind, 'legacy.summary'),
  schema_version = coalesce(item.schema_version, 'legacy.v1'),
  normalized_value = coalesce(
    item.normalized_value,
    jsonb_build_object(
      'type', 'attributes',
      'attributes', jsonb_build_object()
    )
  ),
  provenance = coalesce(
    item.provenance,
    jsonb_build_object(
      'provider', coalesce(source.provider, 'internal'),
      'sourceId', item.source_id,
      'sourceRecordReference', coalesce(item.source_record_reference, item.id),
      'observedAt', item.observed_at,
      'ingestedAt', item.ingested_at,
      'pipeline', 'legacy',
      'pipelineVersion', 'legacy.v1',
      'transformations', jsonb_build_array(),
      'contentHash', md5(item.id)
    )
  ),
  content_hash = coalesce(item.content_hash, md5(item.id)),
  expires_at = coalesce(item.expires_at, item.ingested_at)
from mercury_evidence_sources as source
where source.id = item.source_id;

alter table mercury_evidence_items
  alter column provider set not null,
  alter column dataset set not null,
  alter column evidence_kind set not null,
  alter column schema_version set not null,
  alter column normalized_value set not null,
  alter column provenance set not null,
  alter column content_hash set not null,
  alter column expires_at set not null,
  drop constraint if exists mercury_evidence_items_dataset_check,
  add constraint mercury_evidence_items_dataset_check
    check (
      dataset in (
        'catalog',
        'advertising',
        'demand',
        'inventory',
        'compliance',
        'creative',
        'executive'
      )
    );

create index if not exists mercury_evidence_items_query_idx
  on mercury_evidence_items (
    organization_id,
    dataset,
    marketplace,
    account_id,
    observed_at desc
  );

create index if not exists mercury_evidence_items_expiry_idx
  on mercury_evidence_items (organization_id, expires_at);

create table if not exists commerce_evidence_sync_runs (
  id text primary key,
  organization_id text not null,
  source_id text not null,
  provider text not null,
  dataset text not null
    check (
      dataset in (
        'catalog',
        'advertising',
        'demand',
        'inventory',
        'compliance',
        'creative',
        'executive'
      )
    ),
  request_key text not null,
  status text not null
    check (status in ('running', 'succeeded', 'failed', 'cancelled')),
  records_processed integer not null default 0,
  pages_processed integer not null default 0,
  request_references jsonb not null default '[]'::jsonb,
  error_code text,
  error_message text,
  started_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commerce_evidence_sync_runs_source_org_fk
    foreign key (source_id, organization_id)
    references mercury_evidence_sources(id, organization_id)
    on delete restrict,
  unique (organization_id, request_key)
);

create index if not exists commerce_evidence_sync_runs_source_idx
  on commerce_evidence_sync_runs (
    organization_id,
    source_id,
    dataset,
    started_at desc
  );

create table if not exists commerce_evidence_sync_cursors (
  organization_id text not null,
  source_id text not null,
  dataset text not null
    check (
      dataset in (
        'catalog',
        'advertising',
        'demand',
        'inventory',
        'compliance',
        'creative',
        'executive'
      )
    ),
  cursor_value text,
  updated_at timestamptz not null default now(),
  primary key (organization_id, source_id, dataset),
  constraint commerce_evidence_sync_cursors_source_org_fk
    foreign key (source_id, organization_id)
    references mercury_evidence_sources(id, organization_id)
    on delete cascade
);

create table if not exists commerce_evidence_cache (
  organization_id text not null,
  cache_key text not null,
  normalized_payload jsonb not null,
  stored_at timestamptz not null,
  expires_at timestamptz not null,
  stale_until timestamptz not null,
  primary key (organization_id, cache_key),
  check (expires_at >= stored_at),
  check (stale_until >= expires_at)
);

create index if not exists commerce_evidence_cache_expiry_idx
  on commerce_evidence_cache (organization_id, stale_until);
