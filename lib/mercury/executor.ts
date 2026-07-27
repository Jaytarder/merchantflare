import type { WorkerKey } from "../domain";
import type {
  ExecutionPlan,
  ExecutionRun,
  OrchestrationEvent,
  PlannedTask,
  TaskExecutionResult,
} from "./types";

export type WorkerExecutionContext = {
  plan: ExecutionPlan;
  priorResults: ReadonlyMap<string, TaskExecutionResult>;
};

export type WorkerExecutor = (
  task: PlannedTask,
  context: WorkerExecutionContext,
) => Promise<unknown>;

export type WorkerExecutorRegistry = Partial<Record<WorkerKey, WorkerExecutor>>;

export type ExecutePlanOptions = {
  approvedTaskIds?: string[];
  maxAttempts?: number;
  executors?: WorkerExecutorRegistry;
};

function createExecutionEvent(
  planId: string,
  type: OrchestrationEvent["type"],
  message: string,
  taskId?: string,
): OrchestrationEvent {
  return {
    id: `event_${crypto.randomUUID()}`,
    planId,
    taskId,
    type,
    message,
    createdAt: new Date().toISOString(),
  };
}

async function mockWorkerExecutor(task: PlannedTask): Promise<unknown> {
  return {
    mode: "mock",
    worker: task.worker,
    capability: task.capability,
    summary: `${task.worker} completed ${task.title}.`,
  };
}

function dependenciesSucceeded(
  task: PlannedTask,
  results: ReadonlyMap<string, TaskExecutionResult>,
): boolean {
  return task.dependencies.every(
    (dependencyId) => results.get(dependencyId)?.status === "succeeded",
  );
}

function dependencyFailed(
  task: PlannedTask,
  results: ReadonlyMap<string, TaskExecutionResult>,
): boolean {
  return task.dependencies.some(
    (dependencyId) => results.get(dependencyId)?.status === "failed",
  );
}

export async function executePlan(
  plan: ExecutionPlan,
  options: ExecutePlanOptions = {},
): Promise<ExecutionRun> {
  const approvedTaskIds = new Set(options.approvedTaskIds ?? []);
  const maxAttempts = Math.max(1, options.maxAttempts ?? 2);
  const executors = options.executors ?? {};
  const results = new Map<string, TaskExecutionResult>();
  const events: OrchestrationEvent[] = [];
  const pending = new Map(plan.tasks.map((task) => [task.id, task]));

  for (const task of plan.tasks) {
    if (task.requiresApproval && !approvedTaskIds.has(task.id)) {
      results.set(task.id, {
        taskId: task.id,
        worker: task.worker,
        capability: task.capability,
        status: "blocked",
        attempts: 0,
        error: "Approval is required before execution.",
      });
    }
  }

  for (const [taskId, result] of results) {
    if (result.status === "blocked") {
      pending.delete(taskId);
    }
  }

  while (pending.size > 0) {
    const readyTasks = Array.from(pending.values()).filter((task) =>
      dependenciesSucceeded(task, results),
    );

    if (readyTasks.length === 0) {
      for (const task of pending.values()) {
        results.set(task.id, {
          taskId: task.id,
          worker: task.worker,
          capability: task.capability,
          status: "blocked",
          attempts: 0,
          error: dependencyFailed(task, results)
            ? "A dependency failed."
            : "A dependency is blocked or unresolved.",
        });
      }
      break;
    }

    for (const task of readyTasks) {
      pending.delete(task.id);
      const executor = executors[task.worker] ?? mockWorkerExecutor;
      const startedAt = new Date().toISOString();
      let attempts = 0;
      let completed = false;

      events.push(
        createExecutionEvent(
          plan.id,
          "task.started",
          `${task.worker} started: ${task.title}`,
          task.id,
        ),
      );

      while (!completed && attempts < maxAttempts) {
        attempts += 1;

        try {
          const output = await executor(task, {
            plan,
            priorResults: results,
          });

          results.set(task.id, {
            taskId: task.id,
            worker: task.worker,
            capability: task.capability,
            status: "succeeded",
            attempts,
            startedAt,
            completedAt: new Date().toISOString(),
            output,
          });
          events.push(
            createExecutionEvent(
              plan.id,
              "task.succeeded",
              `${task.worker} completed: ${task.title}`,
              task.id,
            ),
          );
          completed = true;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown execution error.";

          if (attempts < maxAttempts) {
            events.push(
              createExecutionEvent(
                plan.id,
                "task.retrying",
                `${task.worker} is retrying ${task.title} after: ${message}`,
                task.id,
              ),
            );
            continue;
          }

          results.set(task.id, {
            taskId: task.id,
            worker: task.worker,
            capability: task.capability,
            status: "failed",
            attempts,
            startedAt,
            completedAt: new Date().toISOString(),
            error: message,
          });
          events.push(
            createExecutionEvent(
              plan.id,
              "task.failed",
              `${task.worker} failed: ${task.title}`,
              task.id,
            ),
          );
          completed = true;
        }
      }
    }
  }

  const orderedResults = plan.tasks.map((task) => {
    const result = results.get(task.id);
    if (!result) {
      throw new Error(`Execution result missing for task ${task.id}.`);
    }
    return result;
  });

  const hasFailures = orderedResults.some((result) => result.status === "failed");
  const hasBlocked = orderedResults.some((result) => result.status === "blocked");

  return {
    planId: plan.id,
    status: hasFailures ? "failed" : hasBlocked ? "awaiting_approval" : "completed",
    results: orderedResults,
    events,
  };
}
