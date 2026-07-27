import { randomUUID } from "crypto";
import { getDatabase } from "../db";
import { orchestrate } from "./orchestrator";
import {
  persistOrchestrationResult,
  type PlanPersistenceContext,
} from "./repository";
import type {
  ConversationPlan,
  ConversationPlanTask,
  ConversationStatus,
  IntelligenceModule,
  MercuryConversation,
  MercuryConversationMessage,
  MercuryConversationSummary,
} from "./conversation-types";
import type {
  ExecutionPlan,
  MercuryCapability,
  OrchestrationStatus,
  RouteStatus,
} from "./types";
import type { TaskPriority } from "../domain";

export class MercuryPersistenceUnavailableError extends Error {
  constructor() {
    super("Mercury conversation persistence requires DATABASE_URL.");
    this.name = "MercuryPersistenceUnavailableError";
  }
}

export class MercuryConversationNotFoundError extends Error {
  constructor() {
    super("Mercury conversation was not found.");
    this.name = "MercuryConversationNotFoundError";
  }
}

export class MercuryConversationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MercuryConversationConflictError";
  }
}

type ConversationPrincipal = {
  organizationId: string;
  email: string;
};

function requireDatabase() {
  const sql = getDatabase();
  if (!sql) throw new MercuryPersistenceUnavailableError();
  return sql;
}

function createId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function titleFromMessage(message: string) {
  const singleLine = message.trim().replace(/\s+/g, " ");
  return singleLine.length <= 72
    ? singleLine
    : `${singleLine.slice(0, 69).trimEnd()}…`;
}

function mercuryResponseContent(plan: ExecutionPlan) {
  const moduleCount = new Set(plan.tasks.map((task) => task.worker)).size;
  const taskLabel = plan.tasks.length === 1 ? "task" : "tasks";
  const moduleLabel = moduleCount === 1 ? "intelligence module" : "intelligence modules";

  return `Mercury created a ${plan.tasks.length}-${taskLabel} plan across ${moduleCount} ${moduleLabel}. This plan uses deterministic routing and does not yet include live commerce evidence.`;
}

export async function listMercuryConversations(
  principal: ConversationPrincipal,
  limit = 30,
  status: ConversationStatus = "active",
): Promise<MercuryConversationSummary[]> {
  const sql = requireDatabase();
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const rows = await sql<Array<{
    id: string;
    title: string;
    status: ConversationStatus;
    created_at: Date;
    updated_at: Date;
    message_count: string | number;
  }>>`
    select
      conversation.id,
      conversation.title,
      conversation.status,
      conversation.created_at,
      conversation.updated_at,
      count(message.id) as message_count
    from mercury_conversations conversation
    left join mercury_messages message
      on message.conversation_id = conversation.id
    where conversation.organization_id = ${principal.organizationId}
      and conversation.status = ${status}
    group by conversation.id
    order by conversation.updated_at desc
    limit ${safeLimit}
  `;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    messageCount: Number(row.message_count),
  }));
}

export async function getMercuryConversation(
  conversationId: string,
  principal: ConversationPrincipal,
): Promise<MercuryConversation | null> {
  const sql = requireDatabase();
  const conversations = await sql<Array<{
    id: string;
    title: string;
    status: ConversationStatus;
    created_at: Date;
    updated_at: Date;
  }>>`
    select id, title, status, created_at, updated_at
    from mercury_conversations
    where id = ${conversationId}
      and organization_id = ${principal.organizationId}
    limit 1
  `;

  const conversation = conversations[0];
  if (!conversation) return null;

  const messageRows = await sql<Array<{
    id: string;
    author_type: MercuryConversationMessage["author"];
    content: string;
    plan_id: string | null;
    created_at: Date;
  }>>`
    select id, author_type, content, plan_id, created_at
    from mercury_messages
    where conversation_id = ${conversationId}
      and organization_id = ${principal.organizationId}
    order by sequence_number asc
  `;

  const planRows = await sql<Array<{
    id: string;
    summary: string;
    status: OrchestrationStatus;
    confidence: string | number;
    requires_approval: boolean;
    approval_reasons: string[];
    payload: ExecutionPlan;
    created_at: Date;
  }>>`
    select
      id,
      summary,
      status,
      confidence,
      requires_approval,
      approval_reasons,
      payload,
      created_at
    from mercury_plans
    where conversation_id = ${conversationId}
      and organization_id = ${principal.organizationId}
    order by created_at asc
  `;

  const taskRows = await sql<Array<{
    plan_id: string;
    id: string;
    worker: IntelligenceModule;
    capability: MercuryCapability;
    title: string;
    description: string;
    priority: TaskPriority;
    route_status: RouteStatus;
    requires_approval: boolean;
    dependencies: string[];
  }>>`
    select
      task.plan_id,
      task.id,
      task.worker,
      task.capability,
      task.title,
      task.description,
      task.priority,
      task.route_status,
      task.requires_approval,
      task.dependencies
    from mercury_tasks task
    join mercury_plans plan on plan.id = task.plan_id
    where plan.conversation_id = ${conversationId}
      and plan.organization_id = ${principal.organizationId}
    order by task.created_at asc
  `;

  const tasksByPlan = new Map<string, ConversationPlanTask[]>();
  for (const task of taskRows) {
    const tasks = tasksByPlan.get(task.plan_id) ?? [];
    tasks.push({
      id: task.id,
      module: task.worker,
      capability: task.capability,
      title: task.title,
      description: task.description,
      priority: task.priority,
      requiresApproval: task.requires_approval,
      dependencies: task.dependencies ?? [],
      routeStatus: task.route_status,
    });
    tasksByPlan.set(task.plan_id, tasks);
  }

  const taskOrderByPlan = new Map(
    planRows.map((plan) => [
      plan.id,
      new Map(plan.payload.tasks.map((task, index) => [task.id, index])),
    ]),
  );
  for (const [planId, tasks] of tasksByPlan) {
    const taskOrder = taskOrderByPlan.get(planId);
    tasks.sort(
      (left, right) =>
        (taskOrder?.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (taskOrder?.get(right.id) ?? Number.MAX_SAFE_INTEGER),
    );
  }

  const plans = new Map<string, ConversationPlan>(
    planRows.map((plan) => [
      plan.id,
      {
        id: plan.id,
        summary: plan.summary,
        status: plan.status,
        confidence: Number(plan.confidence),
        requiresApproval: plan.requires_approval,
        approvalReasons: plan.approval_reasons ?? [],
        tasks: tasksByPlan.get(plan.id) ?? [],
        plannerMode: "deterministic",
        evidenceStatus: "unavailable",
        createdAt: plan.created_at.toISOString(),
      },
    ]),
  );

  return {
    id: conversation.id,
    title: conversation.title,
    status: conversation.status,
    createdAt: conversation.created_at.toISOString(),
    updatedAt: conversation.updated_at.toISOString(),
    messageCount: messageRows.length,
    messages: messageRows.map((message) => ({
      id: message.id,
      author: message.author_type,
      content: message.content,
      createdAt: message.created_at.toISOString(),
      plan: message.plan_id ? plans.get(message.plan_id) : undefined,
    })),
  };
}

export async function createMercuryConversationTurn(input: {
  conversationId?: string;
  message: string;
  principal: ConversationPrincipal;
}): Promise<MercuryConversation> {
  const sql = requireDatabase();
  const result = await orchestrate(input.message);
  const conversationId = input.conversationId ?? createId("conversation");
  const userMessageId = createId("message");
  const responseMessageId = createId("message");
  const responseContent = mercuryResponseContent(result.plan);

  await sql.begin(async (tx) => {
    if (input.conversationId) {
      const conversations = await tx<Array<{ status: ConversationStatus }>>`
        select status
        from mercury_conversations
        where id = ${conversationId}
          and organization_id = ${input.principal.organizationId}
        for update
      `;

      if (!conversations[0]) throw new MercuryConversationNotFoundError();
      if (conversations[0].status === "archived") {
        throw new MercuryConversationConflictError(
          "Archived conversations cannot accept new messages.",
        );
      }
    } else {
      await tx`
        insert into mercury_conversations (
          id,
          organization_id,
          created_by,
          title,
          status,
          created_at,
          updated_at
        ) values (
          ${conversationId},
          ${input.principal.organizationId},
          ${input.principal.email},
          ${titleFromMessage(input.message)},
          'active',
          now(),
          now()
        )
      `;
    }

    const sequenceRows = await tx<Array<{ last_sequence: string | number }>>`
      select coalesce(max(sequence_number), 0) as last_sequence
      from mercury_messages
      where conversation_id = ${conversationId}
    `;
    const userSequence = Number(sequenceRows[0]?.last_sequence ?? 0) + 1;
    const responseSequence = userSequence + 1;

    await tx`
      insert into mercury_messages (
        id,
        conversation_id,
        organization_id,
        author_type,
        content,
        sequence_number,
        created_at
      ) values (
        ${userMessageId},
        ${conversationId},
        ${input.principal.organizationId},
        'user',
        ${input.message},
        ${userSequence},
        now()
      )
    `;

    const context: PlanPersistenceContext = {
      organizationId: input.principal.organizationId,
      conversationId,
      sourceMessageId: userMessageId,
    };
    await persistOrchestrationResult(tx, result, context);

    await tx`
      insert into mercury_messages (
        id,
        conversation_id,
        organization_id,
        author_type,
        content,
        metadata,
        plan_id,
        sequence_number,
        created_at
      ) values (
        ${responseMessageId},
        ${conversationId},
        ${input.principal.organizationId},
        'mercury',
        ${responseContent},
        ${tx.json({
          plannerMode: "deterministic",
          evidenceStatus: "unavailable",
        })},
        ${result.plan.id},
        ${responseSequence},
        now()
      )
    `;

    await tx`
      update mercury_plans
      set response_message_id = ${responseMessageId}
      where id = ${result.plan.id}
        and organization_id = ${input.principal.organizationId}
    `;

    await tx`
      update mercury_conversations
      set updated_at = now()
      where id = ${conversationId}
        and organization_id = ${input.principal.organizationId}
    `;
  });

  const conversation = await getMercuryConversation(
    conversationId,
    input.principal,
  );
  if (!conversation) throw new MercuryConversationNotFoundError();
  return conversation;
}

export async function updateMercuryConversation(input: {
  conversationId: string;
  principal: ConversationPrincipal;
  title?: string;
  status?: ConversationStatus;
}): Promise<MercuryConversation> {
  const sql = requireDatabase();
  const title = input.title?.trim();

  const rows = await sql<Array<{ id: string }>>`
    update mercury_conversations
    set
      title = case
        when ${title !== undefined} then ${title ?? ""}
        else title
      end,
      status = case
        when ${input.status !== undefined} then ${input.status ?? "active"}
        else status
      end,
      updated_at = now()
    where id = ${input.conversationId}
      and organization_id = ${input.principal.organizationId}
    returning id
  `;

  if (!rows[0]) throw new MercuryConversationNotFoundError();
  const conversation = await getMercuryConversation(
    input.conversationId,
    input.principal,
  );
  if (!conversation) throw new MercuryConversationNotFoundError();
  return conversation;
}
