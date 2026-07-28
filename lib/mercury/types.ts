import type { TaskPriority, WorkerKey } from "../domain";
import type { CatalogAssessment } from "../atlas";

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
  atlasAssessment?: CatalogAssessment;
};

export type OrchestrationEventType =
  | "plan.created"
  | "approval.required"
  | "task.queued"
  | "task.started"
  | "task.succeeded"
  | "task.failed"
  | "task.retrying"
  | "approval.approved"
  | "approval.rejected"
  | "plan.superseded";

export type OrchestrationEvent = {
  id: string;
  planId: string;
  taskId?: string;
  type: OrchestrationEventType;
  message: string;
  createdAt: string;
};

export type OrchestrationStatus =
  | "ready"
  | "awaiting_approval"
  | "running"
  | "completed"
  | "failed"
  | "rejected"
  | "superseded";

export type RouteStatus =
  | "ready"
  | "blocked_by_dependency"
  | "blocked_by_approval";

export type RoutedTask = PlannedTask & {
  routeStatus: RouteStatus;
};

export type TaskExecutionStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "blocked";

export type TaskExecutionResult = {
  taskId: string;
  worker: WorkerKey;
  capability: MercuryCapability;
  status: TaskExecutionStatus;
  attempts: number;
  startedAt?: string;
  completedAt?: string;
  output?: unknown;
  error?: string;
};

export type ExecutionRun = {
  planId: string;
  status: OrchestrationStatus;
  results: TaskExecutionResult[];
  events: OrchestrationEvent[];
};

export type OrchestrationResult = {
  plan: ExecutionPlan;
  events: OrchestrationEvent[];
  approvalReasons: string[];
  status: OrchestrationStatus;
  routes: RoutedTask[];
};
