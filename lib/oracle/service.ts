import type postgres from "postgres";
import { CachedEvidenceQueryService, PostgresEvidenceCache, PostgresEvidenceReader, type NormalizedEvidenceRecord } from "../evidence";
import { requirePermission, type OrganizationPrincipal } from "../platform";
import { calculateMichaelForecast } from "./michael-model";
import { calculateOracleForecast, detectStockoutCensoring } from "./forecast";
import { calculateInventoryPosition } from "./inventory";
import { compareForecasts, generateReplenishmentOptions } from "./planning";
import { normalizedOracleSignals } from "./evidence";
import type { InventoryBuckets, OracleAssessment, OracleDemandSignal, OracleLifecycleState } from "./types";

function latest(signals: OracleDemandSignal[], metric: OracleDemandSignal["metric"]) {
  return signals.filter((signal) => signal.metric === metric).sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0]?.value ?? 0;
}

function buckets(signals: OracleDemandSignal[]): InventoryBuckets {
  return {
    amazonOnHand: latest(signals, "amazon_oh"), amazonOnOrder: latest(signals, "amazon_oo"),
    awcOnHand: latest(signals, "awc_oh"), dfAvailable: latest(signals, "df_inventory"),
    transferable: latest(signals, "transferable_inventory"), committed: latest(signals, "committed_inventory"),
    promoCommitted: latest(signals, "promo_commitments"), inbound: latest(signals, "inbound_inventory"), protected: 0,
  };
}

export async function assessOrganizationDemand(
  sql: postgres.Sql,
  principal: OrganizationPrincipal,
  asOf = new Date().toISOString(),
): Promise<OracleAssessment> {
  requirePermission(principal, "oracle.read");
  const evidence = await new CachedEvidenceQueryService(
    new PostgresEvidenceReader(sql), new PostgresEvidenceCache(sql, principal.organizationId),
  ).query({ organizationId: principal.organizationId, datasets: ["demand", "inventory"], limit: 250, asOf });
  return assessDemandEvidence(principal.organizationId, evidence, asOf);
}

export function assessDemandEvidence(
  organizationId: string,
  evidence: NormalizedEvidenceRecord[],
  asOf = new Date().toISOString(),
): OracleAssessment {
  const rawSignals = normalizedOracleSignals(organizationId, evidence);
  const grouped = new Map<string, OracleDemandSignal[]>();
  for (const signal of rawSignals) {
    const key = `${signal.product.marketplace ?? ""}:${signal.product.sku}`;
    grouped.set(key, [...(grouped.get(key) ?? []), signal]);
  }
  const decisions: OracleAssessment["decisions"] = [];
  for (const productSignals of grouped.values()) {
    const signals = detectStockoutCensoring(productSignals);
    const product = signals[0].product;
    const lifecycleState: OracleLifecycleState = "STABLE";
    const michael = calculateMichaelForecast({ product, signals, horizonWeeks: 8, lifecycleState, calculatedAt: asOf });
    const oracle = calculateOracleForecast({ product, signals, horizonWeeks: 8, lifecycleState, calculatedAt: asOf });
    if (michael.weeklyRate <= 0 && oracle.weeklyRate <= 0) continue;
    const comparison = compareForecasts({ michael, oracle });
    const inventory = calculateInventoryPosition({ product, buckets: buckets(signals), forecast: oracle, asOf });
    const options = generateReplenishmentOptions({ position: inventory, forecast: oracle, latestWeekSales: latest(signals, "latest_week_sales") || latest(signals, "sales_units"), leadTimeDays: latest(signals, "lead_time_days") || undefined, modelDisagreement: comparison.materiallyDisagrees });
    if (options[0]) decisions.push({ product, inventory, comparison, recommendedOption: options[0], alternatives: options.slice(1) });
  }
  return {
    organizationId,
    status: decisions.length ? (evidence.some((record) => record.freshness === "stale" || record.limitations.length) ? "partial" : "available") : "unavailable",
    assessedAt: asOf, decisions, evidenceCount: evidence.length,
    limitations: decisions.length ? ["Oracle calculations use only normalized evidence currently available to this organization."] : ["No product has sufficient normalized demand and inventory evidence for a forecast. Oracle did not create sample decisions."],
  };
}
