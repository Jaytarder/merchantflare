import type postgres from "postgres";
import type { JSONValue } from "postgres";
import type { EvidenceCache, EvidenceCacheEntry, EvidenceCacheResult } from "./cache";
import {
  classifyEvidenceFreshness,
  freshnessPolicyFor,
} from "./freshness";
import type {
  EvidenceDateRange,
  EvidenceFreshness,
  EvidenceProvenance,
  EvidenceQuery,
  EvidenceValue,
  NormalizedEvidenceRecord,
} from "./types";
import type {
  EvidenceSyncRun,
  EvidenceSyncStore,
} from "./sync";
import type { EvidenceReader } from "./query";

type EvidenceSql = postgres.Sql | postgres.TransactionSql;

type SyncRunRow = {
  id: string;
  organization_id: string;
  source_id: string;
  provider: string;
  dataset: EvidenceSyncRun["dataset"];
  request_key: string;
  status: EvidenceSyncRun["status"];
  started_at: Date;
  completed_at: Date | null;
  records_processed: number;
  pages_processed: number;
  error_code: string | null;
  error_message: string | null;
};

function mapSyncRun(row: SyncRunRow): EvidenceSyncRun {
  return {
    id: row.id,
    organizationId: row.organization_id,
    sourceId: row.source_id,
    provider: row.provider,
    dataset: row.dataset,
    requestKey: row.request_key,
    status: row.status,
    startedAt: row.started_at.toISOString(),
    completedAt: row.completed_at?.toISOString(),
    recordsProcessed: row.records_processed,
    pagesProcessed: row.pages_processed,
    errorCode: row.error_code ?? undefined,
    errorMessage: row.error_message ?? undefined,
  };
}

export class PostgresEvidenceSyncStore implements EvidenceSyncStore {
  constructor(private readonly sql: postgres.Sql) {}

  async beginRun(run: EvidenceSyncRun) {
    const inserted = await this.sql<Array<SyncRunRow>>`
      insert into commerce_evidence_sync_runs (
        id,
        organization_id,
        source_id,
        provider,
        dataset,
        request_key,
        status,
        started_at
      ) values (
        ${run.id},
        ${run.organizationId},
        ${run.sourceId},
        ${run.provider},
        ${run.dataset},
        ${run.requestKey},
        ${run.status},
        ${run.startedAt}
      )
      on conflict (organization_id, request_key) do nothing
      returning *
    `;
    if (inserted[0]) {
      return { accepted: true, run: mapSyncRun(inserted[0]) };
    }
    const existing = await this.sql<Array<SyncRunRow>>`
      select *
      from commerce_evidence_sync_runs
      where organization_id = ${run.organizationId}
        and request_key = ${run.requestKey}
      limit 1
    `;
    if (!existing[0]) {
      throw new Error("Evidence synchronization idempotency state was lost.");
    }
    return { accepted: false, run: mapSyncRun(existing[0]) };
  }

  async getCursor(run: EvidenceSyncRun) {
    const rows = await this.sql<Array<{ cursor_value: string | null }>>`
      select cursor_value
      from commerce_evidence_sync_cursors
      where organization_id = ${run.organizationId}
        and source_id = ${run.sourceId}
        and dataset = ${run.dataset}
      limit 1
    `;
    return rows[0]?.cursor_value ?? undefined;
  }

  async savePage(input: {
    run: EvidenceSyncRun;
    records: NormalizedEvidenceRecord[];
    nextCursor?: string;
    providerRequestReference?: string;
  }) {
    const requestReferences = input.providerRequestReference
      ? [input.providerRequestReference]
      : [];
    await this.sql.begin(async (transaction) => {
      for (const record of input.records) {
        await persistNormalizedEvidence(transaction, record);
      }
      await transaction`
        insert into commerce_evidence_sync_cursors (
          organization_id,
          source_id,
          dataset,
          cursor_value,
          updated_at
        ) values (
          ${input.run.organizationId},
          ${input.run.sourceId},
          ${input.run.dataset},
          ${input.nextCursor ?? null},
          now()
        )
        on conflict (organization_id, source_id, dataset) do update set
          cursor_value = excluded.cursor_value,
          updated_at = excluded.updated_at
      `;
      await transaction`
        update commerce_evidence_sync_runs
        set
          records_processed = records_processed + ${input.records.length},
          pages_processed = pages_processed + 1,
          request_references = case
            when ${input.providerRequestReference ?? null}::text is null
              then request_references
            else request_references || ${transaction.json(requestReferences)}
          end,
          updated_at = now()
        where id = ${input.run.id}
          and organization_id = ${input.run.organizationId}
          and status = 'running'
      `;
    });
  }

  async completeRun(run: EvidenceSyncRun) {
    await this.sql`
      update commerce_evidence_sync_runs
      set
        status = 'succeeded',
        completed_at = ${run.completedAt ?? new Date().toISOString()},
        records_processed = ${run.recordsProcessed},
        pages_processed = ${run.pagesProcessed},
        updated_at = now()
      where id = ${run.id}
        and organization_id = ${run.organizationId}
        and status = 'running'
    `;
  }

  async failRun(run: EvidenceSyncRun) {
    await this.sql`
      update commerce_evidence_sync_runs
      set
        status = 'failed',
        completed_at = ${run.completedAt ?? new Date().toISOString()},
        records_processed = ${run.recordsProcessed},
        pages_processed = ${run.pagesProcessed},
        error_code = ${run.errorCode ?? "provider_failure"},
        error_message = ${run.errorMessage ?? "Evidence synchronization failed."},
        updated_at = now()
      where id = ${run.id}
        and organization_id = ${run.organizationId}
        and status = 'running'
    `;
  }
}

async function persistNormalizedEvidence(
  sql: EvidenceSql,
  record: NormalizedEvidenceRecord,
) {
  await sql`
    insert into mercury_evidence_items (
      id,
      organization_id,
      source_id,
      provider,
      account_id,
      marketplace,
      dataset,
      evidence_kind,
      source_record_reference,
      title,
      summary,
      normalized_value,
      observed_at,
      ingested_at,
      date_range_start,
      date_range_end,
      schema_version,
      freshness,
      limitations,
      provenance,
      content_hash,
      expires_at
    ) values (
      ${record.id},
      ${record.organizationId},
      ${record.sourceId},
      ${record.provider},
      ${record.accountId ?? null},
      ${record.marketplace ?? null},
      ${record.dataset},
      ${record.kind},
      ${record.sourceRecordReference},
      ${record.title},
      ${record.summary},
      ${sql.json(record.value)},
      ${record.observedAt},
      ${record.ingestedAt},
      ${record.dateRange?.start ?? null},
      ${record.dateRange?.end ?? null},
      ${record.schemaVersion},
      ${record.freshness},
      ${sql.json(record.limitations)},
      ${sql.json(record.provenance)},
      ${record.provenance.contentHash},
      ${record.expiresAt}
    )
    on conflict (id) do update set
      provider = excluded.provider,
      account_id = excluded.account_id,
      marketplace = excluded.marketplace,
      dataset = excluded.dataset,
      evidence_kind = excluded.evidence_kind,
      source_record_reference = excluded.source_record_reference,
      title = excluded.title,
      summary = excluded.summary,
      normalized_value = excluded.normalized_value,
      observed_at = excluded.observed_at,
      ingested_at = excluded.ingested_at,
      date_range_start = excluded.date_range_start,
      date_range_end = excluded.date_range_end,
      schema_version = excluded.schema_version,
      freshness = excluded.freshness,
      limitations = excluded.limitations,
      provenance = excluded.provenance,
      content_hash = excluded.content_hash,
      expires_at = excluded.expires_at
    where mercury_evidence_items.organization_id = excluded.organization_id
      and mercury_evidence_items.source_id = excluded.source_id
  `;
}

type EvidenceRow = {
  id: string;
  organization_id: string;
  source_id: string;
  source_name: string;
  connection_id: string | null;
  provider: string;
  account_id: string | null;
  marketplace: string | null;
  dataset: NormalizedEvidenceRecord["dataset"];
  evidence_kind: string;
  source_record_reference: string;
  title: string;
  summary: string;
  normalized_value: EvidenceValue;
  observed_at: Date;
  ingested_at: Date;
  date_range_start: Date | null;
  date_range_end: Date | null;
  schema_version: string;
  limitations: string[];
  provenance: EvidenceProvenance;
  expires_at: Date;
};

export async function queryNormalizedEvidence(
  sql: postgres.Sql,
  query: EvidenceQuery,
): Promise<NormalizedEvidenceRecord[]> {
  if (query.datasets.length === 0) return [];
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
  const rows = await sql<Array<EvidenceRow>>`
    select
      item.*,
      source.connection_id,
      source.display_name as source_name
    from mercury_evidence_items item
    join mercury_evidence_sources source
      on source.id = item.source_id
      and source.organization_id = item.organization_id
    where item.organization_id = ${query.organizationId}
      and item.dataset in ${sql(query.datasets)}
      and (${query.accountId ?? null}::text is null or item.account_id = ${query.accountId ?? null})
      and (${query.marketplace ?? null}::text is null or item.marketplace = ${query.marketplace ?? null})
    order by item.observed_at desc
    limit ${limit}
  `;
  const asOf = query.asOf ?? new Date().toISOString();

  return rows.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    sourceId: row.source_id,
    sourceName: row.source_name,
    connectionId: row.connection_id ?? undefined,
    provider: row.provider,
    accountId: row.account_id ?? undefined,
    marketplace: row.marketplace ?? undefined,
    dataset: row.dataset,
    kind: row.evidence_kind,
    sourceRecordReference: row.source_record_reference,
    title: row.title,
    summary: row.summary,
    value: row.normalized_value,
    observedAt: row.observed_at.toISOString(),
    ingestedAt: row.ingested_at.toISOString(),
    dateRange:
      row.date_range_start && row.date_range_end
        ? {
            start: row.date_range_start.toISOString(),
            end: row.date_range_end.toISOString(),
          }
        : undefined,
    schemaVersion: row.schema_version,
    freshness: classifyEvidenceFreshness(
      row.observed_at.toISOString(),
      freshnessPolicyFor(row.dataset),
      asOf,
    ),
    expiresAt: row.expires_at.toISOString(),
    limitations: row.limitations ?? [],
    provenance: row.provenance,
  }));
}

export class PostgresEvidenceReader implements EvidenceReader {
  constructor(private readonly sql: postgres.Sql) {}

  query(input: EvidenceQuery) {
    return queryNormalizedEvidence(this.sql, input);
  }
}

export class PostgresEvidenceCache implements EvidenceCache {
  constructor(
    private readonly sql: postgres.Sql,
    private readonly organizationId: string,
  ) {}

  async get<T>(
    key: string,
    asOf = new Date().toISOString(),
  ): Promise<EvidenceCacheResult<T>> {
    const rows = await this.sql<Array<{
      normalized_payload: T;
      stored_at: Date;
      expires_at: Date;
      stale_until: Date;
    }>>`
      select normalized_payload, stored_at, expires_at, stale_until
      from commerce_evidence_cache
      where organization_id = ${this.organizationId}
        and cache_key = ${key}
      limit 1
    `;
    const row = rows[0];
    if (!row) return { state: "miss" };
    const now = Date.parse(asOf);
    if (now > row.stale_until.getTime()) {
      await this.sql`
        delete from commerce_evidence_cache
        where organization_id = ${this.organizationId}
          and cache_key = ${key}
      `;
      return { state: "miss" };
    }
    return {
      state: now <= row.expires_at.getTime() ? "fresh" : "stale",
      value: row.normalized_payload,
      storedAt: row.stored_at.toISOString(),
    };
  }

  async set<T>(entry: EvidenceCacheEntry<T>) {
    await this.sql`
      insert into commerce_evidence_cache (
        organization_id,
        cache_key,
        normalized_payload,
        stored_at,
        expires_at,
        stale_until
      ) values (
        ${this.organizationId},
        ${entry.key},
        ${this.sql.json(entry.value as JSONValue)},
        ${entry.storedAt},
        ${entry.expiresAt},
        ${entry.staleUntil}
      )
      on conflict (organization_id, cache_key) do update set
        normalized_payload = excluded.normalized_payload,
        stored_at = excluded.stored_at,
        expires_at = excluded.expires_at,
        stale_until = excluded.stale_until
    `;
  }

  async invalidate(prefix: string) {
    const rows = await this.sql<Array<{ cache_key: string }>>`
      delete from commerce_evidence_cache
      where organization_id = ${this.organizationId}
        and cache_key like ${`${prefix}%`}
      returning cache_key
    `;
    return rows.length;
  }
}
