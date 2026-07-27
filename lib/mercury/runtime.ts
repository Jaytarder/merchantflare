import type { JSONValue } from "postgres";
import {
  appendMercuryEvent,
  getMercuryPlan,
  updatePlanStatus,
  updateTaskExecution,
} from "./repository";
import type { ExecutionRun, TaskExecutionResult } from "./types";
import { getWorkerForTask } from "./workers";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown worker execution error.";
}

function toJsonValue(value: unknown): JSONValue {
  return JSON.parse(JSON.stringify(value)) as JSONValue;
}

export async function executeMercuryPlan(planId: string): Promise<ExecutionRun> {
  const plan = await getMercuryPlan(planId);
  if (!plan) throw new Error("Mercury plan not found.");
  if (plan.status === "running") {
    throw new Error("Mercury plan is already running.");
  }
  if (plan.status !== "ready") {
    throw new Error(
      `Mercury plan cannot execute while its status is ${plan.status}.`,
    );
  }

  await updatePlanStatus(planId, "running");

  const results = new Map<string, TaskExecutionResult>();
  const runtimeEvents: ExecutionRun["events"] = [];

  for (const task of plan.tasks) {
    const failedDependency = task.dependencies.find((dependencyId) => {
      const dependency = results.get(dependencyId);
      return !dependency || dependency.status !== "succeeded";
    });

    if (failedDependency) {
      const result: TaskExecutionResult = {
        taskId: task.id,
        worker: task.worker,
        capability: task.capability,
        status: "blocked",
        attempts: task.attempts,
        error: `Dependency ${failedDependency} did not complete successfully.`,
      };
      results.set(task.id, result);
      await updateTaskExecution({
        planId,
        taskId: task.id,
        status: "blocked",
        error: result.error,
      });
      continue;
    }

    const startedAt = new Date().toISOString();
    await updateTaskExecution({ planId, taskId: task.id, status: "running" });
    await appendMercuryEvent({
      planId,
      taskId: task.id,
      type: "task.started",
      message: `${task.worker} started ${task.title}.`,
    });

    try {
      const worker = getWorkerForTask(task);
      const output = await worker.execute!({
        planId,
        objective: plan.objective,
        task,
      });
      const completedAt = new Date().toISOString();
      const result: TaskExecutionResult = {
        taskId: task.id,
        worker: task.worker,
        capability: task.capability,
        status: "succeeded",
        attempts: task.attempts + 1,
        startedAt,
        completedAt,
        output,
      };
      results.set(task.id, result);
      await updateTaskExecution({
        planId,
        taskId: task.id,
        status: "succeeded",
        output: toJsonValue(output),
      });
      await appendMercuryEvent({
        planId,
        taskId: task.id,
        type: "task.succeeded",
        message: `${worker.name} completed ${task.title}.`,
      });
    } catch (error) {
      const completedAt = new Date().toISOString();
      const message = errorMessage(error);
      const result: TaskExecutionResult = {
        taskId: task.id,
        worker: task.worker,
        capability: task.capability,
        status: "failed",
        attempts: task.attempts + 1,
        startedAt,
        completedAt,
        error: message,
      };
      results.set(task.id, result);
      await updateTaskExecution({
        planId,
        taskId: task.id,
        status: "failed",
        error: message,
      });
      await appendMercuryEvent({
        planId,
        taskId: task.id,
        type: "task.failed",
        message: `${task.worker} failed ${task.title}: ${message}`,
      });
    }
  }

  const finalResults = Array.from(results.values());
  const finalStatus = finalResults.some((result) => result.status === "failed")
    ? "failed"
    : finalResults.every((result) => result.status === "succeeded")
      ? "completed"
      : "failed";

  await updatePlanStatus(planId, finalStatus);

  const refreshed = await getMercuryPlan(planId);
  runtimeEvents.push(...(refreshed?.events ?? []));

  return {
    planId,
    status: finalStatus,
    results: finalResults,
    events: runtimeEvents,
  };
}
