import { createHash } from "crypto";
import type { NormalizedEvidenceRecord } from "../evidence";
import type { AdvertisingSignal, ChristianReportFact, VectorMetric } from "./types";

const metrics = new Set<VectorMetric>(["spend", "ad_sales", "total_sales", "impressions", "clicks", "orders", "units", "bid", "budget", "margin", "tacos_target"]);
export function normalizedAdvertisingSignals(organizationId: string, records: NormalizedEvidenceRecord[]): AdvertisingSignal[] {
  return records.flatMap((record) => {
    if (record.organizationId !== organizationId || record.dataset !== "advertising" || record.value.type !== "metric" || !metrics.has(record.value.metric as VectorMetric)) return [];
    const d = record.value.dimensions;
    const sku = typeof d.sku === "string" ? d.sku : undefined;
    const asin = typeof d.asin === "string" ? d.asin : undefined;
    if (!sku && !asin) return [];
    return [{ id: record.id, organizationId, entity: { sku: sku ?? asin!, asin, marketplace: record.marketplace, campaignId: typeof d.campaignId === "string" ? d.campaignId : undefined, adGroupId: typeof d.adGroupId === "string" ? d.adGroupId : undefined }, metric: record.value.metric as VectorMetric, value: record.value.value, unit: record.value.unit, periodStart: record.dateRange?.start ?? record.observedAt, periodEnd: record.dateRange?.end ?? record.observedAt, observedAt: record.observedAt, source: record.provider, freshness: record.freshness, confidence: record.limitations.length ? 0.6 : 0.85, classification: "OBSERVATION" as const, provenance: record.provenance }];
  });
}
export function validateChristianReport(fact: ChristianReportFact) {
  if (fact.sender.toLowerCase() !== "ccachafeiro@teikametrics.com") throw new Error("Christian report sender is not approved.");
  if (!/teikametrics|weekly report/i.test(fact.subject)) throw new Error("Message subject is outside the approved Teikametrics ingestion boundary.");
  if (!fact.sourceMessageId || !fact.receivedAt || !fact.entity.sku) throw new Error("Report provenance and product identity are required.");
  return { ...fact, idempotencyKey: createHash("sha256").update([fact.sourceMessageId, fact.entity.sku, fact.metric ?? "", String(fact.value ?? ""), fact.actionProposed ?? ""].join("|")).digest("hex") };
}
