import { randomUUID } from "crypto";
import { getDatabase } from "../db";
import {
  appendAuditEvent,
  type OrganizationPrincipal,
  userAuditActor,
} from "../platform";
import {
  CachedEvidenceQueryService,
  classifyEvidenceFreshness,
  freshnessPolicyFor,
  PostgresEvidenceCache,
  PostgresEvidenceReader,
  type EvidenceDataset,
  type EvidenceProvenance,
} from "../evidence";
import { orchestrate } from "./orchestrator";
import { enrichOrchestrationWithAtlas } from "../atlas";
import { enrichOrchestrationWithOracle } from "../oracle";
import { getMercuryDecisionContexts } from "../decision/mercury";
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
import {
  summarizeEvidence,
  evidenceDatasetsForCapabilities,
  toMercuryEvidenceItem,
  type EvidenceFreshness,
  type MercuryEvidenceItem,
} from "./evidence";
import {
  MercuryPersistenceUnavailableError,
  MercuryPlanNotFoundError,
  MercuryWorkflowConflictError,
} from "./workflow-errors";

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

type ConversationPrincipal = OrganizationPrincipal;

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

function mercuryResponseContent(
  plan: ExecutionPlan,
  version: number,
  evidenceCount: number,
) {
  const moduleCount = new Set(plan.tasks.map((task) => task.worker)).size;
  const taskLabel = plan.tasks.length === 1 ? "task" : "tasks";
  const moduleLabel = moduleCount === 1 ? "intelligence module" : "intelligence modules";

  const evidenceMessage =
    evidenceCount > 0
      ? `It references ${evidenceCount} normalized evidence ${evidenceCount === 1 ? "item" : "items"} with source provenance.`
      : "No normalized commerce evidence matched this plan, so its evidence coverage is unavailable.";
  const atlasMessage = plan.atlasAssessment
    ? ` Atlas ${plan.atlasAssessment.summary.headline.toLowerCase()}: ${plan.atlasAssessment.health.scoredDimensions} of ${plan.atlasAssessment.health.totalDimensions} health dimensions scored at ${Math.round(plan.atlasAssessment.confidence.score * 100)}% confidence with ${plan.atlasAssessment.freshness} evidence.`
    : "";
  const oracleMessage = plan.oracleAssessment
    ? plan.oracleAssessment.decisions[0]
      ? ` Demand & Availability compared MichaelModel with OracleModel for ${plan.oracleAssessment.decisions.length} product ${plan.oracleAssessment.decisions.length === 1 ? "decision" : "decisions"}; model disagreement and missing evidence remain explicit.`
      : " Demand & Availability found insufficient normalized demand and inventory evidence and created no forecast."
    : "";
  return `Mercury created plan v${version} with ${plan.tasks.length} ${taskLabel} across ${moduleCount} ${moduleLabel}. This plan uses deterministic routing. ${evidenceMessage}${atlasMessage}${oracleMessage}`;
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
    root_plan_id: string;
    supersedes_plan_id: string | null;
    version: number;
    summary: string;
    status: OrchestrationStatus;
    confidence: string | number;
    requires_approval: boolean;
    approval_reasons: string[];
    evidence_limitation: string;
    payload: ExecutionPlan;
    created_at: Date;
  }>>`
    select
      id,
      root_plan_id,
      supersedes_plan_id,
      version,
      summary,
      status,
      confidence,
      requires_approval,
      approval_reasons,
      evidence_limitation,
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

  const approvalRows = await sql<Array<{
    id: string;
    plan_id: string;
    status: NonNullable<ConversationPlan["approval"]>["status"];
    policy_version: string;
    decided_by: string | null;
    decision_note: string | null;
    decided_at: Date | null;
  }>>`
    select
      approval.id,
      approval.plan_id,
      approval.status,
      approval.policy_version,
      approval.decided_by,
      approval.decision_note,
      approval.decided_at
    from mercury_approvals approval
    join mercury_plans plan on plan.id = approval.plan_id
    where plan.conversation_id = ${conversationId}
      and plan.organization_id = ${principal.organizationId}
    order by approval.created_at desc
  `;

  const evidenceRows = await sql<Array<{
    plan_id: string;
    id: string;
    source_id: string;
    source_name: string;
    source_type: string;
    provider: string;
    dataset: EvidenceDataset;
    evidence_kind: string;
    source_record_reference: string | null;
    title: string;
    summary: string;
    observed_at: Date;
    ingested_at: Date;
    date_range_start: Date | null;
    date_range_end: Date | null;
    freshness: EvidenceFreshness;
    limitations: string[];
    provenance: EvidenceProvenance;
  }>>`
    select
      link.plan_id,
      item.id,
      item.source_id,
      source.display_name as source_name,
      source.source_type,
      item.provider,
      item.dataset,
      item.evidence_kind,
      item.source_record_reference,
      item.title,
      item.summary,
      item.observed_at,
      item.ingested_at,
      item.date_range_start,
      item.date_range_end,
      item.freshness,
      item.limitations,
      item.provenance
    from mercury_plan_evidence link
    join mercury_plans plan on plan.id = link.plan_id
    join mercury_evidence_items item on item.id = link.evidence_item_id
    join mercury_evidence_sources source on source.id = item.source_id
    where plan.conversation_id = ${conversationId}
      and plan.organization_id = ${principal.organizationId}
      and item.organization_id = ${principal.organizationId}
      and source.organization_id = ${principal.organizationId}
    order by item.observed_at desc
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

  const approvalsByPlan = new Map<string, ConversationPlan["approval"]>();
  for (const approval of approvalRows) {
    if (!approvalsByPlan.has(approval.plan_id)) {
      approvalsByPlan.set(approval.plan_id, {
        id: approval.id,
        status: approval.status,
        policyVersion: approval.policy_version,
        decidedBy: approval.decided_by ?? undefined,
        decisionNote: approval.decision_note ?? undefined,
        decidedAt: approval.decided_at?.toISOString(),
      });
    }
  }

  const evidenceByPlan = new Map<string, MercuryEvidenceItem[]>();
  for (const evidence of evidenceRows) {
    const items = evidenceByPlan.get(evidence.plan_id) ?? [];
    items.push({
      id: evidence.id,
      sourceId: evidence.source_id,
      sourceName: evidence.source_name,
      sourceType: evidence.source_type,
      provider: evidence.provider,
      dataset: evidence.dataset,
      kind: evidence.evidence_kind,
      sourceRecordReference: evidence.source_record_reference ?? undefined,
      title: evidence.title,
      summary: evidence.summary,
      observedAt: evidence.observed_at.toISOString(),
      ingestedAt: evidence.ingested_at.toISOString(),
      dateRangeStart: evidence.date_range_start?.toISOString(),
      dateRangeEnd: evidence.date_range_end?.toISOString(),
      freshness: classifyEvidenceFreshness(
        evidence.observed_at.toISOString(),
        freshnessPolicyFor(evidence.dataset),
      ),
      limitations: evidence.limitations ?? [],
      provenance: evidence.provenance,
    });
    evidenceByPlan.set(evidence.plan_id, items);
  }

  const decisionContexts = await getMercuryDecisionContexts({
    sql,
    organizationId: principal.organizationId,
    conversationId,
  });
  const plans = new Map<string, ConversationPlan>();
  for (const plan of planRows) {
    const evidenceItems = evidenceByPlan.get(plan.id) ?? [];
    const evidence = summarizeEvidence(evidenceItems);
    plans.set(plan.id, {
        id: plan.id,
        rootPlanId: plan.root_plan_id,
        supersedesPlanId: plan.supersedes_plan_id ?? undefined,
        version: plan.version,
        summary: plan.summary,
        status: plan.status,
        confidence: Number(plan.confidence),
        requiresApproval: plan.requires_approval,
        approvalReasons: plan.approval_reasons ?? [],
        tasks: tasksByPlan.get(plan.id) ?? [],
        plannerMode: "deterministic",
        evidence: {
          ...evidence,
          limitation:
            evidenceItems.length > 0
              ? evidence.limitation
              : plan.evidence_limitation,
        },
        atlasAssessment: plan.payload.atlasAssessment,
        oracleAssessment: plan.payload.oracleAssessment,
        decisionContext: decisionContexts.get(plan.id),
        approval: approvalsByPlan.get(plan.id),
        createdAt: plan.created_at.toISOString(),
      });
  }

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
  requestKey?: string;
  supersedesPlanId?: string;
}): Promise<MercuryConversation> {
  if (input.supersedesPlanId && !input.conversationId) {
    throw new MercuryWorkflowConflictError(
      "A plan revision must belong to an existing conversation.",
    );
  }

  const sql = requireDatabase();
  const initialResult = await orchestrate(input.message);
  const evidenceService = new CachedEvidenceQueryService(
    new PostgresEvidenceReader(sql),
    new PostgresEvidenceCache(sql, input.principal.organizationId),
  );
  const normalizedEvidence = await evidenceService.query({
    organizationId: input.principal.organizationId,
    datasets: evidenceDatasetsForCapabilities(
      initialResult.plan.tasks.map((task) => task.capability),
    ),
    limit: 50,
  });
  const evidence = summarizeEvidence(
    normalizedEvidence.map(toMercuryEvidenceItem),
  );
  const atlasResult = enrichOrchestrationWithAtlas({
    result: initialResult,
    organizationId: input.principal.organizationId,
    evidence: normalizedEvidence,
  });
  const result = enrichOrchestrationWithOracle({
    result: atlasResult,
    organizationId: input.principal.organizationId,
    evidence: normalizedEvidence,
  });
  let conversationId = input.conversationId ?? createId("conversation");
  const userMessageId = createId("message");
  const responseMessageId = createId("message");

  const transactionResult = await sql.begin(async (tx) => {
    if (input.requestKey) {
      const insertedKeys = await tx<Array<{ resource_id: string }>>`
        insert into mercury_request_keys (
          organization_id,
          request_key,
          operation,
          resource_id
        ) values (
          ${input.principal.organizationId},
          ${input.requestKey},
          'mercury.turn',
          ${conversationId}
        )
        on conflict do nothing
        returning resource_id
      `;

      if (!insertedKeys[0]) {
        const existingKeys = await tx<Array<{
          operation: string;
          resource_id: string;
        }>>`
          select operation, resource_id
          from mercury_request_keys
          where organization_id = ${input.principal.organizationId}
            and request_key = ${input.requestKey}
          limit 1
        `;
        const existingKey = existingKeys[0];
        if (
          !existingKey ||
          existingKey.operation !== "mercury.turn" ||
          (input.conversationId &&
            existingKey.resource_id !== input.conversationId)
        ) {
          throw new MercuryWorkflowConflictError(
            "This request key was already used for another operation.",
          );
        }
        return {
          duplicate: true,
          conversationId: existingKey.resource_id,
        };
      }
    }

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

    let rootPlanId = result.plan.id;
    let version = 1;

    if (input.supersedesPlanId) {
      const parentPlans = await tx<Array<{
        id: string;
        root_plan_id: string;
        version: number;
        status: OrchestrationStatus;
      }>>`
        select id, root_plan_id, version, status
        from mercury_plans
        where id = ${input.supersedesPlanId}
          and conversation_id = ${conversationId}
          and organization_id = ${input.principal.organizationId}
        limit 1
        for update
      `;
      const parentPlan = parentPlans[0];
      if (!parentPlan) throw new MercuryPlanNotFoundError();
      if (
        parentPlan.status === "running" ||
        parentPlan.status === "completed" ||
        parentPlan.status === "superseded"
      ) {
        throw new MercuryWorkflowConflictError(
          `Plan v${parentPlan.version} can no longer be revised.`,
        );
      }
      rootPlanId = parentPlan.root_plan_id;
      version = parentPlan.version + 1;
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
        request_key,
        sequence_number,
        created_at
      ) values (
        ${userMessageId},
        ${conversationId},
        ${input.principal.organizationId},
        'user',
        ${input.message},
        ${input.requestKey ?? null},
        ${userSequence},
        now()
      )
    `;

    const context: PlanPersistenceContext = {
      organizationId: input.principal.organizationId,
      conversationId,
      sourceMessageId: userMessageId,
      rootPlanId,
      supersedesPlanId: input.supersedesPlanId,
      version,
      evidence,
      actorSubjectId: input.principal.subjectId,
      actorEmail: input.principal.email,
    };
    await persistOrchestrationResult(tx, result, context);

    if (input.supersedesPlanId) {
      await tx`
        update mercury_plans
        set status = 'superseded', superseded_at = now(), updated_at = now()
        where id = ${input.supersedesPlanId}
          and organization_id = ${input.principal.organizationId}
      `;
      await tx`
        update mercury_approvals
        set status = 'superseded'
        where plan_id = ${input.supersedesPlanId}
          and organization_id = ${input.principal.organizationId}
          and status = 'pending'
      `;
      await tx`
        insert into mercury_events (
          id,
          plan_id,
          event_type,
          message,
          created_at
        ) values (
          ${createId("event")},
          ${input.supersedesPlanId},
          'plan.superseded',
          ${`Plan superseded by version ${version}. No action was executed.`},
          now()
        )
      `;
    }

    const responseContent = mercuryResponseContent(
      result.plan,
      version,
      evidence.itemCount,
    );
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
          evidenceStatus: evidence.status,
          evidenceItemCount: evidence.itemCount,
          planVersion: version,
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
    return { duplicate: false, conversationId };
  });

  conversationId = transactionResult.conversationId;

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

  const rows = await sql.begin(async (tx) => {
    const updated = await tx<Array<{ id: string }>>`
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
    if (updated[0]) {
      await appendAuditEvent(tx, {
        organizationId: input.principal.organizationId,
        ...userAuditActor(input.principal),
        action: "mercury.conversation_updated",
        resourceType: "mercury_conversation",
        resourceId: input.conversationId,
        metadata: {
          fields: [
            ...(title !== undefined ? ["title"] : []),
            ...(input.status !== undefined ? ["status"] : []),
          ],
          ...(input.status ? { status: input.status } : {}),
        },
      });
    }
    return updated;
  });

  if (!rows[0]) throw new MercuryConversationNotFoundError();
  const conversation = await getMercuryConversation(
    input.conversationId,
    input.principal,
  );
  if (!conversation) throw new MercuryConversationNotFoundError();
  return conversation;
}
