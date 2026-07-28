export type ID = string;

export type Organization = {
  id: ID;
  name: string;
  createdAt: string;
};

export type UserRole =
  | "owner"
  | "admin"
  | "manager"
  | "analyst"
  | "viewer";

export type User = {
  id: ID;
  organizationId: ID;
  email: string;
  name: string;
  role: UserRole;
};

export type Marketplace = "amazon-us" | "amazon-ca" | "amazon-uk";

export type CommerceAccount = {
  id: ID;
  organizationId: ID;
  marketplace: Marketplace;
  displayName: string;
  status: "connected" | "attention" | "disconnected";
};

export type WorkerKey = "mercury" | "atlas" | "vector" | "sentinel" | "oracle" | "forge" | "pulse";

export type WorkerStatus = "idle" | "running" | "blocked" | "review" | "scheduled";

export type Worker = {
  id: ID;
  organizationId: ID;
  key: WorkerKey;
  name: string;
  responsibility: string;
  status: WorkerStatus;
  currentTaskId?: ID;
};

export type ObjectiveStatus = "draft" | "planned" | "awaiting_approval" | "running" | "completed" | "failed";

export type Objective = {
  id: ID;
  organizationId: ID;
  createdBy: ID;
  title: string;
  instruction: string;
  status: ObjectiveStatus;
  createdAt: string;
  updatedAt: string;
  taskIds: ID[];
};

export type TaskPriority = "critical" | "high" | "medium" | "low";
export type TaskStatus = "queued" | "running" | "blocked" | "awaiting_approval" | "completed" | "failed";

export type Task = {
  id: ID;
  organizationId: ID;
  objectiveId: ID;
  assignedWorker: WorkerKey;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AlertSeverity = "critical" | "high" | "medium" | "low";

export type Alert = {
  id: ID;
  organizationId: ID;
  source: WorkerKey | "system";
  title: string;
  description: string;
  severity: AlertSeverity;
  status: "open" | "acknowledged" | "resolved";
  estimatedImpactUsd?: number;
  createdAt: string;
};

export type MetricName =
  | "ordered_revenue"
  | "contribution_profit"
  | "ad_spend"
  | "tacos"
  | "acos"
  | "roas"
  | "organic_share"
  | "return_rate"
  | "in_stock_rate"
  | "commerce_health";

export type MetricPoint = {
  organizationId: ID;
  accountId?: ID;
  name: MetricName;
  value: number;
  unit: "usd" | "percent" | "ratio" | "score";
  periodStart: string;
  periodEnd: string;
};

export type ActivityEvent = {
  id: ID;
  organizationId: ID;
  actor: WorkerKey | ID;
  type: "objective_created" | "plan_created" | "task_started" | "task_completed" | "approval_requested" | "alert_created";
  message: string;
  createdAt: string;
};
