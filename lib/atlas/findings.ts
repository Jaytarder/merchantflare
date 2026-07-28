import { stableAtlasId } from "./evidence";
import {
  catalogHealthDimensions,
  type CatalogFinding,
  type CatalogHealthDimension,
  type CatalogHealthScore,
} from "./types";

const dimensionLabels: Record<CatalogHealthDimension, string> = {
  title: "Title",
  images: "Images",
  bullets: "Bullets",
  description: "Description",
  aPlusContent: "A+ content",
  variation: "Variation integrity",
  searchCoverage: "Search coverage",
  compliance: "Compliance",
  contentFreshness: "Content freshness",
};

const whyItMatters: Record<CatalogHealthDimension, string> = {
  title:
    "Title structure affects shopper comprehension and can constrain discoverability.",
  images:
    "Image coverage affects how completely shoppers can understand the product.",
  bullets:
    "Bullet coverage supports concise communication of features and purchase considerations.",
  description:
    "Description coverage provides space for product context not carried by shorter fields.",
  aPlusContent:
    "Enhanced content can provide additional structured product education when supported.",
  variation:
    "Variation integrity affects product relationships and shopper navigation.",
  searchCoverage:
    "Search coverage indicates how much of the explicitly measured query opportunity is represented.",
  compliance:
    "Unresolved compliance evidence can block or constrain catalog availability.",
  contentFreshness:
    "Stale content evidence reduces confidence that the assessment reflects the current catalog.",
};

function severityForScore(score: number): CatalogFinding["severity"] {
  if (score < 30) return "critical";
  if (score < 50) return "high";
  if (score < 80) return "medium";
  return "informational";
}

export function deriveCatalogFindings(
  health: CatalogHealthScore,
): CatalogFinding[] {
  const findings: CatalogFinding[] = [];
  for (const dimension of catalogHealthDimensions) {
    const component = health.components[dimension];
    const label = dimensionLabels[dimension];
    if (component.status === "unavailable") {
      findings.push({
          id: stableAtlasId("finding", [dimension, "evidence-gap"]),
          dimension,
          type: "evidence_gap" as const,
          severity: "informational" as const,
          title: `${label} evidence unavailable`,
          description: component.explanation,
          whyItMatters:
            "Atlas excludes unavailable dimensions so missing evidence cannot be mistaken for poor catalog quality.",
          confidence: component.confidence,
          evidenceReferences: [],
          assumptions: component.assumptions,
          unavailableEvidence: component.unavailableEvidence,
        });
      continue;
    }
    if (component.score >= 80) continue;
    findings.push({
        id: stableAtlasId("finding", [
          dimension,
          component.score.toString(),
          ...component.evidenceReferences,
        ]),
        dimension,
        type: "quality_gap" as const,
        severity: severityForScore(component.score),
        title: `${label} needs review`,
        description: component.explanation,
        whyItMatters: whyItMatters[dimension],
        confidence: component.confidence,
        evidenceReferences: component.evidenceReferences,
        assumptions: component.assumptions,
        unavailableEvidence: [],
      });
  }
  return findings;
}
