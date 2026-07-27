import type { TaskPriority, WorkerKey } from "../domain";

export type MercuryCapability =
  | "catalog.audit"
  | "catalog.optimize"
  | "advertising.audit"
  | "advertising.optimize"
  | "inventory.forecast"
  | "inventory.protect"
  | "compliance.audit"
  | "compliance.resolve"
  | "creative.brief"
  | "reporting.generate";

export type PlannedTask = {
  id: string;
  worker: WorkerKey;
  capability: MercuryCapability;
  title: string;
  description: string;
  priority: TaskPriority;
  requiresApproval: boolean;
  dependencies: string[];
};

export type ExecutionPlan = {
  id: string;
  objective: string;
  summary: string;
  createdAt: string;
  confidence: number;
  tasks: PlannedTask[];
  requiresApproval: boolean;
};

export type OrchestrationEvent = {
  id: string;
  planId: string;
  type: "plan.created" | "approval.required" | "task.queued";
  message: string;
  createdAt: string;
};

export type OrchestrationStatus = "ready" | "awaiting_approval";

export type RoutedTask = PlannedTask & {
  routeStatus: "ready" | "blocked_by_dependency" | "blocked_by_approval";
};

export type OrchestrationResult = {
  plan: ExecutionPlan;
  events: OrchestrationEvent[];
  approvalReasons: string[];
  status: OrchestrationStatus;
  routes: RoutedTask[];
};
