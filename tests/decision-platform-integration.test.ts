import test from "node:test";
import assert from "node:assert/strict";
import {
  assembleRecommendation,
  calibrationSummary,
  posteriorBelief,
  type Belief,
  type Evidence,
  type Hypothesis,
  createAtlasTitlePilot,
  calculateCalibration,
  classifyPredictionQuality,
} from "../lib/decision";
import {
  OrganizationScopeError,
  requireOrganizationScope,
} from "../lib/platform/authorization";
import {
  calculateInventoryPosition,
  calculateMichaelForecast,
  calculateOracleForecast,
  compareForecasts,
  generateReplenishmentOptions,
  type OracleDemandSignal,
} from "../lib/oracle";

test("decision learning lifecycle preserves evidence, alternatives, and posterior confidence", () => {
  const createdAt = "2026-08-02T12:00:00.000Z";
  const belief: Belief = {
    id: "belief-a",
    organizationId: "org-a",
    decisionCaseId: "case-a",
    statement: "A reversible catalog change may improve conversion.",
    confidence: 0.55,
    missingEvidence: ["Controlled comparison"],
    assumptions: ["Traffic mix remains comparable"],
    whatWouldChange: "A controlled result with no lift.",
    ownerId: "owner-a",
    version: 1,
    status: "active",
    createdAt,
    updatedAt: createdAt,
  };
  const evidence: Evidence = {
    id: "evidence-a",
    organizationId: "org-a",
    decisionCaseId: "case-a",
    source: "Normalized catalog observations",
    statement: "The current title omits a verified product attribute.",
    observedAt: createdAt,
    freshness: "current",
    ownerId: "owner-a",
    confidence: 0.9,
    grade: "observed",
    relationships: [],
    supportingReferences: ["catalog-1"],
    limitations: ["No outcome comparison"],
    createdAt,
  };
  const hypotheses: Hypothesis[] = [
    {
      id: "hypothesis-a",
      organizationId: "org-a",
      decisionCaseId: "case-a",
      statement: "Missing attribute clarity suppresses conversion.",
      likelihood: 0.55,
      confidence: 0.55,
      estimatedRisk: "low",
      status: "active",
      createdBy: "owner-a",
      createdAt,
    },
    {
      id: "hypothesis-b",
      organizationId: "org-a",
      decisionCaseId: "case-a",
      statement: "Traffic quality, not content, explains conversion.",
      likelihood: 0.45,
      confidence: 0.5,
      estimatedRisk: "medium",
      status: "active",
      createdBy: "owner-a",
      createdAt,
    },
  ];
  const recommendation = assembleRecommendation({
    belief,
    supportingEvidence: [evidence],
    counterEvidence: [],
    alternativeHypotheses: hypotheses,
    assumptions: belief.assumptions,
    uncertainty: belief.missingEvidence,
    whatWouldChange: belief.whatWouldChange,
  });
  const posterior = posteriorBelief({
    belief: recommendation.belief,
    outcome: {
      posteriorConfidence: 0.7,
      observedResult: "Conversion was higher during the observation window.",
      evidenceGrade: "controlled",
    },
    changedBy: "analyst-a",
    changedAt: "2026-08-16T12:00:00.000Z",
  });
  assert.equal(posterior.version, 2);
  assert.equal(posterior.confidence, 0.7);
  assert.equal(recommendation.alternativeHypotheses.length, 2);
  assert.equal(recommendation.supportingEvidence[0].id, "evidence-a");
  assert.deepEqual(calibrationSummary([{ confidence: 0.7, succeeded: true }]), {
    count: 1,
    meanConfidence: 0.7,
    successRate: 1,
    brierScore: 0.09000000000000002,
  });
});

test("organization boundary rejects cross-tenant decision access", () => {
  assert.throws(
    () =>
      requireOrganizationScope(
        { organizationId: "org-a" },
        "org-b",
      ),
    OrganizationScopeError,
  );
});

test("Atlas pilot prediction becomes measurable learning without fabricating provider execution", () => {
  const pilot = createAtlasTitlePilot({ workflow: "atlas_title_optimization", currentTitle: "A", proposedTitle: "A verified attribute", productReference: "atlas-fixture", metric: "conversion_rate", baseline: 0.1, minimumLift: 0.01, observationDays: 14 });
  const resolved = { confidence: 0.65, succeeded: true, posteriorConfidence: 0.74, predictedAt: "2026-08-02T00:00:00.000Z", resolvedAt: "2026-08-16T00:00:00.000Z" };
  const metrics = calculateCalibration([resolved]);
  assert.equal(metrics.decisionSuccessRate, 1);
  assert.equal(classifyPredictionQuality(resolved.confidence, resolved.succeeded).classificationCorrect, true);
  assert.equal(pilot.successCriteria[0].value, 0.11);
  assert.match(pilot.executionBoundary, /separate authenticated action/);
});

test("Oracle planning cycle keeps planner models independent through a governed option", () => {
  const product = { sku: "INTEGRATION-SKU", asin: "B0INTEGRATION", productGroup: "Lic Kids" };
  const signals: OracleDemandSignal[] = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 6, 1 + index * 7)).toISOString();
    return [
      { id: `sales-${index}`, organizationId: "org-a", decisionCaseId: "case-a", product, metric: "sales_units" as const, value: 100, unit: "count", periodStart: date, periodEnd: date, observedAt: date, source: "normalized evidence", freshness: "current" as const, confidence: 0.9, demandCensored: false },
      { id: `orders-${index}`, organizationId: "org-a", decisionCaseId: "case-a", product, metric: "order_units" as const, value: 180, unit: "count", periodStart: date, periodEnd: date, observedAt: date, source: "normalized evidence", freshness: "current" as const, confidence: 0.9, demandCensored: false },
    ];
  }).flat();
  const michael = calculateMichaelForecast({ product, signals, horizonWeeks: 8, lifecycleState: "STABLE" });
  const oracle = calculateOracleForecast({ product, signals, horizonWeeks: 8, lifecycleState: "STABLE" });
  const comparison = compareForecasts({ michael, oracle, waitCost: 10, errorCostPerUnit: 2 });
  const position = calculateInventoryPosition({ product, forecast: oracle, buckets: { amazonOnHand: 200, amazonOnOrder: 100, awcOnHand: 400, dfAvailable: 0, transferable: 0, committed: 0, promoCommitted: 0, inbound: 0, protected: 0 } });
  const options = generateReplenishmentOptions({ position, forecast: oracle, latestWeekSales: 100, modelDisagreement: comparison.materiallyDisagrees });
  assert.equal(michael.model, "MichaelModel");
  assert.equal(oracle.model, "OracleModel");
  assert.ok(options.some((option) => option.action === "BUY"));
  assert.ok(options.some((option) => option.action === "DF"));
  assert.ok(comparison.disagreementDrivers.length > 0);
});
