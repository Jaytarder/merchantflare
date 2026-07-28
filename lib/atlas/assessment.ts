import type { EvidenceFreshness, NormalizedEvidenceRecord } from "../evidence";
import {
  atlasEvidence,
  confidence,
  evidenceReference,
  productReferences,
  stableAtlasId,
} from "./evidence";
import { deriveCatalogFindings } from "./findings";
import { scoreCatalogHealth } from "./health";
import { identifyCatalogOpportunities } from "./opportunities";
import { createImprovementPlan } from "./planning";
import { generateCatalogRecommendations } from "./recommendations";
import type {
  AtlasPlanPolicy,
  CatalogAssessment,
  CatalogHealthDimension,
} from "./types";

const freshnessOrder: Record<EvidenceFreshness, number> = {
  current: 0,
  delayed: 1,
  stale: 2,
  unavailable: 3,
};

function assessmentFreshness(
  records: NormalizedEvidenceRecord[],
): EvidenceFreshness {
  if (records.length === 0) return "unavailable";
  return records.reduce<EvidenceFreshness>(
    (worst, record) =>
      freshnessOrder[record.freshness] > freshnessOrder[worst]
        ? record.freshness
        : worst,
    "current",
  );
}

function unavailableEvidence(
  health: CatalogAssessment["health"],
) {
  return Object.values(health.components).flatMap((component) =>
    component.status === "unavailable"
      ? component.unavailableEvidence
      : [],
  );
}

export function assessCatalog(input: {
  organizationId: string;
  records: NormalizedEvidenceRecord[];
  policy: AtlasPlanPolicy;
  assessedAt?: string;
  assessmentKey?: string;
}): CatalogAssessment {
  const assessedAt = input.assessedAt ?? new Date().toISOString();
  const records = atlasEvidence(input.organizationId, input.records);
  const fingerprint =
    input.assessmentKey ??
    records
      .map((record) => `${record.id}:${record.provenance.contentHash}`)
      .sort()
      .join(",");
  const id = stableAtlasId("atlas_assessment", [
    input.organizationId,
    fingerprint || "no-evidence",
  ]);
  const health = scoreCatalogHealth(records);
  const missing = [...new Set(unavailableEvidence(health))];
  const findings = deriveCatalogFindings(health);
  const recommendations = generateCatalogRecommendations(findings);
  const coverage = health.scoredDimensions / health.totalDimensions;
  const opportunities = identifyCatalogOpportunities({
    recommendations,
    evidenceCoverage: coverage,
    unavailableEvidence: missing,
  });
  const improvementPlan = createImprovementPlan({
    assessmentId: id,
    recommendations,
    unavailableEvidence: missing,
    policy: input.policy,
  });
  const references = records.map(evidenceReference);
  const status = health.status;
  const confidenceScore =
    health.confidence.score *
    (records.length > 0 ? 1 : 0);
  const accountIds = [
    ...new Set(
      records.flatMap((record) =>
        record.accountId ? [record.accountId] : [],
      ),
    ),
  ].sort();
  const marketplaces = [
    ...new Set(
      records.flatMap((record) =>
        record.marketplace ? [record.marketplace] : [],
      ),
    ),
  ].sort();
  const qualityFindingCount = findings.filter(
    (finding) => finding.type === "quality_gap",
  ).length;

  return {
    id,
    organizationId: input.organizationId,
    status,
    assessedAt,
    scope: {
      accountIds,
      marketplaces,
      productReferences: productReferences(records),
    },
    confidence: confidence(
      confidenceScore,
      records.length === 0
        ? "No normalized catalog or compliance evidence was available, so Atlas confidence is zero."
        : health.confidence.explanation,
    ),
    freshness: assessmentFreshness(records),
    evidenceReferences: references,
    assumptions: [
      "Scores describe only the normalized evidence currently in scope.",
      "Unavailable dimensions are excluded from the overall score.",
      "Projected impact is qualitative until a baseline and measurement method exist.",
    ],
    unavailableEvidence: missing,
    health,
    findings,
    recommendations,
    opportunities,
    improvementPlan,
    summary: {
      headline:
        status === "unavailable"
          ? "Catalog assessment unavailable"
          : status === "partial"
            ? "Partial catalog assessment"
            : "Catalog assessment complete",
      detail:
        status === "unavailable"
          ? "Atlas found no supported normalized evidence and did not infer catalog quality."
          : `${health.scoredDimensions} of ${health.totalDimensions} health dimensions were scored, producing ${qualityFindingCount} evidence-backed ${qualityFindingCount === 1 ? "finding" : "findings"}.`,
      scoredDimensions: health.scoredDimensions,
      findingCount: findings.length,
      recommendationCount: recommendations.length,
      opportunityCount: opportunities.length,
    },
  };
}

export function unavailableDimensions(
  assessment: CatalogAssessment,
): CatalogHealthDimension[] {
  return Object.entries(assessment.health.components).flatMap(
    ([dimension, component]) =>
      component.status === "unavailable"
        ? [dimension as CatalogHealthDimension]
        : [],
  );
}
