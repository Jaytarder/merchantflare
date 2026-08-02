import test from "node:test";
import assert from "node:assert/strict";
import {
  assembleRecommendation,
  calibrationSummary,
  posteriorBelief,
  type Belief,
  type Evidence,
  type Hypothesis,
} from "../lib/decision";
import {
  OrganizationScopeError,
  requireOrganizationScope,
} from "../lib/platform/authorization";

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
