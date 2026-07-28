import { createHash } from "node:crypto";
import type {
  EvidenceScalar,
  NormalizedEvidenceRecord,
} from "../evidence/types";
import { OrganizationScopeError } from "../platform/authorization";
import type {
  AtlasConfidence,
  AtlasEvidenceReference,
} from "./types";

export const ATLAS_EVIDENCE_DATASETS = ["catalog", "compliance"] as const;

export function atlasEvidence(
  organizationId: string,
  records: NormalizedEvidenceRecord[],
) {
  for (const record of records) {
    if (record.organizationId !== organizationId) {
      throw new OrganizationScopeError();
    }
  }
  return records.filter(
    (record) =>
      record.dataset === "catalog" || record.dataset === "compliance",
  );
}

export function evidenceReference(
  record: NormalizedEvidenceRecord,
): AtlasEvidenceReference {
  if (record.dataset !== "catalog" && record.dataset !== "compliance") {
    throw new Error("Atlas can reference only catalog or compliance evidence.");
  }
  return {
    id: record.id,
    sourceId: record.sourceId,
    sourceName: record.sourceName,
    provider: record.provider,
    dataset: record.dataset,
    kind: record.kind,
    title: record.title,
    observedAt: record.observedAt,
    freshness: record.freshness,
    sourceRecordReference: record.sourceRecordReference,
    limitations: record.limitations,
  };
}

export function recordAttributes(record: NormalizedEvidenceRecord) {
  if (record.value.type === "attributes") return record.value.attributes;
  if (record.value.type === "status") return record.value.attributes;
  return record.value.dimensions;
}

export function scalarFrom(
  records: NormalizedEvidenceRecord[],
  keys: string[],
): { value: EvidenceScalar; record: NormalizedEvidenceRecord } | null {
  for (const record of records) {
    const attributes = recordAttributes(record);
    for (const key of keys) {
      if (attributes[key] !== undefined && attributes[key] !== null) {
        return { value: attributes[key], record };
      }
    }
  }
  return null;
}

export function metricFrom(
  records: NormalizedEvidenceRecord[],
  metrics: string[],
) {
  return (
    records.find(
      (record) =>
        record.value.type === "metric" &&
        metrics.includes(record.value.metric),
    ) ?? null
  );
}

export function confidenceFromEvidence(
  records: NormalizedEvidenceRecord[],
  explanation: string,
): AtlasConfidence {
  if (records.length === 0) {
    return {
      score: 0,
      level: "low",
      explanation,
    };
  }
  const freshnessFactors: number[] = records.map((record) => {
    if (record.freshness === "current") return 1;
    if (record.freshness === "delayed") return 0.72;
    if (record.freshness === "stale") return 0.35;
    return 0;
  });
  const freshness =
    freshnessFactors.reduce<number>((total, value) => total + value, 0) /
    freshnessFactors.length;
  const limitationFactor = records.some(
    (record) => record.limitations.length > 0,
  )
    ? 0.8
    : 1;
  return confidence(Math.min(1, freshness * limitationFactor), explanation);
}

export function confidence(
  score: number,
  explanation: string,
): AtlasConfidence {
  const bounded = Math.round(Math.min(Math.max(score, 0), 1) * 100) / 100;
  return {
    score: bounded,
    level: bounded >= 0.8 ? "high" : bounded >= 0.5 ? "medium" : "low",
    explanation,
  };
}

export function stableAtlasId(prefix: string, values: string[]) {
  const hash = createHash("sha256")
    .update(values.join("|"))
    .digest("hex")
    .slice(0, 20);
  return `${prefix}_${hash}`;
}

export function productReferences(records: NormalizedEvidenceRecord[]) {
  const values = new Set<string>();
  for (const record of records) {
    const attributes = recordAttributes(record);
    for (const key of ["asin", "sku", "sellerSku", "productId"]) {
      const value = attributes[key];
      if (typeof value === "string" && value.trim()) values.add(value);
    }
  }
  return [...values].sort();
}
