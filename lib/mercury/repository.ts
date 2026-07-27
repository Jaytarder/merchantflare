import { randomUUID } from "crypto";
import type { JSONValue } from "postgres";
import { getDatabase } from "../db";
import type {
  OrchestrationEvent,
  OrchestrationResult,
  OrchestrationStatus,
  TaskExecutionResult,
} from "./types";

export type MercuryPlanSummary = {
  id: string;
  objective: string;
  summary: string;
  status: OrchestrationResult["status"];
  confidence: number;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MercuryApproval = {
  id: string;
  planId: string;
  status: "pending" | "approved" | "rejected";
  decidedBy?: string;
  decisionNote?: string;
  decidedAt?: string;
  createdAt: string;
};

export type MercuryPlanDetail = MercuryPlanSummary & {
  approvalReasons: string[];
  plan: OrchestrationResult["plan"];
  tasks: Array<OrchestrationResult["routes"][number] & TaskExecutionResult>;
  events: OrchestrationEvent[];
  approvals: MercuryApproval[];
};

export async function saveOrchestrationResult(result: OrchestrationResult) {
  const sql = getDatabase();

  if (!sql) {
    return { persisted: false as const, reason: "DATABASE_URL is not configured." };
  }

  await sql.begin(async (tx) => {
    await tx`
      insert into mercury_plans (
        id,
        objective,
        summary,
        status,
        confidence,
        requires_approval,
        approval_reasons,
        payload,
        created_at,
        updated_at
      ) values (
        ${result.plan.id},
        ${result.plan.objective},
        ${result.plan.summary},
        ${result.status},
        ${result.plan.confidence},
        ${result.plan.requiresApproval},
        ${tx.json(result.approvalReasons)},
        ${tx.json(result.plan)},
        ${result.plan.createdAt},
        now()
      )
      on conflict (id) do update set
        objective = excluded.objective,
        summary = excluded.summary,
        status = excluded.status,
        confidence = excluded.confidence,
        requires_approval = excluded.requires_approval,
        approval_reasons = excluded.approval_reasons,
        payload = excluded.payload,
        updated_at = now()
    `;

    await tx`delete from mercury_tasks where plan_id = ${result.plan.id}`;
    await tx`delete from mercury_events where plan_id = ${result.plan.id}`;

    for (const task of result.routes) {
      await tx`
        insert into mercury_tasks (
          id,
          plan_id,
          worker,
          capability,
          title,
          description,
          priority,
          route_status,
          requires_approval,
          dependencies,
          payload,
          execution_status
        ) values (
          ${task.id},
          ${result.plan.id},
          ${task.worker},
          ${task.capability},
          ${task.title},
          ${task.description},
          ${task.priority},
          ${task.routeStatus},
          ${task.requiresApproval},
          ${tx.json(task.dependencies)},
          ${tx.json(task)},
          ${task.routeStatus === "ready" ? "pending" : "blocked"}
        )
      `;
    }

    for (const event of result.events) {
      await tx`
        insert into mercury_events (
          id,
          plan_id,
          task_id,
          event_type,
          message,
          created_at
        ) values (
          ${event.id},
          ${event.planId},
          ${event.taskId ?? null},
          ${event.type},
          ${event.message},
          ${event.createdAt}
        )
      `;
    }

    if (result.plan.requiresApproval) {
      await tx`
        insert into mercury_approvals (plan_id)
        values (${result.plan.id})
        on conflict do nothing
      `;
    }
  });

  return { persisted: true as const };
}

export async function listMercuryPlans(limit = 25): Promise<MercuryPlanSummary[]> {
  const sql = getDatabase();
  if (!sql) return [];

  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const rows = await sql<
    Array<{
      id: string;
      objective: string;
      summary: string;
      status: OrchestrationResult["status"];
      confidence: string | number;
      requires_approval: boolean;
      created_at: Date;
      updated_at: Date;
    }>
  >`
    select
      id,
      objective,
      summary,
      status,
      confidence,
      requires_approval,
      created_at,
      updated_at
    from mercury_plans
    order by created_at desc
    limit ${safeLimit}
  `;

  return rows.map((row) => ({
    id: row.id,
    objective: row.objective,
    summary: row.summary,
    status: row.status,
    confidence: Number(row.confidence),
    requiresApproval: row.requires_approval,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}

export async function getMercuryPlan(planId: string): Promise<MercuryPlanDetail | null> {
  const sql = getDatabase();
  if (!sql) return null;

  const plans = await sql<Array<{
    id: string;
    objective: string;
    summary: string;
    status: OrchestrationStatus;
    confidence: string | number;
    requires_approval: boolean;
    approval_reasons: string[];
    payload: OrchestrationResult["plan"];
    created_at: Date;
    updated_at: Date;
  }>>`
    select * from mercury_plans where id = ${planId} limit 1
  `;

  const row = plans[0];
  if (!row) return null;

  const tasks = await sql<Array<{
    id: string;
    worker: OrchestrationResult["routes"][number]["worker"];
    capability: OrchestrationResult["routes"][number]["capability"];
    title: string;
    description: string;
    priority: OrchestrationResult["routes"][number]["priority"];
    route_status: OrchestrationResult["routes"][number]["routeStatus"];
    requires_approval: boolean;
    dependencies: string[];
    execution_status: TaskExecutionResult["status"];
    attempts: number;
    started_at: Date | null;
    completed_at: Date | null;
    output: unknown;
    error: string | null;
  }>>`
    select * from mercury_tasks where plan_id = ${planId} order by created_at asc
  `;

  const events = await sql<Array<{
    id: string;
    plan_id: string;
    task_id: string | null;
    event_type: OrchestrationEvent["type"];
    message: string;
    created_at: Date;
  }>>`
    select * from mercury_events where plan_id = ${planId} order by created_at asc
  `;

  const approvals = await sql<Array<{
    id: string;
    plan_id: string;
    status: MercuryApproval["status"];
    decided_by: string | null;
    decision_note: string | null;
    decided_at: Date | null;
    created_at: Date;
  }>>`
    select * from mercury_approvals where plan_id = ${planId} order by created_at desc
  `;

  return {
    id: row.id,
    objective: row.objective,
    summary: row.summary,
    status: row.status,
    confidence: Number(row.confidence),
    requiresApproval: row.requires_approval,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    approvalReasons: row.approval_reasons ?? [],
    plan: row.payload,
    tasks: tasks.map((task) => ({
      id: task.id,
      taskId: task.id,
      worker: task.worker,
      capability: task.capability,
      title: task.title,
      description: task.description,
      priority: task.priority,
      routeStatus: task.route_status,
      requiresApproval: task.requires_approval,
      dependencies: task.dependencies ?? [],
      status: task.execution_status,
      attempts: task.attempts,
      startedAt: task.started_at?.toISOString(),
      completedAt: task.completed_at?.toISOString(),
      output: task.output,
      error: task.error ?? undefined,
    })),
    events: events.map((event) => ({
      id: event.id,
      planId: event.plan_id,
      taskId: event.task_id ?? undefined,
      type: event.event_type,
      message: event.message,
      createdAt: event.created_at.toISOString(),
    })),
    approvals: approvals.map((approval) => ({
      id: approval.id,
      planId: approval.plan_id,
      status: approval.status,
      decidedBy: approval.decided_by ?? undefined,
      decisionNote: approval.decision_note ?? undefined,
      decidedAt: approval.decided_at?.toISOString(),
      createdAt: approval.created_at.toISOString(),
    })),
  };
}

export async function decideMercuryApproval(input: {
  planId: string;
  decision: "approved" | "rejected";
  decidedBy: string;
  note?: string;
}) {
  const sql = getDatabase();
  if (!sql) throw new Error("DATABASE_URL is not configured.");

  return sql.begin(async (tx) => {
    const approvals = await tx<Array<{ id: string }>>`
      update mercury_approvals
      set
        status = ${input.decision},
        decided_by = ${input.decidedBy},
        decision_note = ${input.note ?? null},
        decided_at = now()
      where plan_id = ${input.planId} and status = 'pending'
      returning id
    `;

    if (!approvals[0]) return null;

    const nextStatus: OrchestrationStatus = input.decision === "approved" ? "ready" : "failed";
    await tx`
      update mercury_plans
      set status = ${nextStatus}, updated_at = now()
      where id = ${input.planId}
    `;

    await tx`
      update mercury_tasks
      set
        route_status = case
          when ${input.decision} = 'approved' and route_status = 'blocked_by_approval' then 'ready'
          else route_status
        end,
        execution_status = case
          when ${input.decision} = 'approved' and route_status = 'blocked_by_approval' then 'pending'
          when ${input.decision} = 'rejected' then 'blocked'
          else execution_status
        end,
        updated_at = now()
      where plan_id = ${input.planId}
    `;

    await tx`
      insert into mercury_events (id, plan_id, event_type, message, created_at)
      values (
        ${randomUUID()},
        ${input.planId},
        ${input.decision === "approved" ? "task.queued" : "task.failed"},
        ${input.decision === "approved" ? "Plan approved and released for execution." : "Plan rejected. Execution has been stopped."},
        now()
      )
    `;

    return { approvalId: approvals[0].id, status: nextStatus };
  });
}

export async function updatePlanStatus(planId: string, status: OrchestrationStatus) {
  const sql = getDatabase();
  if (!sql) throw new Error("DATABASE_URL is not configured.");
  await sql`update mercury_plans set status = ${status}, updated_at = now() where id = ${planId}`;
}

export async function updateTaskExecution(input: {
  planId: string;
  taskId: string;
  status: TaskExecutionResult["status"];
  output?: JSONValue;
  error?: string;
}) {
  const sql = getDatabase();
  if (!sql) throw new Error("DATABASE_URL is not configured.");

  const started = input.status === "running";
  const completed = input.status === "succeeded" || input.status === "failed";
  const outputJson = input.output === undefined ? null : sql.json(input.output);

  await sql`
    update mercury_tasks
    set
      execution_status = ${input.status},
      attempts = case when ${started} then attempts + 1 else attempts end,
      started_at = case when ${started} then coalesce(started_at, now()) else started_at end,
      completed_at = case when ${completed} then now() else completed_at end,
      output = case when ${input.output !== undefined} then ${outputJson} else output end,
      error = ${input.error ?? null},
      updated_at = now()
    where id = ${input.taskId} and plan_id = ${input.planId}
  `;
}

export async function appendMercuryEvent(event: Omit<OrchestrationEvent, "id" | "createdAt">) {
  const sql = getDatabase();
  if (!sql) throw new Error("DATABASE_URL is not configured.");

  const id = randomUUID();
  await sql`
    insert into mercury_events (id, plan_id, task_id, event_type, message, created_at)
    values (${id}, ${event.planId}, ${event.taskId ?? null}, ${event.type}, ${event.message}, now())
  `;
  return id;
}
