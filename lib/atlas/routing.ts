import type { NormalizedEvidenceRecord } from "../evidence";
import {
  applyApprovalPolicies,
  evaluateApproval,
  getApprovalReasons,
} from "../mercury/approvals";
import { routeExecutionPlan } from "../mercury/router";
import { createPlanTimeline } from "../mercury/timeline";
import type {
  OrchestrationResult,
  PlannedTask,
} from "../mercury/types";
import { assessCatalog } from "./assessment";

export function isAtlasPlan(result: OrchestrationResult) {
  return result.plan.tasks.some((task) =>
    task.capability.startsWith("catalog."),
  );
}

export function routeCatalogQuestion(result: OrchestrationResult) {
  return isAtlasPlan(result) ? "atlas" : null;
}

export function enrichOrchestrationWithAtlas(input: {
  result: OrchestrationResult;
  organizationId: string;
  evidence: NormalizedEvidenceRecord[];
}): OrchestrationResult {
  if (!isAtlasPlan(input.result)) return input.result;

  const policy = evaluateApproval("catalog.optimize");
  const assessment = assessCatalog({
    organizationId: input.organizationId,
    records: input.evidence,
    assessmentKey: input.result.plan.id,
    policy: {
      required: policy.required,
      version: policy.policyVersion,
      reason: policy.reason,
    },
  });
  let tasks = input.result.plan.tasks;

  if (
    assessment.improvementPlan.actions.length > 0 &&
    !tasks.some((task) => task.capability === "catalog.optimize")
  ) {
    const auditTask = tasks.find(
      (task) => task.capability === "catalog.audit",
    );
    const reportingTask = tasks.find(
      (task) => task.capability === "reporting.generate",
    );
    const optimizeTask: PlannedTask = {
      id: `${input.result.plan.id}_atlas_improvement`,
      worker: "atlas",
      capability: "catalog.optimize",
      title: "Review Atlas improvement plan",
      description:
        "Review evidence-backed catalog recommendations through the existing governed approval workflow.",
      priority: "high",
      requiresApproval: true,
      dependencies: auditTask ? [auditTask.id] : [],
    };
    tasks = tasks
      .filter((task) => task.id !== reportingTask?.id)
      .concat(
        optimizeTask,
        reportingTask
          ? {
              ...reportingTask,
              dependencies: [
                ...new Set([...reportingTask.dependencies, optimizeTask.id]),
              ],
            }
          : [],
      );
  }

  tasks = applyApprovalPolicies(tasks);
  const plan = {
    ...input.result.plan,
    tasks,
    atlasAssessment: assessment,
    requiresApproval: tasks.some((task) => task.requiresApproval),
  };

  return {
    plan,
    routes: routeExecutionPlan(plan),
    events: createPlanTimeline(plan),
    approvalReasons: getApprovalReasons(tasks),
    status: plan.requiresApproval ? "awaiting_approval" : "ready",
  };
}
