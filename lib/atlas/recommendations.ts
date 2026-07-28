import { stableAtlasId } from "./evidence";
import type {
  CatalogFinding,
  CatalogHealthDimension,
  OptimizationRecommendation,
} from "./types";

const guidance: Record<
  CatalogHealthDimension,
  {
    title: string;
    description: string;
    impact: string;
    requiredEvidence: string[];
  }
> = {
  title: {
    title: "Review title structure",
    description:
      "Review the evidenced title against approved product facts, marketplace requirements, and priority shopper language before proposing a field-level change.",
    impact:
      "A clearer, policy-compatible title may improve product comprehension and discoverability.",
    requiredEvidence: [
      "Current normalized title",
      "Approved product facts",
      "Applicable marketplace title requirements",
    ],
  },
  images: {
    title: "Close image coverage gaps",
    description:
      "Define the missing image roles and verify approved product claims before creating or publishing assets.",
    impact:
      "More complete image coverage may reduce product-understanding friction.",
    requiredEvidence: [
      "Current normalized image inventory",
      "Approved product facts",
      "Applicable marketplace image requirements",
    ],
  },
  bullets: {
    title: "Review bullet coverage",
    description:
      "Map evidenced bullet gaps to approved product facts and shopper questions before drafting changes.",
    impact:
      "More complete bullet coverage may improve comprehension of features and purchase considerations.",
    requiredEvidence: [
      "Current normalized bullet content or count",
      "Approved product facts",
      "Applicable marketplace bullet requirements",
    ],
  },
  description: {
    title: "Add or review product description",
    description:
      "Prepare description content only from approved facts and after confirming channel requirements.",
    impact:
      "Description coverage may improve product context where shorter fields are insufficient.",
    requiredEvidence: [
      "Current normalized description state",
      "Approved product facts",
      "Applicable marketplace description requirements",
    ],
  },
  aPlusContent: {
    title: "Evaluate enhanced-content coverage",
    description:
      "Confirm eligibility, approved claims, and asset requirements before proposing enhanced content.",
    impact:
      "Eligible enhanced content may improve product education.",
    requiredEvidence: [
      "Current normalized A+ content state",
      "Marketplace eligibility",
      "Approved brand and product claims",
    ],
  },
  variation: {
    title: "Resolve variation integrity",
    description:
      "Review the evidenced variation issue against product identifiers and marketplace relationship rules before proposing a correction.",
    impact:
      "Correct variation relationships may improve product navigation and catalog integrity.",
    requiredEvidence: [
      "Normalized parent-child relationships",
      "Stable product identifiers",
      "Applicable marketplace variation rules",
    ],
  },
  searchCoverage: {
    title: "Address evidenced search-coverage gaps",
    description:
      "Use only authorized normalized query evidence to prioritize relevant terms, then verify every proposed term against approved product facts.",
    impact:
      "Closing evidenced query gaps may improve discoverability for relevant searches.",
    requiredEvidence: [
      "Normalized search-coverage observations",
      "Authorized query evidence",
      "Approved product facts",
    ],
  },
  compliance: {
    title: "Resolve catalog compliance blockers",
    description:
      "Review the exact normalized issue evidence and required documentation before preparing any remediation.",
    impact:
      "Resolving confirmed compliance blockers may protect catalog availability.",
    requiredEvidence: [
      "Normalized compliance issue and status",
      "Provider requirement reference",
      "Required supporting documentation",
    ],
  },
  contentFreshness: {
    title: "Refresh catalog evidence",
    description:
      "Refresh the authorized normalized catalog source before relying on this assessment for content decisions.",
    impact:
      "Fresher evidence can increase decision confidence; no catalog impact is estimated until refreshed.",
    requiredEvidence: ["Current normalized catalog evidence"],
  },
};

function priority(
  severity: CatalogFinding["severity"],
): OptimizationRecommendation["priority"] {
  if (severity === "critical") return "critical";
  if (severity === "high") return "high";
  if (severity === "medium") return "medium";
  return "low";
}

export function generateCatalogRecommendations(
  findings: CatalogFinding[],
): OptimizationRecommendation[] {
  return findings
    .filter(
      (finding) =>
        finding.type === "quality_gap" &&
        finding.evidenceReferences.length > 0,
    )
    .map((finding) => {
      const rule = guidance[finding.dimension];
      return {
        id: stableAtlasId("recommendation", [
          finding.id,
          ...finding.evidenceReferences,
        ]),
        findingId: finding.id,
        dimension: finding.dimension,
        title: rule.title,
        description: rule.description,
        priority: priority(finding.severity),
        expectedImpact: {
          type: "qualitative",
          description: rule.impact,
          basis:
            "Projected direction only; no numeric lift is claimed without outcome evidence and a measurement method.",
        },
        confidence: finding.confidence,
        supportingEvidence: finding.evidenceReferences,
        requiredEvidence: rule.requiredEvidence,
        assumptions: finding.assumptions,
        status: "proposed",
      };
    });
}
