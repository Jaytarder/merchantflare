import { createHash } from "node:crypto";
import {
  classifyEvidenceFreshness,
  evidenceExpiry,
  freshnessPolicyFor,
} from "./freshness";
import type {
  EvidenceSourceContext,
  NormalizedEvidenceDraft,
  NormalizedEvidenceRecord,
} from "./types";

export const NORMALIZED_EVIDENCE_SCHEMA_VERSION = "2026-07-27.v1";

export type EvidenceNormalizationPipeline<TProviderRecord> = {
  name: string;
  version: string;
  normalize(
    record: TProviderRecord,
    context: EvidenceSourceContext,
  ): NormalizedEvidenceDraft[];
};

type NormalizeBatchInput<TProviderRecord> = {
  records: TProviderRecord[];
  context: EvidenceSourceContext;
  pipeline: EvidenceNormalizationPipeline<TProviderRecord>;
  ingestedAt?: string;
};

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

export function stableEvidenceHash(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex");
}

function validateDraft(draft: NormalizedEvidenceDraft) {
  if (!draft.sourceRecordReference.trim()) {
    throw new Error("Normalized evidence requires a source record reference.");
  }
  if (!draft.title.trim() || !draft.summary.trim()) {
    throw new Error("Normalized evidence requires a title and summary.");
  }
  const observedAt = Date.parse(draft.observedAt);
  if (!Number.isFinite(observedAt)) {
    throw new Error("Normalized evidence requires an ISO 8601 observation time.");
  }
  if (draft.dateRange) {
    const start = Date.parse(draft.dateRange.start);
    const end = Date.parse(draft.dateRange.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      throw new Error("Normalized evidence contains an invalid date range.");
    }
  }
  if (draft.value.type === "metric") {
    if (!Number.isFinite(draft.value.value)) {
      throw new Error("Normalized metric evidence requires a finite value.");
    }
    if (draft.value.unit === "currency" && !draft.value.currency?.trim()) {
      throw new Error("Normalized currency evidence requires a currency.");
    }
  }
  if (draft.limitations.some((limitation) => !limitation.trim())) {
    throw new Error("Evidence limitations cannot contain empty values.");
  }
}

function validateContext(context: EvidenceSourceContext, ingestedAt: string) {
  if (
    !context.organizationId.trim() ||
    !context.sourceId.trim() ||
    !context.sourceName.trim() ||
    !context.provider.trim()
  ) {
    throw new Error(
      "Evidence normalization requires organization, source, source name, and provider context.",
    );
  }
  if (!Number.isFinite(Date.parse(ingestedAt))) {
    throw new Error("Evidence normalization requires an ISO 8601 ingestion time.");
  }
}

export function normalizeEvidenceBatch<TProviderRecord>(
  input: NormalizeBatchInput<TProviderRecord>,
): NormalizedEvidenceRecord[] {
  const ingestedAt = input.ingestedAt ?? new Date().toISOString();
  validateContext(input.context, ingestedAt);

  return input.records.flatMap((providerRecord) =>
    input.pipeline.normalize(providerRecord, input.context).map((draft) => {
      validateDraft(draft);
      const policy = freshnessPolicyFor(draft.dataset);
      const contentHash = stableEvidenceHash({
        provider: input.context.provider,
        source: input.context.sourceId,
        record: draft.sourceRecordReference,
        dataset: draft.dataset,
        kind: draft.kind,
        value: draft.value,
        observedAt: draft.observedAt,
        dateRange: draft.dateRange,
      });
      const id = `evidence_${stableEvidenceHash({
        organizationId: input.context.organizationId,
        sourceId: input.context.sourceId,
        sourceRecordReference: draft.sourceRecordReference,
        dataset: draft.dataset,
        kind: draft.kind,
        observedAt: draft.observedAt,
      })}`;

      return {
        ...draft,
        id,
        organizationId: input.context.organizationId,
        sourceId: input.context.sourceId,
        sourceName: input.context.sourceName,
        connectionId: input.context.connectionId,
        provider: input.context.provider,
        accountId: draft.accountId ?? input.context.accountId,
        marketplace: draft.marketplace ?? input.context.marketplace,
        schemaVersion:
          draft.schemaVersion || NORMALIZED_EVIDENCE_SCHEMA_VERSION,
        ingestedAt,
        freshness: classifyEvidenceFreshness(
          draft.observedAt,
          policy,
          ingestedAt,
        ),
        expiresAt: evidenceExpiry(ingestedAt, policy),
        limitations: [...draft.limitations],
        provenance: {
          provider: input.context.provider,
          sourceId: input.context.sourceId,
          sourceRecordReference: draft.sourceRecordReference,
          observedAt: draft.observedAt,
          ingestedAt,
          pipeline: input.pipeline.name,
          pipelineVersion: input.pipeline.version,
          transformations: [...(draft.transformations ?? [])],
          contentHash,
        },
      };
    }),
  );
}
