import { applyApprovalPolicies, getApprovalReasons } from "./approvals";
import { planObjective } from "./planner";
import { routeExecutionPlan } from "./router";
import { createPlanTimeline } from "./timeline";
import type { ExecutionPlan, OrchestrationResult } from "./types";

function finalizePlan(plan: ExecutionPlan): ExecutionPlan {
  const tasks = applyApprovalPolicies(plan.tasks);

  return {
    ...plan,
    tasks,
    requiresApproval: tasks.some((task) => task.requiresApproval),
  };
}

export async function orchestrate(
  objective: string,
): Promise<OrchestrationResult> {
  const initialPlan = planObjective(objective);
  const plan = finalizePlan(initialPlan);
  const events = createPlanTimeline(plan);
  const routes = routeExecutionPlan(plan);

  return {
    plan,
    events,
    routes,
    approvalReasons: getApprovalReasons(plan.tasks),
    status: plan.requiresApproval ? "awaiting_approval" : "ready",
  };
}
