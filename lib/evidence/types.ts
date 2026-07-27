export type EvidenceProviderKey = string;

export type EvidenceDataset =
  | "catalog"
  | "advertising"
  | "demand"
  | "inventory"
  | "compliance"
  | "creative"
  | "executive";

export type EvidenceFreshness =
  | "current"
  | "delayed"
  | "stale"
  | "unavailable";

export type EvidenceScalar = string | number | boolean | null;

export type EvidenceValue =
  | {
      type: "attributes";
      attributes: Record<string, EvidenceScalar>;
    }
  | {
      type: "metric";
      metric: string;
      value: number;
      unit: "count" | "currency" | "percent" | "ratio" | "score";
      currency?: string;
      dimensions: Record<string, EvidenceScalar>;
    }
  | {
      type: "status";
      status: string;
      attributes: Record<string, EvidenceScalar>;
    };

export type EvidenceDateRange = {
  start: string;
  end: string;
};

export type EvidenceTransformation = {
  name: string;
  version: string;
};

export type EvidenceProvenance = {
  provider: EvidenceProviderKey;
  sourceId: string;
  sourceRecordReference: string;
  observedAt: string;
  ingestedAt: string;
  pipeline: string;
  pipelineVersion: string;
  transformations: EvidenceTransformation[];
  contentHash: string;
};

export type NormalizedEvidenceRecord = {
  id: string;
  organizationId: string;
  sourceId: string;
  sourceName: string;
  connectionId?: string;
  provider: EvidenceProviderKey;
  accountId?: string;
  marketplace?: string;
  dataset: EvidenceDataset;
  kind: string;
  sourceRecordReference: string;
  title: string;
  summary: string;
  value: EvidenceValue;
  observedAt: string;
  ingestedAt: string;
  dateRange?: EvidenceDateRange;
  schemaVersion: string;
  freshness: EvidenceFreshness;
  expiresAt: string;
  limitations: string[];
  provenance: EvidenceProvenance;
};

export type NormalizedEvidenceDraft = Omit<
  NormalizedEvidenceRecord,
  | "id"
  | "organizationId"
  | "sourceId"
  | "sourceName"
  | "connectionId"
  | "provider"
  | "ingestedAt"
  | "freshness"
  | "expiresAt"
  | "provenance"
> & {
  transformations?: EvidenceTransformation[];
};

export type EvidenceSourceContext = {
  organizationId: string;
  sourceId: string;
  sourceName: string;
  connectionId?: string;
  provider: EvidenceProviderKey;
  accountId?: string;
  marketplace?: string;
};

export type EvidenceQuery = {
  organizationId: string;
  datasets: EvidenceDataset[];
  accountId?: string;
  marketplace?: string;
  limit?: number;
  asOf?: string;
};
