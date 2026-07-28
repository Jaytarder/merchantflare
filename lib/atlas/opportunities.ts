import { confidence, stableAtlasId } from "./evidence";
import type {
  CatalogOpportunity,
  OptimizationRecommendation,
} from "./types";

export function identifyCatalogOpportunities(input: {
  recommendations: OptimizationRecommendation[];
  evidenceCoverage: number;
  unavailableEvidence: string[];
}): CatalogOpportunity[] {
  const coverage = Math.min(Math.max(input.evidenceCoverage, 0), 1);
  return input.recommendations.map((recommendation) => {
    const score = recommendation.confidence.score * coverage;
    const blockingFactors = [
      ...(coverage < 1
        ? [
            `Assessment evidence covers ${Math.round(coverage * 100)}% of health dimensions.`,
          ]
        : []),
      ...input.unavailableEvidence.slice(0, 5),
    ];
    return {
      id: stableAtlasId("opportunity", [recommendation.id]),
      recommendationId: recommendation.id,
      title: recommendation.title,
      potentialImpact: recommendation.expectedImpact,
      confidence: confidence(
        score,
        blockingFactors.length
          ? "Opportunity confidence is reduced because assessment evidence is incomplete."
          : "Opportunity confidence inherits the recommendation evidence confidence.",
      ),
      requiredEvidence: recommendation.requiredEvidence,
      blockingFactors,
    };
  });
}
