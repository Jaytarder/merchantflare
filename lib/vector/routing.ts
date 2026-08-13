import type { NormalizedEvidenceRecord } from "../evidence";
import type { OrchestrationResult } from "../mercury/types";
import { assessDemandEvidence } from "../oracle";
import { normalizedAdvertisingSignals } from "./evidence";
import { jointAssessment } from "./engine";
export function isJointPlan(result: OrchestrationResult) { return result.plan.tasks.some((task) => task.capability.startsWith("advertising.") || task.capability.startsWith("inventory.")); }
export function enrichOrchestrationWithJointDecision(input: { result: OrchestrationResult; organizationId: string; evidence: NormalizedEvidenceRecord[] }): OrchestrationResult {
  if (!isJointPlan(input.result)) return input.result;
  const oracle = input.result.plan.oracleAssessment ?? assessDemandEvidence(input.organizationId, input.evidence, input.result.plan.createdAt);
  return { ...input.result, plan: { ...input.result.plan, jointAssessment: jointAssessment(input.organizationId, normalizedAdvertisingSignals(input.organizationId, input.evidence), oracle, input.result.plan.createdAt) } };
}
