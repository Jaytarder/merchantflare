export const evidenceGrades = [
  "observed",
  "correlated",
  "controlled",
  "quasi_causal",
  "experimental",
  "replicated",
] as const;

export type EvidenceGrade = (typeof evidenceGrades)[number];
export type EvidenceFreshness = "current" | "delayed" | "stale" | "unavailable";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type DecisionCaseStatus = "draft" | "investigating" | "proposed" | "approved" | "running" | "measuring" | "closed" | "archived";
export type ApprovalStatus = "not_required" | "pending" | "approved" | "rejected";

export type DecisionCase = {
  id: string;
  organizationId: string;
  createdBy: string;
  title: string;
  problem: string;
  objective: string;
  status: DecisionCaseStatus;
  currentBeliefId?: string;
  risk: RiskLevel;
  reversibility: "easy" | "moderate" | "difficult" | "irreversible" | "unknown";
  approvalStatus: ApprovalStatus;
  assumptions: string[];
  confounders: string[];
  expectedOutcome?: string;
  mercuryConversationId?: string;
  mercuryPlanId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type Evidence = {
  id: string;
  organizationId: string;
  decisionCaseId: string;
  source: string;
  sourceReference?: string;
  statement: string;
  observedAt: string;
  freshness: EvidenceFreshness;
  ownerId: string;
  confidence: number;
  grade: EvidenceGrade;
  relationships: string[];
  supportingReferences: string[];
  limitations: string[];
  mercuryEvidenceItemId?: string;
  createdAt: string;
};

export type EvidenceLink = {
  organizationId: string;
  evidenceId: string;
  entityType: "belief" | "hypothesis" | "experiment" | "outcome";
  entityId: string;
  relationship: "supports" | "counters" | "informs" | "confounds";
  rationale?: string;
  createdBy: string;
  createdAt: string;
};

export type Belief = {
  id: string;
  organizationId: string;
  decisionCaseId: string;
  statement: string;
  confidence: number;
  missingEvidence: string[];
  assumptions: string[];
  whatWouldChange: string;
  ownerId: string;
  version: number;
  status: "active" | "superseded" | "retired";
  createdAt: string;
  updatedAt: string;
};

export type Hypothesis = {
  id: string;
  organizationId: string;
  decisionCaseId: string;
  statement: string;
  likelihood: number;
  confidence: number;
  expectedValue?: number;
  estimatedRisk: RiskLevel;
  suggestedExperiment?: string;
  status: "active" | "supported" | "weakened" | "rejected" | "inconclusive";
  createdBy: string;
  createdAt: string;
};

export type Experiment = {
  id: string;
  organizationId: string;
  decisionCaseId: string;
  hypothesisId: string;
  title: string;
  expectedLift?: number;
  expectedRisk: RiskLevel;
  observationWindow: { startsAt?: string; endsAt?: string; durationDays?: number };
  rollbackPlan: string;
  successCriteria: Array<{ metric: string; operator: "gte" | "lte"; value: number; unit?: string }>;
  approvalStatus: ApprovalStatus;
  status: "draft" | "awaiting_approval" | "approved" | "running" | "completed" | "cancelled" | "failed";
  executionTime?: string;
  createdBy: string;
  createdAt: string;
};

export type Intervention = {
  id: string;
  organizationId: string;
  experimentId: string;
  description: string;
  exactIntent: Record<string, unknown>;
  reversibility: "easy" | "moderate" | "difficult" | "irreversible";
  rollbackPlan: string;
  status: "proposed" | "approved" | "executed" | "rolled_back" | "failed";
  createdBy: string;
  executedBy?: string;
  executedAt?: string;
  createdAt: string;
};

export type Outcome = {
  id: string;
  organizationId: string;
  decisionCaseId: string;
  experimentId: string;
  observedResult: string;
  evidenceGrade: EvidenceGrade;
  measuredImpact: Record<string, unknown>;
  unexpectedEffects: string[];
  posteriorConfidence: number;
  updatedBeliefId?: string;
  observedAt: string;
  recordedBy: string;
  createdAt: string;
};

export type Lesson = {
  id: string;
  organizationId: string;
  decisionCaseId: string;
  outcomeId: string;
  statement: string;
  applicability: string[];
  limitations: string[];
  confidence: number;
  createdBy: string;
  createdAt: string;
};

export type DecisionHistoryEvent = {
  id: string;
  organizationId: string;
  decisionCaseId: string;
  actorId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
};

export type DecisionCaseDetail = DecisionCase & {
  evidence: Evidence[];
  evidenceLinks: EvidenceLink[];
  beliefs: Belief[];
  hypotheses: Hypothesis[];
  experiments: Experiment[];
  interventions: Intervention[];
  outcomes: Outcome[];
  lessons: Lesson[];
};

export type RecommendationBelief = Belief & {
  supportingEvidence: Evidence[];
  counterEvidence: Evidence[];
  alternativeHypotheses: Hypothesis[];
};

export type CounterEvidence = {
  evidence: Evidence;
  entityType: "belief" | "hypothesis" | "experiment" | "outcome";
  entityId: string;
  relationship: "counters" | "confounds";
  rationale?: string;
};
