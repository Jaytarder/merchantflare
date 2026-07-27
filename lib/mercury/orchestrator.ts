import { planObjective } from './planner';
import { applyApprovalPolicies, getApprovalReasons } from './approvals';
import { createPlanTimeline } from './timeline';
import type { ExecutionPlan, OrchestrationResult } from './types';

function finalizePlan(plan: ExecutionPlan): ExecutionPlan {
  const tasks = applyApprovalPolicies(plan.tasks);
  return {
    ...plan,
    tasks,
    requiresApproval: tasks.some(t => t.requiresApproval),
  };
}

export async function orchestrate(objective: string): Promise<OrchestrationResult> {
  const initialPlan = planObjective(objective);
  const plan = finalizePlan(initialPlan);
  const timeline = createPlanTimeline(plan);

  return {
    plan,
    timeline,
    approvalReasons: getApprovalReasons(plan.tasks),
    status: plan.requiresApproval ? 'awaiting_approval' : 'ready',
  };
}
