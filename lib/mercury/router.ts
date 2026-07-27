import type { ExecutionPlan, RoutedTask } from "./types";

export function routeExecutionPlan(plan: ExecutionPlan): RoutedTask[] {
  const taskIds = new Set(plan.tasks.map((task) => task.id));

  return plan.tasks.map((task) => {
    const hasUnknownDependency = task.dependencies.some(
      (dependencyId) => !taskIds.has(dependencyId),
    );

    if (hasUnknownDependency) {
      throw new Error(`Task ${task.id} contains an unknown dependency.`);
    }

    if (task.requiresApproval) {
      return {
        ...task,
        routeStatus: "blocked_by_approval",
      };
    }

    if (task.dependencies.length > 0) {
      return {
        ...task,
        routeStatus: "blocked_by_dependency",
      };
    }

    return {
      ...task,
      routeStatus: "ready",
    };
  });
}

export function getReadyTasks(routes: RoutedTask[]): RoutedTask[] {
  return routes.filter((task) => task.routeStatus === "ready");
}
