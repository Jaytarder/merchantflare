import { OrganizationScopeError } from "../platform/authorization";
import type { NormalizedEvidenceRecord } from "../evidence";
import type { OracleDemandSignal, OracleProductRef, OracleSignalMetric, PlannerOverride, PlanningEvidence } from "./types";

const metricAliases: Record<string, OracleSignalMetric | undefined> = {
  ordered_units: "order_units", sales_units: "sales_units", shipped_units: "shipped_units",
  ordered_revenue: "ordered_revenue", shipped_revenue: "shipped_revenue", cancellations: "cancellations",
  promo_quantity: "promo_quantity", amazon_oh: "amazon_oh", amazon_oo: "amazon_oo",
  awc_oh: "awc_oh", df_inventory: "df_inventory", lead_time_days: "lead_time_days",
  category_trend: "category_trend", availability: "availability",
};

function dimensions(record: NormalizedEvidenceRecord) {
  return record.value.type === "metric" ? record.value.dimensions : record.value.attributes;
}

export function productFromEvidence(record: NormalizedEvidenceRecord): OracleProductRef | null {
  const values = dimensions(record);
  const sku = values.sellerSku ?? values.sku;
  if (typeof sku !== "string" || !sku.trim()) return null;
  return {
    sku, asin: typeof values.asin === "string" ? values.asin : undefined,
    marketplace: record.marketplace,
    category: typeof values.category === "string" ? values.category : undefined,
    license: typeof values.license === "string" ? values.license : undefined,
    productGroup: typeof values.productGroup === "string" ? values.productGroup : undefined,
  };
}

export function normalizedOracleSignals(organizationId: string, records: NormalizedEvidenceRecord[]): OracleDemandSignal[] {
  const signals: OracleDemandSignal[] = [];
  for (const record of records) {
    if (record.organizationId !== organizationId) throw new OrganizationScopeError();
    if (record.dataset !== "demand" && record.dataset !== "inventory") continue;
    const product = productFromEvidence(record);
    if (!product) continue;
    if (record.kind === "inventory.fulfillment-summary" && record.value.type === "attributes") {
      const attrs = record.value.attributes;
      for (const [metric, key] of [["amazon_oh", "fulfillableQuantity"], ["inbound_inventory", "inboundQuantity"]] as const) {
        const value = attrs[key];
        if (typeof value === "number") signals.push({ id: `${record.id}:${metric}`, organizationId, decisionCaseId: "", product, metric, value, unit: "count", periodStart: record.observedAt, periodEnd: record.observedAt, observedAt: record.observedAt, source: record.sourceName, sourceEvidenceId: record.id, freshness: record.freshness, confidence: record.freshness === "current" ? 0.9 : 0.55, demandCensored: false });
      }
      continue;
    }
    if (record.value.type !== "metric") continue;
    const metric = metricAliases[record.value.metric];
    if (!metric) continue;
    signals.push({ id: record.id, organizationId, decisionCaseId: "", product, metric, value: record.value.value, unit: record.value.unit, periodStart: record.dateRange?.start ?? record.observedAt, periodEnd: record.dateRange?.end ?? record.observedAt, observedAt: record.observedAt, source: record.sourceName, sourceEvidenceId: record.id, freshness: record.freshness, confidence: record.freshness === "current" ? 0.9 : record.freshness === "delayed" ? 0.65 : 0.3, demandCensored: false });
  }
  return signals;
}

export function validatePlanningEvidence(input: PlanningEvidence) {
  if (!input.sourceMessageId || !input.sender || !input.subject || !input.product.sku) throw new Error("Planning evidence requires message, sender, subject, and SKU provenance.");
  if (input.sourceConfidence < 0 || input.sourceConfidence > 1) throw new Error("Planning evidence confidence must be between 0 and 1.");
  if (input.classification !== "OBSERVATION" && input.metricValue !== undefined && !input.statedReasoning) {
    throw new Error("Planner commentary with a numeric value requires stated reasoning and cannot silently become observed fact.");
  }
  return input;
}

export function validatePlannerOverride(input: PlannerOverride) {
  if (!input.plannerId || !input.reason.trim() || !input.product.sku || !input.expectedOutcome.trim()) {
    throw new Error("A planner override requires planner, reason, SKU, and expected outcome.");
  }
  if (![input.quantity, input.forecastBefore, input.forecastAfter].every((value) => Number.isFinite(value) && value >= 0)) {
    throw new Error("Planner override quantities and forecasts must be non-negative finite numbers.");
  }
  return input;
}
