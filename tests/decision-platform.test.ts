import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  assembleRecommendation,
  calibrationSummary,
  classifyOutcomeClaim,
  posteriorBelief,
  calculateCalibration,
  classifyPredictionQuality,
  createAtlasTitlePilot,
  reasonAboutDecision,
  assertLifecycleTransition,
  type Belief,
  type Evidence,
  type Hypothesis,
} from "../lib/decision";
import { PlatformValidationError } from "../lib/platform/errors";
import { hasPermission } from "../lib/platform/authorization";

const timestamp = "2026-08-02T12:00:00.000Z";
const belief: Belief = {
  id: "belief-1",
  organizationId: "org-a",
  decisionCaseId: "case-1",
  statement: "Reducing irrelevant ad spend may improve contribution margin.",
  confidence: 0.6,
  missingEvidence: ["Controlled comparison"],
  assumptions: ["Demand remains stable"],
  whatWouldChange: "A controlled test showing lower contribution margin.",
  ownerId: "user-1",
  version: 1,
  status: "active",
  createdAt: timestamp,
  updatedAt: timestamp,
};

const evidence: Evidence = {
  id: "evidence-1",
  organizationId: "org-a",
  decisionCaseId: "case-1",
  source: "Amazon Ads normalized reader",
  statement: "Irrelevant search terms accounted for 12% of spend.",
  observedAt: timestamp,
  freshness: "current",
  ownerId: "user-1",
  confidence: 0.9,
  grade: "observed",
  relationships: [],
  supportingReferences: ["normalized-record-1"],
  limitations: ["No counterfactual"],
  createdAt: timestamp,
};

function hypothesis(id: string, statement: string): Hypothesis {
  return {
    id,
    organizationId: "org-a",
    decisionCaseId: "case-1",
    statement,
    likelihood: 0.5,
    confidence: 0.6,
    estimatedRisk: "medium",
    status: "active",
    createdBy: "user-1",
    createdAt: timestamp,
  };
}

test("recommendations require evidence and competing hypotheses", () => {
  assert.throws(
    () =>
      assembleRecommendation({
        belief,
        supportingEvidence: [evidence],
        counterEvidence: [],
        alternativeHypotheses: [hypothesis("hypothesis-1", "Targeting is the cause.")],
        assumptions: belief.assumptions,
        uncertainty: belief.missingEvidence,
        whatWouldChange: belief.whatWouldChange,
      }),
    PlatformValidationError,
  );
  assert.doesNotThrow(() =>
    assembleRecommendation({
      belief,
      supportingEvidence: [evidence],
      counterEvidence: [],
      alternativeHypotheses: [
        hypothesis("hypothesis-1", "Targeting is the main driver."),
        hypothesis("hypothesis-2", "Attribution lag explains the observation."),
      ],
      assumptions: belief.assumptions,
      uncertainty: belief.missingEvidence,
      whatWouldChange: belief.whatWouldChange,
    }),
  );
});

test("causal language is rejected for observed or correlated outcomes", () => {
  assert.throws(
    () =>
      classifyOutcomeClaim(
        "correlated",
        "The intervention caused conversion to increase.",
      ),
    PlatformValidationError,
  );
  assert.equal(
    classifyOutcomeClaim(
      "experimental",
      "The controlled intervention caused conversion to increase.",
    ),
    "The controlled intervention caused conversion to increase.",
  );
});

test("outcomes produce versioned posterior beliefs without erasing uncertainty", () => {
  const updated = posteriorBelief({
    belief,
    outcome: {
      posteriorConfidence: 0.72,
      observedResult: "Contribution margin increased during the window.",
      evidenceGrade: "correlated",
    },
    changedBy: "user-2",
    changedAt: "2026-08-03T12:00:00.000Z",
  });
  assert.equal(updated.version, 2);
  assert.equal(updated.confidence, 0.72);
  assert.ok(updated.missingEvidence.includes("Stronger causal evidence is still required."));
  assert.equal(belief.version, 1);
});

test("calibration summary measures confidence against predefined outcomes", () => {
  const summary = calibrationSummary([
    { confidence: 0.8, succeeded: true },
    { confidence: 0.8, succeeded: true },
    { confidence: 0.8, succeeded: false },
    { confidence: 0.8, succeeded: true },
  ]);
  assert.equal(summary.count, 4);
  assert.equal(summary.meanConfidence, 0.8);
  assert.equal(summary.successRate, 0.75);
  assert.ok(summary.brierScore > 0);
});

test("Decision Platform RBAC preserves read, write, approval, and measurement boundaries", () => {
  assert.equal(hasPermission({ role: "viewer" }, "decisions.read"), true);
  assert.equal(hasPermission({ role: "viewer" }, "decisions.write"), false);
  assert.equal(hasPermission({ role: "analyst" }, "decisions.measure"), true);
  assert.equal(hasPermission({ role: "analyst" }, "decisions.approve"), false);
  assert.equal(hasPermission({ role: "manager" }, "decisions.approve"), true);
});

test("migration 007 is additive, organization-scoped, and makes history immutable", async () => {
  const sql = await readFile(
    resolve("db/migrations/007_scientific_decision_platform.sql"),
    "utf8",
  );
  assert.match(sql, /create table if not exists decision_cases/);
  assert.match(sql, /references platform_organizations\(id\) on delete restrict/g);
  assert.match(sql, /decision history is append-only/);
  assert.doesNotMatch(sql, /\bdrop table\b|\btruncate\b/i);
});

test("calibration engine reports bins, accuracy, drift, and Brier score", () => {
  const metrics = calculateCalibration([
    { confidence: 0.8, succeeded: true, posteriorConfidence: 0.9, predictedAt: timestamp, resolvedAt: timestamp },
    { confidence: 0.8, succeeded: false, posteriorConfidence: 0.4, predictedAt: timestamp, resolvedAt: timestamp },
    { confidence: 0.2, succeeded: false, posteriorConfidence: 0.1, predictedAt: timestamp, resolvedAt: timestamp },
  ]);
  assert.equal(metrics.count, 3);
  assert.equal(metrics.curve.length, 2);
  assert.equal(metrics.predictionAccuracy, 2 / 3);
  assert.ok(metrics.brierScore !== null && metrics.brierScore > 0);
  assert.equal(classifyPredictionQuality(0.9, true).quality, "well_calibrated");
});

test("lifecycle rejects skipped states and Atlas pilot preserves exact rollback", () => {
  assert.doesNotThrow(() => assertLifecycleTransition("draft", "investigating"));
  assert.throws(() => assertLifecycleTransition("draft", "running"), PlatformValidationError);
  const pilot = createAtlasTitlePilot({
    workflow: "atlas_title_optimization", currentTitle: "Original verified title", proposedTitle: "Verified title with attribute",
    productReference: "ASIN-TEST", metric: "conversion_rate", baseline: 0.1, minimumLift: 0.01, observationDays: 14,
  });
  assert.deepEqual(pilot.exactIntent, { productReference: "ASIN-TEST", field: "title", from: "Original verified title", to: "Verified title with attribute" });
  assert.match(pilot.rollbackPlan, /Original verified title/);
  assert.match(pilot.executionBoundary, /do not publish/);
});

test("migration 008 is additive, tenant-scoped, immutable, and concurrency-safe", async () => {
  const sql = await readFile(resolve("db/migrations/008_decision_learning_engine.sql"), "utf8");
  assert.match(sql, /decision_predictions/);
  assert.match(sql, /unique \(organization_id, experiment_id\)/);
  assert.match(sql, /unique \(organization_id, idempotency_key\)/);
  assert.match(sql, /resolved predictions are immutable/);
  assert.match(sql, /foreign key \(decision_case_id, organization_id\)/);
  assert.doesNotMatch(sql, /\bdrop table\b|\btruncate\b/i);
});

test("Scientific Reasoning Engine exposes every score component and challenges weak conclusions", () => {
  const detail = {
    id: "case-reasoning", organizationId: "org-a", createdBy: "user-1", title: "Title test",
    problem: "Conversion is below the predefined baseline.", objective: "Reduce uncertainty about title clarity.", status: "investigating" as const,
    currentBeliefId: belief.id, risk: "low" as const, reversibility: "easy" as const, approvalStatus: "pending" as const,
    assumptions: ["Traffic remains comparable"], confounders: ["Traffic mix"], expectedOutcome: "Measured lift", metadata: {},
    createdAt: timestamp, updatedAt: timestamp,
    evidence: [evidence, { ...evidence, id: "evidence-counter", statement: "Comparable products did not improve after title edits.", confidence: 0.7 }],
    evidenceLinks: [
      { organizationId: "org-a", evidenceId: evidence.id, entityType: "belief" as const, entityId: belief.id, relationship: "supports" as const, createdBy: "user-1", createdAt: timestamp },
      { organizationId: "org-a", evidenceId: "evidence-counter", entityType: "belief" as const, entityId: belief.id, relationship: "counters" as const, createdBy: "user-1", createdAt: timestamp },
    ],
    beliefs: [belief], hypotheses: [hypothesis("hypothesis-a", "Title clarity matters."), hypothesis("hypothesis-b", "Traffic quality matters.")],
    experiments: [{ id: "experiment-a", organizationId: "org-a", decisionCaseId: "case-reasoning", hypothesisId: "hypothesis-a", title: "Controlled title test", expectedLift: 0.1, expectedRisk: "low" as const, observationWindow: { durationDays: 14 }, rollbackPlan: "Restore original title", successCriteria: [{ metric: "conversion", operator: "gte" as const, value: 0.11 }], approvalStatus: "pending" as const, status: "awaiting_approval" as const, createdBy: "user-1", createdAt: timestamp }],
    interventions: [], outcomes: [], lessons: [], reusedLessons: [],
  };
  const reasoning = reasonAboutDecision(detail, new Date(timestamp));
  assert.equal(reasoning.supportingEvidence.length, 1);
  assert.equal(reasoning.contradictoryEvidence.length, 1);
  assert.equal(reasoning.metrics.contradictionScore, 0.5);
  assert.equal(reasoning.recommendedExperimentId, "experiment-a");
  assert.match(reasoning.formulas.confidence, /stated belief/);
  assert.ok(reasoning.selfCritique.whatContradictsConclusion.includes("evidence-counter"));
});

test("Scientific Reasoning Engine proposes a labeled gap hypothesis without fabricating evidence", () => {
  const detail = {
    id: "case-gap", organizationId: "org-a", createdBy: "user-1", title: "Gap", problem: "Unknown driver", objective: "Reduce uncertainty",
    status: "draft" as const, risk: "medium" as const, reversibility: "unknown" as const, approvalStatus: "not_required" as const,
    assumptions: [], confounders: [], metadata: {}, createdAt: timestamp, updatedAt: timestamp,
    evidence: [], evidenceLinks: [], beliefs: [], hypotheses: [], experiments: [], interventions: [], outcomes: [], lessons: [], reusedLessons: [],
  };
  const reasoning = reasonAboutDecision(detail, new Date(timestamp));
  assert.equal(reasoning.generatedHypotheses.length, 1);
  assert.deepEqual(reasoning.generatedHypotheses[0].supportingEvidence, []);
  assert.match(reasoning.generatedHypotheses[0].provenance, /requires human review/);
  assert.equal(reasoning.metrics.confidence, 0);
  assert.equal(reasoning.metrics.uncertainty, 1);
});

test("migration 009 is additive, organization-scoped, indexed, and immutable", async () => {
  const sql = await readFile(resolve("db/migrations/009_scientific_reasoning_engine.sql"), "utf8");
  assert.match(sql, /decision_belief_graph_edges/);
  assert.match(sql, /decision_reasoning_snapshots/);
  assert.match(sql, /foreign key \(decision_case_id, organization_id\)/);
  assert.match(sql, /scientific reasoning records are append-only/);
  assert.match(sql, /decision_belief_graph_case_idx/);
  assert.doesNotMatch(sql, /\bdrop table\b|\btruncate\b/i);
});
