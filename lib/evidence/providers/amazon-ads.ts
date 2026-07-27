import type {
  EvidenceProviderDescriptor,
  EvidenceProviderReader,
} from "../provider";
import type { EvidenceNormalizationPipeline } from "../normalization";
import type { NormalizedEvidenceDraft } from "../types";

export const AMAZON_ADS_EVIDENCE_PROVIDER: EvidenceProviderDescriptor = {
  key: "amazon-ads",
  displayName: "Amazon Ads",
  contractVersion: "2026-07-27.v1",
  datasets: ["advertising"],
};

export type AmazonAdsEvidenceCursor = string;

export type AmazonAdsEvidenceRecord = {
  type: "campaign-performance";
  profileId: string;
  campaignId: string;
  campaignName: string;
  marketplace: string;
  currency: string;
  spend: number;
  attributedSales: number;
  impressions: number;
  clicks: number;
  periodStart: string;
  periodEnd: string;
  observedAt: string;
  attributionWindowDays: number;
};

export interface AmazonAdsEvidenceReader
  extends EvidenceProviderReader<
    AmazonAdsEvidenceRecord,
    AmazonAdsEvidenceCursor
  > {
  readonly descriptor: typeof AMAZON_ADS_EVIDENCE_PROVIDER;
}

function metricDraft(
  record: AmazonAdsEvidenceRecord,
  metric: string,
  value: number,
  unit: "count" | "currency" | "ratio",
): NormalizedEvidenceDraft {
  return {
    dataset: "advertising",
    kind: `advertising.${metric}`,
    sourceRecordReference: `campaign:${record.profileId}:${record.campaignId}:${record.periodStart}:${metric}`,
    title: `${metric.replaceAll("_", " ")} for ${record.campaignName}`,
    summary: `${value} ${unit === "currency" ? record.currency : unit} was observed for the campaign during the source period.`,
    value: {
      type: "metric",
      metric,
      value,
      unit,
      ...(unit === "currency" ? { currency: record.currency } : {}),
      dimensions: {
        profileId: record.profileId,
        campaignId: record.campaignId,
        campaignName: record.campaignName,
        attributionWindowDays: record.attributionWindowDays,
      },
    },
    accountId: record.profileId,
    marketplace: record.marketplace,
    observedAt: record.observedAt,
    dateRange: {
      start: record.periodStart,
      end: record.periodEnd,
    },
    schemaVersion: "2026-07-27.v1",
    limitations: [
      `Sales use the provider's ${record.attributionWindowDays}-day attribution window.`,
    ],
  };
}

export const amazonAdsNormalizationPipeline: EvidenceNormalizationPipeline<AmazonAdsEvidenceRecord> =
  {
    name: "amazon-ads",
    version: "2026-07-27.v1",
    normalize(record) {
      const roas =
        record.spend > 0 ? record.attributedSales / record.spend : 0;
      return [
        metricDraft(record, "spend", record.spend, "currency"),
        metricDraft(
          record,
          "attributed_sales",
          record.attributedSales,
          "currency",
        ),
        metricDraft(record, "impressions", record.impressions, "count"),
        metricDraft(record, "clicks", record.clicks, "count"),
        metricDraft(record, "roas", roas, "ratio"),
      ];
    },
  };
