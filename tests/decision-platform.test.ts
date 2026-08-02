import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  assembleRecommendation,
  calibrationSummary,
  classifyOutcomeClaim,
  posteriorBelief,
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
