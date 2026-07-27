import type { ExecutionPlan, OrchestrationEvent } from "./types";

function createEvent(
  planId: string,
  type: OrchestrationEvent["type"],
  message: string,
): OrchestrationEvent {
  return {
    id: `event_${crypto.randomUUID()}`,
    planId,
    type,
    message,
    createdAt: new Date().toISOString(),
  };
}

export function createPlanTimeline(plan: ExecutionPlan): OrchestrationEvent[] {
  const events: OrchestrationEvent[] = [
    createEvent(
      plan.id,
      "plan.created",
      `Mercury created an execution plan with ${plan.tasks.length} tasks.`,
    ),
  ];

  if (plan.requiresApproval) {
    const approvalCount = plan.tasks.filter((task) => task.requiresApproval).length;
    events.push(
      createEvent(
        plan.id,
        "approval.required",
        `${approvalCount} task${approvalCount === 1 ? " requires" : "s require"} approval before execution.`,
      ),
    );
  }

  for (const task of plan.tasks) {
    events.push(
      createEvent(
        plan.id,
        "task.queued",
        `${task.worker} queued: ${task.title}`,
      ),
    );
  }

  return events;
}
