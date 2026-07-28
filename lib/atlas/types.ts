import type {
  EvidenceFreshness,
  EvidenceProviderKey,
} from "../evidence/types";

export const catalogHealthDimensions = [
  "title",
  "images",
  "bullets",
  "description",
  "aPlusContent",
  "variation",
  "searchCoverage",
  "compliance",
  "contentFreshness",
] as const;

export type CatalogHealthDimension =
  (typeof catalogHealthDimensions)[number];

export type AtlasConfidence = {
  score: number;
  level: "low" | "medium" | "high";
  explanation: string;
};

export type AtlasEvidenceReference = {
  id: string;
  sourceId: string;
  sourceName: string;
  provider: EvidenceProviderKey;
  dataset: "catalog" | "compliance";
  kind: string;
  title: string;
  observedAt: string;
  freshness: EvidenceFreshness;
  sourceRecordReference: string;
  limitations: string[];
};

export type CatalogComponentScore =
  | {
      dimension: CatalogHealthDimension;
      status: "scored";
      score: number;
      confidence: AtlasConfidence;
      explanation: string;
      evidenceReferences: string[];
      assumptions: string[];
      unavailableEvidence: [];
    }
  | {
      dimension: CatalogHealthDimension;
      status: "unavailable";
      score: null;
      confidence: AtlasConfidence;
      explanation: string;
      evidenceReferences: [];
      assumptions: string[];
      unavailableEvidence: string[];
    };

export type CatalogHealthScore = {
  overallScore: number | null;
  status: "available" | "partial" | "unavailable";
  explanation: string;
  confidence: AtlasConfidence;
  scoredDimensions: number;
  totalDimensions: number;
  components: Record<CatalogHealthDimension, CatalogComponentScore>;
};

export type CatalogFinding = {
  id: string;
  dimension: CatalogHealthDimension;
  type: "quality_gap" | "evidence_gap";
  severity: "critical" | "high" | "medium" | "informational";
  title: string;
  description: string;
  whyItMatters: string;
  confidence: AtlasConfidence;
  evidenceReferences: string[];
  assumptions: string[];
  unavailableEvidence: string[];
};

export type ExpectedImpact = {
  type: "qualitative" | "unavailable";
  description: string;
  basis: string;
};

export type OptimizationRecommendation = {
  id: string;
  findingId: string;
  dimension: CatalogHealthDimension;
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  expectedImpact: ExpectedImpact;
  confidence: AtlasConfidence;
  supportingEvidence: string[];
  requiredEvidence: string[];
  assumptions: string[];
  status: "proposed";
};

export type CatalogOpportunity = {
  id: string;
  recommendationId: string;
  title: string;
  potentialImpact: ExpectedImpact;
  confidence: AtlasConfidence;
  requiredEvidence: string[];
  blockingFactors: string[];
};

export type ImprovementPlanAction = {
  id: string;
  recommendationId: string;
  title: string;
  priority: OptimizationRecommendation["priority"];
  supportingEvidence: string[];
  requiresApproval: boolean;
};

export type ImprovementPlan = {
  id: string;
  status: "ready_for_review" | "unavailable";
  summary: string;
  actions: ImprovementPlanAction[];
  requiresApproval: boolean;
  approvalPolicyVersion: string;
  approvalReason?: string;
  assumptions: string[];
  unavailableEvidence: string[];
};

export type AssessmentSummary = {
  headline: string;
  detail: string;
  scoredDimensions: number;
  findingCount: number;
  recommendationCount: number;
  opportunityCount: number;
};

export type CatalogAssessment = {
  id: string;
  organizationId: string;
  status: "available" | "partial" | "unavailable";
  assessedAt: string;
  scope: {
    accountIds: string[];
    marketplaces: string[];
    productReferences: string[];
  };
  confidence: AtlasConfidence;
  freshness: EvidenceFreshness;
  evidenceReferences: AtlasEvidenceReference[];
  assumptions: string[];
  unavailableEvidence: string[];
  health: CatalogHealthScore;
  findings: CatalogFinding[];
  recommendations: OptimizationRecommendation[];
  opportunities: CatalogOpportunity[];
  improvementPlan: ImprovementPlan;
  summary: AssessmentSummary;
};

export type AtlasPlanPolicy = {
  required: boolean;
  version: string;
  reason?: string;
};
