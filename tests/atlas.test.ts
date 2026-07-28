import assert from "node:assert/strict";
import test from "node:test";
import {
  assessCatalog,
  enrichOrchestrationWithAtlas,
  routeCatalogQuestion,
} from "../lib/atlas";
import type { NormalizedEvidenceRecord } from "../lib/evidence";
import { orchestrate } from "../lib/mercury/orchestrator";
import { OrganizationScopeError } from "../lib/platform";

const policy = {
  required: true,
  version: "test-policy",
  reason: "Customer-facing catalog content requires approval.",
};

function evidence(
  overrides: Partial<NormalizedEvidenceRecord> = {},
): NormalizedEvidenceRecord {
  const observedAt = "2026-07-28T12:00:00.000Z";
  return {
    id: "evidence_catalog_1",
    organizationId: "org_a",
    sourceId: "source_1",
    sourceName: "Authorized catalog source",
    provider: "normalized-test-provider",
    dataset: "catalog",
    kind: "catalog.content",
    sourceRecordReference: "product-1",
    title: "Catalog content",
    summary: "Normalized catalog content fixture.",
    value: {
      type: "attributes",
      attributes: {
        title: "Short title",
        imageCount: 2,
        bulletCount: 1,
        descriptionPresent: false,
        aPlusContent: false,
        variationValid: true,
        searchCoveragePercent: 35,
      },
    },
    observedAt,
    ingestedAt: observedAt,
    schemaVersion: "1",
    freshness: "current",
    expiresAt: "2026-07-29T12:00:00.000Z",
    limitations: [],
    provenance: {
      provider: "normalized-test-provider",
      sourceId: "source_1",
      sourceRecordReference: "product-1",
      observedAt,
      ingestedAt: observedAt,
      pipeline: "test-normalizer",
      pipelineVersion: "1",
      transformations: [],
      contentHash: "fixture-hash",
    },
    ...overrides,
  };
}

test("Atlas scores only evidenced dimensions and explains every component", () => {
  const assessment = assessCatalog({
    organizationId: "org_a",
    records: [evidence()],
    policy,
    assessedAt: "2026-07-28T12:00:00.000Z",
  });
  assert.equal(assessment.health.components.title.score, 45);
  assert.equal(assessment.health.components.compliance.status, "unavailable");
  assert.match(assessment.health.explanation, /excluded/i);
  assert.ok(
    Object.values(assessment.health.components).every(
      (component) => component.explanation.length > 0,
    ),
  );
});

test("Atlas does not turn missing evidence into recommendations", () => {
  const assessment = assessCatalog({
    organizationId: "org_a",
    records: [],
    policy,
  });
  assert.equal(assessment.status, "unavailable");
  assert.equal(assessment.recommendations.length, 0);
  assert.equal(assessment.opportunities.length, 0);
  assert.equal(assessment.improvementPlan.status, "unavailable");
});

test("recommendations and opportunities retain evidence and degraded confidence", () => {
  const assessment = assessCatalog({
    organizationId: "org_a",
    records: [evidence({ freshness: "stale" })],
    policy,
  });
  assert.ok(assessment.recommendations.length > 0);
  assert.ok(
    assessment.recommendations.every(
      (recommendation) => recommendation.supportingEvidence.length > 0,
    ),
  );
  assert.ok(
    assessment.opportunities.every(
      (opportunity) => opportunity.confidence.score < 0.5,
    ),
  );
});

test("catalog routing invokes Atlas and approval-compatible plan generation", async () => {
  const initial = await orchestrate("Audit this catalog listing");
  assert.equal(routeCatalogQuestion(initial), "atlas");
  const enriched = enrichOrchestrationWithAtlas({
    result: initial,
    organizationId: "org_a",
    evidence: [evidence()],
  });
  assert.ok(enriched.plan.atlasAssessment);
  assert.ok(
    enriched.plan.tasks.some(
      (task) =>
        task.capability === "catalog.optimize" && task.requiresApproval,
    ),
  );
  assert.equal(enriched.status, "awaiting_approval");
});

test("non-catalog routing leaves plans unchanged", async () => {
  const initial = await orchestrate("Audit advertising campaigns");
  const enriched = enrichOrchestrationWithAtlas({
    result: initial,
    organizationId: "org_a",
    evidence: [evidence()],
  });
  assert.equal(routeCatalogQuestion(initial), null);
  assert.equal(enriched, initial);
});

test("Atlas rejects evidence from another organization", () => {
  assert.throws(
    () =>
      assessCatalog({
        organizationId: "org_b",
        records: [evidence()],
        policy,
      }),
    OrganizationScopeError,
  );
});
