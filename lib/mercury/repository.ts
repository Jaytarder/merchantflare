import { getDatabase } from "../db";
import type { OrchestrationResult } from "./types";

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
          payload
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
          ${tx.json(task)}
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
