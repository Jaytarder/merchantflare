import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  applyMoq, assessNewness, calculateInventoryPosition, calculateMichaelForecast,
  calculateOracleForecast, compareForecasts, defaultMichaelModelConfig,
  detectStockoutCensoring, generateReplenishmentOptions, isBtrCandidate,
  isDfCandidate, normalizedOracleSignals, scorePlanningOutcome,
  validatePlannerOverride, validatePlanningEvidence,
  type OracleDemandSignal, type OracleProductRef,
} from "../lib/oracle";

const product: OracleProductRef = { sku: "SKU-1", asin: "B000TEST", productGroup: "Lic Kids", launchDate: "2026-07-01T00:00:00.000Z" };
function signal(metric: OracleDemandSignal["metric"], value: number, week: number, extra: Partial<OracleDemandSignal> = {}): OracleDemandSignal {
  const start = new Date(Date.UTC(2026, 5, 1 + week * 7)).toISOString();
  const end = new Date(Date.UTC(2026, 5, 7 + week * 7)).toISOString();
  return { id: `${metric}-${week}`, organizationId: "org-a", decisionCaseId: "case-a", product, metric, value, unit: "count", periodStart: start, periodEnd: end, observedAt: end, source: "test source", freshness: "current", confidence: 0.9, demandCensored: false, ...extra };
}

test("MichaelModel uses the higher L6 sales or orders basis", () => {
  const signals = [...Array.from({ length: 6 }, (_, i) => signal("sales_units", 100, i)), ...Array.from({ length: 6 }, (_, i) => signal("order_units", 120, i))];
  const forecast = calculateMichaelForecast({ product: { ...product, productGroup: "Other" }, signals, horizonWeeks: 8, lifecycleState: "STABLE" });
  assert.equal(forecast.weeklyRate, 120);
  assert.equal(forecast.baseForecast, 960);
});

test("MichaelModel applies the configurable 1.33x Lic Kids order ceiling", () => {
  const signals = [...Array.from({ length: 6 }, (_, i) => signal("sales_units", 100, i)), ...Array.from({ length: 6 }, (_, i) => signal("order_units", 200, i))];
  const forecast = calculateMichaelForecast({ product, signals, horizonWeeks: 1, lifecycleState: "STABLE" });
  assert.equal(forecast.weeklyRate, 133);
});

test("MichaelModel applies actual promo quantity plus 6 percent backup", () => {
  const signals = [signal("sales_units", 50, 0), signal("order_units", 50, 0), signal("promo_quantity", 1000, 1)];
  const forecast = calculateMichaelForecast({ product, signals, horizonWeeks: 1, lifecycleState: "STABLE" });
  assert.equal(forecast.baseForecast, 1060);
});

test("WOS keeps inventory buckets separate unless explicitly enabled", () => {
  const forecast = calculateOracleForecast({ product, signals: [signal("sales_units", 100, 0), signal("order_units", 100, 0)], horizonWeeks: 8, lifecycleState: "STABLE" });
  const base = { amazonOnHand: 200, amazonOnOrder: 100, awcOnHand: 1000, dfAvailable: 500, transferable: 300, committed: 0, promoCommitted: 0, inbound: 0, protected: 0 };
  const separated = calculateInventoryPosition({ product, buckets: base, forecast, asOf: "2026-08-01T00:00:00.000Z" });
  const allowed = calculateInventoryPosition({ product, buckets: base, forecast, allowDf: true, allowTransfer: true, asOf: "2026-08-01T00:00:00.000Z" });
  assert.equal(separated.usableInventory, 200);
  assert.equal(allowed.usableInventory, 1000);
  assert.ok((separated.currentWos ?? 0) < (allowed.currentWos ?? 0));
});

test("DF and BTR eligibility follow configurable planning thresholds", () => {
  const forecast = { ...calculateOracleForecast({ product, signals: [signal("sales_units", 100, 0), signal("order_units", 100, 0)], horizonWeeks: 8, lifecycleState: "STABLE" }), weeklyRate: 100 };
  const position = calculateInventoryPosition({ product, forecast, buckets: { amazonOnHand: 200, amazonOnOrder: 50, awcOnHand: 350, dfAvailable: 0, transferable: 0, committed: 0, promoCommitted: 0, inbound: 0, protected: 0 } });
  assert.equal(isDfCandidate({ position, latestWeekSales: 12 }), true);
  assert.equal(isBtrCandidate({ position }), true);
});

test("MOQ handling supports 500 and possible 1000 production constraints", () => {
  assert.deepEqual(applyMoq(620, 500).quantity, 1000);
  assert.deepEqual(applyMoq(620, 500, 1000).quantity, 1000);
  assert.equal(defaultMichaelModelConfig.minimumBuy, 500);
});

test("lifecycle adjustment reduces post-event demand without hiding the rule", () => {
  const inputs = [signal("sales_units", 100, 0), signal("order_units", 100, 0)];
  const stable = calculateMichaelForecast({ product, signals: inputs, horizonWeeks: 1, lifecycleState: "STABLE" });
  const decay = calculateMichaelForecast({ product, signals: inputs, horizonWeeks: 1, lifecycleState: "POST_EVENT_DECAY" });
  assert.ok(decay.baseForecast < stable.baseForecast);
  assert.ok(decay.drivers.some((driver) => driver.name === "lifecycle adjustment"));
});

test("stockout-censored demand is marked and excluded when uncensored periods exist", () => {
  const inputs = [signal("sales_units", 20, 0), signal("amazon_oh", 0, 0), signal("sales_units", 100, 1), signal("amazon_oh", 500, 1), signal("order_units", 100, 1)];
  const censored = detectStockoutCensoring(inputs);
  assert.equal(censored.find((item) => item.id === "sales_units-0")?.demandCensored, true);
  const forecast = calculateOracleForecast({ product, signals: censored, horizonWeeks: 1, lifecycleState: "STABLE" });
  assert.ok(forecast.weeklyRate > 50);
});

test("planner overrides and email commentary remain attributable classifications", () => {
  assert.equal(validatePlannerOverride({ plannerId: "michael", reason: "Top seller", quantity: 1000, recordedAt: new Date().toISOString(), product, forecastBefore: 650, forecastAfter: 1000, expectedOutcome: "Protect service" }).forecastAfter, 1000);
  assert.throws(() => validatePlanningEvidence({ id: "e", organizationId: "org-a", decisionCaseId: "case-a", sourceMessageId: "msg", sender: "planner@example.com", receivedAt: new Date().toISOString(), subject: "Plan", product, metricName: "WOS", metricValue: 4, classification: "PLANNER_ASSUMPTION", sourceConfidence: 0.7, provenance: {} }));
});

test("Oracle and Michael forecasts persist independent disagreement and value of information", () => {
  const signals = [...Array.from({ length: 6 }, (_, i) => signal("sales_units", 100, i)), ...Array.from({ length: 6 }, (_, i) => signal("order_units", 200, i)), signal("cancellations", 80, 5)];
  const michael = calculateMichaelForecast({ product, signals, horizonWeeks: 8, lifecycleState: "STABLE" });
  const oracle = calculateOracleForecast({ product, signals, horizonWeeks: 8, lifecycleState: "STABLE" });
  const comparison = compareForecasts({ michael, oracle, waitCost: 1, errorCostPerUnit: 10 });
  assert.notEqual(michael.baseForecast, oracle.baseForecast);
  assert.equal(comparison.materiallyDisagrees, true);
  assert.equal(comparison.valueOfInformation.recommendation, "WAIT");
});

test("outcome scoring measures error, bias, stockout miss, overbuy and WOS error", () => {
  const score = scorePlanningOutcome({ forecastDemand: 900, actualDemand: 1000, recommendedBuy: 900, actualBuy: 800, expectedStockout: false, actualStockout: true, expectedWos: 8, actualWos: 5, expectedExcess: 0, actualExcess: 10 });
  assert.deepEqual(score, { absoluteError: 100, absolutePercentageError: 0.1, bias: -100, stockoutMiss: true, overbuy: 0, underbuy: 200, wosError: 3 });
});

test("newness flags evidence-backed breakout velocity for immediate review", () => {
  const result = assessNewness({ product, signals: [signal("sales_units", 100, 0), signal("sales_units", 180, 1)], expectedWeeklyVelocity: 100 });
  assert.equal(result.breakout, true);
  assert.equal(result.immediateBuyReview, true);
});

test("replenishment options expose quantity, MOQ, risk, confidence and reasons", () => {
  const forecast = { ...calculateOracleForecast({ product, signals: [signal("sales_units", 100, 0), signal("order_units", 100, 0)], horizonWeeks: 8, lifecycleState: "STABLE" }), weeklyRate: 100 };
  const position = calculateInventoryPosition({ product, forecast, buckets: { amazonOnHand: 100, amazonOnOrder: 0, awcOnHand: 350, dfAvailable: 0, transferable: 0, committed: 0, promoCommitted: 0, inbound: 0, protected: 0 } });
  const options = generateReplenishmentOptions({ position, forecast, latestWeekSales: 20 });
  assert.ok(options.some((option) => option.action === "BUY"));
  assert.ok(options.some((option) => option.action === "DF"));
  assert.ok(options.every((option) => option.why.length && option.whatCouldMakeItWrong.length));
});

test("Oracle evidence rejects cross-tenant records", () => {
  assert.throws(() => normalizedOracleSignals("org-a", [{ id: "x", organizationId: "org-b", sourceId: "s", sourceName: "source", provider: "test", dataset: "demand", kind: "demand.ordered-units", sourceRecordReference: "r", title: "t", summary: "s", value: { type: "metric", metric: "ordered_units", value: 5, unit: "count", dimensions: { sellerSku: "SKU-1" } }, observedAt: new Date().toISOString(), ingestedAt: new Date().toISOString(), schemaVersion: "1", freshness: "current", expiresAt: new Date().toISOString(), limitations: [], provenance: { provider: "test", sourceId: "s", sourceRecordReference: "r", observedAt: new Date().toISOString(), ingestedAt: new Date().toISOString(), pipeline: "p", pipelineVersion: "1", transformations: [], contentHash: "h" } }]));
});

test("migration 010 is additive, tenant scoped, indexed and outcome immutable", async () => {
  const sql = await readFile("db/migrations/010_oracle_planning_engine.sql", "utf8");
  assert.match(sql, /create table if not exists oracle_planning_cases/);
  assert.match(sql, /decision_case_id, organization_id/);
  assert.match(sql, /oracle_demand_signals_product_time_idx/);
  assert.match(sql, /oracle_planning_outcomes_immutable/);
  assert.doesNotMatch(sql, /drop table|truncate table|alter table .* drop column/i);
});
