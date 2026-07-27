import type {
  EvidenceDataset,
  EvidenceFreshness,
  EvidenceProvenance,
  NormalizedEvidenceRecord,
} from "../evidence/types";
import type { MercuryCapability } from "./types";

export type { EvidenceFreshness } from "../evidence/types";

export type EvidenceCoverageStatus =
  | "available"
  | "partial"
  | "unavailable";

export type MercuryEvidenceItem = {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceType: string;
  provider: string;
  dataset: EvidenceDataset;
  kind: string;
  title: string;
  summary: string;
  sourceRecordReference?: string;
  observedAt: string;
  ingestedAt: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  freshness: EvidenceFreshness;
  limitations: string[];
  provenance: EvidenceProvenance;
};

export type MercuryEvidenceCoverage = {
  status: EvidenceCoverageStatus;
  itemCount: number;
  sourceCount: number;
  lastObservedAt?: string;
  limitation: string;
  items: MercuryEvidenceItem[];
};

export const NO_EVIDENCE_LIMITATION =
  "No live commerce evidence is connected to this plan. Routing is based only on the submitted objective and configured capability rules.";

const capabilityDatasets: Record<MercuryCapability, EvidenceDataset[]> = {
  "catalog.audit": ["catalog"],
  "catalog.optimize": ["catalog"],
  "advertising.audit": ["advertising"],
  "advertising.optimize": ["advertising"],
  "inventory.forecast": ["inventory", "demand"],
  "inventory.protect": ["inventory", "demand"],
  "compliance.audit": ["compliance"],
  "compliance.resolve": ["compliance"],
  "creative.brief": ["creative", "catalog"],
  "reporting.generate": ["executive"],
};

export function evidenceDatasetsForCapabilities(
  capabilities: MercuryCapability[],
) {
  return [
    ...new Set(capabilities.flatMap((capability) => capabilityDatasets[capability])),
  ];
}

export function toMercuryEvidenceItem(
  record: NormalizedEvidenceRecord,
): MercuryEvidenceItem {
  return {
    id: record.id,
    sourceId: record.sourceId,
    sourceName: record.sourceName,
    sourceType: "commerce_provider",
    provider: record.provider,
    dataset: record.dataset,
    kind: record.kind,
    sourceRecordReference: record.sourceRecordReference,
    title: record.title,
    summary: record.summary,
    observedAt: record.observedAt,
    ingestedAt: record.ingestedAt,
    dateRangeStart: record.dateRange?.start,
    dateRangeEnd: record.dateRange?.end,
    freshness: record.freshness,
    limitations: record.limitations,
    provenance: record.provenance,
  };
}

export function summarizeEvidence(
  items: MercuryEvidenceItem[],
): MercuryEvidenceCoverage {
  const usableItems = items.filter(
    (item) => item.freshness !== "unavailable",
  );
  const hasLimitedItem = items.some(
    (item) =>
      item.freshness === "delayed" ||
      item.freshness === "stale" ||
      item.freshness === "unavailable" ||
      item.limitations.length > 0,
  );
  const lastObservedAt = usableItems
    .map((item) => item.observedAt)
    .sort()
    .at(-1);

  if (usableItems.length === 0) {
    return {
      status: "unavailable",
      itemCount: 0,
      sourceCount: 0,
      limitation: NO_EVIDENCE_LIMITATION,
      items: [],
    };
  }

  return {
    status: hasLimitedItem ? "partial" : "available",
    itemCount: usableItems.length,
    sourceCount: new Set(usableItems.map((item) => item.sourceId)).size,
    lastObservedAt,
    limitation: hasLimitedItem
      ? "Some evidence is delayed, stale, unavailable, or carries source limitations."
      : "All attached evidence is available without recorded limitations.",
    items,
  };
}
