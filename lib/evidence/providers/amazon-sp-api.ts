import type {
  EvidenceProviderDescriptor,
  EvidenceProviderReader,
} from "../provider";
import type { EvidenceNormalizationPipeline } from "../normalization";
import type { NormalizedEvidenceDraft } from "../types";

export const AMAZON_SP_API_EVIDENCE_PROVIDER: EvidenceProviderDescriptor = {
  key: "amazon-sp-api",
  displayName: "Amazon Selling Partner API",
  contractVersion: "2026-07-27.v1",
  datasets: ["catalog", "inventory", "demand", "compliance"],
};

export type AmazonSpApiEvidenceCursor = string;

export type AmazonSpApiEvidenceRecord =
  | {
      type: "catalog-item";
      asin: string;
      marketplace: string;
      title: string;
      brand?: string;
      status: string;
      observedAt: string;
    }
  | {
      type: "inventory-summary";
      sellerSku: string;
      asin?: string;
      marketplace: string;
      fulfillableQuantity: number;
      inboundQuantity: number;
      observedAt: string;
    }
  | {
      type: "demand-observation";
      sellerSku: string;
      asin?: string;
      marketplace: string;
      orderedUnits: number;
      orderedRevenue: number;
      currency: string;
      periodStart: string;
      periodEnd: string;
      observedAt: string;
    }
  | {
      type: "compliance-issue";
      issueId: string;
      asin?: string;
      marketplace: string;
      status: string;
      severity: string;
      deadline?: string;
      observedAt: string;
    };

export interface AmazonSpApiEvidenceReader
  extends EvidenceProviderReader<
    AmazonSpApiEvidenceRecord,
    AmazonSpApiEvidenceCursor
  > {
  readonly descriptor: typeof AMAZON_SP_API_EVIDENCE_PROVIDER;
}

function catalogDraft(
  record: Extract<AmazonSpApiEvidenceRecord, { type: "catalog-item" }>,
): NormalizedEvidenceDraft {
  return {
    dataset: "catalog",
    kind: "catalog.item-status",
    sourceRecordReference: `catalog-item:${record.marketplace}:${record.asin}`,
    title: record.title,
    summary: `Catalog item ${record.asin} is ${record.status}.`,
    value: {
      type: "status",
      status: record.status,
      attributes: {
        asin: record.asin,
        brand: record.brand ?? null,
        title: record.title,
      },
    },
    observedAt: record.observedAt,
    marketplace: record.marketplace,
    schemaVersion: "2026-07-27.v1",
    limitations: [],
  };
}

function inventoryDraft(
  record: Extract<AmazonSpApiEvidenceRecord, { type: "inventory-summary" }>,
): NormalizedEvidenceDraft {
  return {
    dataset: "inventory",
    kind: "inventory.fulfillment-summary",
    sourceRecordReference: `inventory:${record.marketplace}:${record.sellerSku}`,
    title: `Inventory for ${record.sellerSku}`,
    summary: `${record.fulfillableQuantity} fulfillable units and ${record.inboundQuantity} inbound units were observed.`,
    value: {
      type: "attributes",
      attributes: {
        sellerSku: record.sellerSku,
        asin: record.asin ?? null,
        fulfillableQuantity: record.fulfillableQuantity,
        inboundQuantity: record.inboundQuantity,
      },
    },
    observedAt: record.observedAt,
    marketplace: record.marketplace,
    schemaVersion: "2026-07-27.v1",
    limitations: [],
  };
}

function demandDrafts(
  record: Extract<
    AmazonSpApiEvidenceRecord,
    { type: "demand-observation" }
  >,
): NormalizedEvidenceDraft[] {
  const common = {
    dataset: "demand" as const,
    observedAt: record.observedAt,
    marketplace: record.marketplace,
    dateRange: { start: record.periodStart, end: record.periodEnd },
    schemaVersion: "2026-07-27.v1",
    limitations: [],
  };
  return [
    {
      ...common,
      kind: "demand.ordered-units",
      sourceRecordReference: `demand:${record.marketplace}:${record.sellerSku}:${record.periodStart}:units`,
      title: `Ordered units for ${record.sellerSku}`,
      summary: `${record.orderedUnits} units were ordered during the source period.`,
      value: {
        type: "metric",
        metric: "ordered_units",
        value: record.orderedUnits,
        unit: "count",
        dimensions: {
          sellerSku: record.sellerSku,
          asin: record.asin ?? null,
        },
      },
    },
    {
      ...common,
      kind: "demand.ordered-revenue",
      sourceRecordReference: `demand:${record.marketplace}:${record.sellerSku}:${record.periodStart}:revenue`,
      title: `Ordered revenue for ${record.sellerSku}`,
      summary: `${record.orderedRevenue} ${record.currency} in ordered revenue was observed during the source period.`,
      value: {
        type: "metric",
        metric: "ordered_revenue",
        value: record.orderedRevenue,
        unit: "currency",
        currency: record.currency,
        dimensions: {
          sellerSku: record.sellerSku,
          asin: record.asin ?? null,
        },
      },
    },
  ];
}

function complianceDraft(
  record: Extract<AmazonSpApiEvidenceRecord, { type: "compliance-issue" }>,
): NormalizedEvidenceDraft {
  return {
    dataset: "compliance",
    kind: "compliance.issue",
    sourceRecordReference: `compliance:${record.marketplace}:${record.issueId}`,
    title: `Compliance issue ${record.issueId}`,
    summary: `The provider reports ${record.severity} severity with status ${record.status}.`,
    value: {
      type: "status",
      status: record.status,
      attributes: {
        issueId: record.issueId,
        asin: record.asin ?? null,
        severity: record.severity,
        deadline: record.deadline ?? null,
      },
    },
    observedAt: record.observedAt,
    marketplace: record.marketplace,
    schemaVersion: "2026-07-27.v1",
    limitations: [],
  };
}

export const amazonSpApiNormalizationPipeline: EvidenceNormalizationPipeline<AmazonSpApiEvidenceRecord> =
  {
    name: "amazon-sp-api",
    version: "2026-07-27.v1",
    normalize(record) {
      switch (record.type) {
        case "catalog-item":
          return [catalogDraft(record)];
        case "inventory-summary":
          return [inventoryDraft(record)];
        case "demand-observation":
          return demandDrafts(record);
        case "compliance-issue":
          return [complianceDraft(record)];
      }
    },
  };
