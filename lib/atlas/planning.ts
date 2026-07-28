import { stableAtlasId } from "./evidence";
import type {
  AtlasPlanPolicy,
  ImprovementPlan,
  OptimizationRecommendation,
} from "./types";

export function createImprovementPlan(input: {
  assessmentId: string;
  recommendations: OptimizationRecommendation[];
  unavailableEvidence: string[];
  policy: AtlasPlanPolicy;
}): ImprovementPlan {
  const actions = input.recommendations.map((recommendation) => ({
    id: stableAtlasId("atlas_action", [
      input.assessmentId,
      recommendation.id,
    ]),
    recommendationId: recommendation.id,
    title: recommendation.title,
    priority: recommendation.priority,
    supportingEvidence: recommendation.supportingEvidence,
    requiresApproval: input.policy.required,
  }));
  return {
    id: stableAtlasId("improvement_plan", [input.assessmentId]),
    status: actions.length > 0 ? "ready_for_review" : "unavailable",
    summary:
      actions.length > 0
        ? `${actions.length} evidence-backed catalog ${actions.length === 1 ? "action is" : "actions are"} ready for review. Approval does not execute or publish a change.`
        : "No improvement actions were generated because Atlas found no evidence-backed quality gap. This does not establish that the catalog is healthy.",
    actions,
    requiresApproval: actions.length > 0 && input.policy.required,
    approvalPolicyVersion: input.policy.version,
    approvalReason:
      actions.length > 0 && input.policy.required
        ? input.policy.reason
        : undefined,
    assumptions: [
      "Recommendations remain proposals until their required evidence and exact field-level changes are reviewed.",
      "Approval records authority to proceed with a future execution workflow; it does not publish content.",
    ],
    unavailableEvidence: input.unavailableEvidence,
  };
}
