import type { NormalizedEvidenceRecord } from "../evidence";
import type { OrchestrationResult } from "../mercury/types";
import { assessDemandEvidence } from "./service";

export function isOraclePlan(result: OrchestrationResult) {
  return result.plan.tasks.some((task) => task.capability === "inventory.forecast" || task.capability === "inventory.protect");
}

export function enrichOrchestrationWithOracle(input: {
  result: OrchestrationResult;
  organizationId: string;
  evidence: NormalizedEvidenceRecord[];
}): OrchestrationResult {
  if (!isOraclePlan(input.result)) return input.result;
  return {
    ...input.result,
    plan: {
      ...input.result.plan,
      oracleAssessment: assessDemandEvidence(input.organizationId, input.evidence, input.result.plan.createdAt),
    },
  };
}
