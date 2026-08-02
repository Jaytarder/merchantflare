import { randomUUID } from "node:crypto";
import type postgres from "postgres";
import type { JSONValue } from "postgres";
import type {
  Belief,
  DecisionCase,
  DecisionCaseDetail,
  DecisionHistoryEvent,
  Evidence,
  EvidenceLink,
  Experiment,
  Hypothesis,
  Intervention,
  Lesson,
  Outcome,
} from "./types";

type Json = JSONValue;

function iso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function mapCase(row: any): DecisionCase {
  return {
    id: row.id,
    organizationId: row.organization_id,
    createdBy: row.created_by,
    title: row.title,
    problem: row.problem,
    objective: row.objective,
    status: row.status,
    currentBeliefId: row.current_belief_id ?? undefined,
    risk: row.risk_level,
    reversibility: row.reversibility,
    approvalStatus: row.approval_status,
    assumptions: row.assumptions ?? [],
    confounders: row.confounders ?? [],
    expectedOutcome: row.expected_outcome ?? undefined,
    mercuryConversationId: row.mercury_conversation_id ?? undefined,
    mercuryPlanId: row.mercury_plan_id ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function mapEvidence(row: any): Evidence {
  return {
    id: row.id,
    organizationId: row.organization_id,
    decisionCaseId: row.decision_case_id,
    source: row.source,
    sourceReference: row.source_reference ?? undefined,
    statement: row.statement,
    observedAt: iso(row.observed_at),
    freshness: row.freshness,
    ownerId: row.owner_id,
    confidence: Number(row.confidence),
    grade: row.evidence_grade,
    relationships: row.relationships ?? [],
    supportingReferences: row.supporting_references ?? [],
    limitations: row.limitations ?? [],
    mercuryEvidenceItemId: row.mercury_evidence_item_id ?? undefined,
    createdAt: iso(row.created_at),
  };
}

function mapEvidenceLink(row: any): EvidenceLink {
  return {
    organizationId: row.organization_id,
    evidenceId: row.evidence_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    relationship: row.relationship,
    rationale: row.rationale ?? undefined,
    createdBy: row.created_by,
    createdAt: iso(row.created_at),
  };
}

function mapBelief(row: any): Belief {
  return {
    id: row.id,
    organizationId: row.organization_id,
    decisionCaseId: row.decision_case_id,
    statement: row.statement,
    confidence: Number(row.confidence),
    missingEvidence: row.missing_evidence ?? [],
    assumptions: row.assumptions ?? [],
    whatWouldChange: row.what_would_change,
    ownerId: row.owner_id,
    version: row.version,
    status: row.status,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function mapHypothesis(row: any): Hypothesis {
  return {
    id: row.id,
    organizationId: row.organization_id,
    decisionCaseId: row.decision_case_id,
    statement: row.statement,
    likelihood: Number(row.likelihood),
    confidence: Number(row.confidence),
    expectedValue: row.expected_value === null ? undefined : Number(row.expected_value),
    estimatedRisk: row.estimated_risk,
    suggestedExperiment: row.suggested_experiment ?? undefined,
    status: row.status,
    createdBy: row.created_by,
    createdAt: iso(row.created_at),
  };
}

function mapExperiment(row: any): Experiment {
  return {
    id: row.id,
    organizationId: row.organization_id,
    decisionCaseId: row.decision_case_id,
    hypothesisId: row.hypothesis_id,
    title: row.title,
    expectedLift: row.expected_lift === null ? undefined : Number(row.expected_lift),
    expectedRisk: row.expected_risk,
    observationWindow: row.observation_window,
    rollbackPlan: row.rollback_plan,
    successCriteria: row.success_criteria,
    approvalStatus: row.approval_status,
    status: row.status,
    executionTime: row.execution_time ? iso(row.execution_time) : undefined,
    createdBy: row.created_by,
    createdAt: iso(row.created_at),
  };
}

function mapIntervention(row: any): Intervention {
  return {
    id: row.id,
    organizationId: row.organization_id,
    experimentId: row.experiment_id,
    description: row.description,
    exactIntent: row.exact_intent,
    reversibility: row.reversibility,
    rollbackPlan: row.rollback_plan,
    status: row.status,
    createdBy: row.created_by,
    executedBy: row.executed_by ?? undefined,
    executedAt: row.executed_at ? iso(row.executed_at) : undefined,
    createdAt: iso(row.created_at),
  };
}

function mapOutcome(row: any): Outcome {
  return {
    id: row.id,
    organizationId: row.organization_id,
    decisionCaseId: row.decision_case_id,
    experimentId: row.experiment_id,
    observedResult: row.observed_result,
    evidenceGrade: row.evidence_grade,
    measuredImpact: row.measured_impact,
    unexpectedEffects: row.unexpected_effects ?? [],
    posteriorConfidence: Number(row.posterior_confidence),
    updatedBeliefId: row.updated_belief_id ?? undefined,
    observedAt: iso(row.observed_at),
    recordedBy: row.recorded_by,
    createdAt: iso(row.created_at),
  };
}

function mapLesson(row: any): Lesson {
  return {
    id: row.id,
    organizationId: row.organization_id,
    decisionCaseId: row.decision_case_id,
    outcomeId: row.outcome_id,
    statement: row.statement,
    applicability: row.applicability ?? [],
    limitations: row.limitations ?? [],
    confidence: Number(row.confidence),
    createdBy: row.created_by,
    createdAt: iso(row.created_at),
  };
}

export class PostgresDecisionRepository {
  constructor(private readonly sql: postgres.Sql) {}

  async transaction<T>(operation: (tx: PostgresDecisionRepository) => Promise<T>) {
    return this.sql.begin((sql) =>
      operation(new PostgresDecisionRepository(sql as unknown as postgres.Sql)),
    );
  }

  async listCases(organizationId: string, limit = 50): Promise<DecisionCase[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const rows = await this.sql<Array<any>>`
      select * from decision_cases
      where organization_id = ${organizationId}
      order by updated_at desc, id desc
      limit ${safeLimit}
    `;
    return rows.map(mapCase);
  }

  async findCase(organizationId: string, caseId: string): Promise<DecisionCase | null> {
    const rows = await this.sql<Array<any>>`
      select * from decision_cases
      where organization_id = ${organizationId} and id = ${caseId}
      limit 1
    `;
    return rows[0] ? mapCase(rows[0]) : null;
  }

  async createCase(input: Omit<DecisionCase, "createdAt" | "updatedAt">) {
    const rows = await this.sql<Array<any>>`
      insert into decision_cases (
        id, organization_id, created_by, title, problem, objective, status,
        risk_level, reversibility, approval_status, assumptions, confounders,
        expected_outcome, mercury_conversation_id, mercury_plan_id, metadata
      ) values (
        ${input.id}, ${input.organizationId}, ${input.createdBy}, ${input.title},
        ${input.problem}, ${input.objective}, ${input.status}, ${input.risk},
        ${input.reversibility}, ${input.approvalStatus},
        ${this.sql.json(input.assumptions as Json)}, ${this.sql.json(input.confounders as Json)},
        ${input.expectedOutcome ?? null}, ${input.mercuryConversationId ?? null},
        ${input.mercuryPlanId ?? null}, ${this.sql.json(input.metadata as Json)}
      ) returning *
    `;
    return mapCase(rows[0]);
  }

  async reuseApplicableLessons(input: { organizationId: string; decisionCaseId: string; text: string; reusedBy: string }) {
    const rows = await this.sql<Array<any>>`
      insert into decision_lesson_reuse (
        organization_id, lesson_id, source_decision_case_id,
        target_decision_case_id, rationale, reused_by
      )
      select lesson.organization_id, lesson.id, lesson.decision_case_id,
        ${input.decisionCaseId}, 'Applicability matched the new Decision Case authoring context.',
        ${input.reusedBy}
      from decision_lessons lesson
      where lesson.organization_id = ${input.organizationId}
        and lesson.decision_case_id <> ${input.decisionCaseId}
        and exists (
          select 1 from jsonb_array_elements_text(lesson.applicability) tag
          where length(trim(tag)) >= 3 and position(lower(trim(tag)) in lower(${input.text})) > 0
        )
      on conflict (organization_id, lesson_id, target_decision_case_id) do nothing
      returning lesson_id
    `;
    return rows.map((row) => String(row.lesson_id));
  }

  async createEvidence(input: Omit<Evidence, "createdAt">) {
    const rows = await this.sql<Array<any>>`
      insert into decision_evidence (
        id, organization_id, decision_case_id, source, source_reference,
        statement, observed_at, freshness, owner_id, confidence, evidence_grade,
        relationships, supporting_references, limitations, mercury_evidence_item_id
      ) values (
        ${input.id}, ${input.organizationId}, ${input.decisionCaseId}, ${input.source},
        ${input.sourceReference ?? null}, ${input.statement}, ${input.observedAt},
        ${input.freshness}, ${input.ownerId}, ${input.confidence}, ${input.grade},
        ${this.sql.json(input.relationships)}, ${this.sql.json(input.supportingReferences)},
        ${this.sql.json(input.limitations)}, ${input.mercuryEvidenceItemId ?? null}
      ) returning *
    `;
    return mapEvidence(rows[0]);
  }

  async createBelief(input: Omit<Belief, "createdAt" | "updatedAt">, changeReason: string) {
    const rows = await this.sql<Array<any>>`
      insert into decision_beliefs (
        id, organization_id, decision_case_id, statement, confidence,
        missing_evidence, assumptions, what_would_change, owner_id, version, status
      ) values (
        ${input.id}, ${input.organizationId}, ${input.decisionCaseId}, ${input.statement},
        ${input.confidence}, ${this.sql.json(input.missingEvidence)},
        ${this.sql.json(input.assumptions)}, ${input.whatWouldChange}, ${input.ownerId},
        ${input.version}, ${input.status}
      ) returning *
    `;
    await this.sql`
      insert into decision_belief_versions (
        belief_id, organization_id, version, statement, confidence,
        missing_evidence, assumptions, what_would_change, changed_by, change_reason
      ) values (
        ${input.id}, ${input.organizationId}, ${input.version}, ${input.statement},
        ${input.confidence}, ${this.sql.json(input.missingEvidence)},
        ${this.sql.json(input.assumptions)}, ${input.whatWouldChange},
        ${input.ownerId}, ${changeReason}
      )
    `;
    await this.sql`
      update decision_cases set current_belief_id = ${input.id}, updated_at = now()
      where id = ${input.decisionCaseId} and organization_id = ${input.organizationId}
    `;
    return mapBelief(rows[0]);
  }

  async reviseBelief(input: {
    previous: Belief;
    statement: string;
    confidence: number;
    missingEvidence: string[];
    assumptions: string[];
    whatWouldChange: string;
    changedBy: string;
    changeReason: string;
    evidenceIds: string[];
  }) {
    const nextVersion = input.previous.version + 1;
    const rows = await this.sql<Array<any>>`
      update decision_beliefs
      set statement = ${input.statement},
          confidence = ${input.confidence},
          missing_evidence = ${this.sql.json(input.missingEvidence)},
          assumptions = ${this.sql.json(input.assumptions)},
          what_would_change = ${input.whatWouldChange},
          owner_id = ${input.changedBy},
          version = ${nextVersion},
          updated_at = now()
      where id = ${input.previous.id}
        and organization_id = ${input.previous.organizationId}
        and version = ${input.previous.version}
      returning *
    `;
    if (!rows[0]) return null;
    await this.sql`
      insert into decision_belief_versions (
        belief_id, organization_id, version, statement, confidence,
        missing_evidence, assumptions, what_would_change, changed_by, change_reason
      ) values (
        ${input.previous.id}, ${input.previous.organizationId}, ${nextVersion},
        ${input.statement}, ${input.confidence}, ${this.sql.json(input.missingEvidence)},
        ${this.sql.json(input.assumptions)}, ${input.whatWouldChange},
        ${input.changedBy}, ${input.changeReason}
      )
    `;
    await this.sql`
      insert into decision_confidence_history (
        organization_id, decision_case_id, entity_type, entity_id,
        prior_confidence, new_confidence, reason, evidence_ids, changed_by
      ) values (
        ${input.previous.organizationId}, ${input.previous.decisionCaseId},
        'belief', ${input.previous.id}, ${input.previous.confidence},
        ${input.confidence}, ${input.changeReason},
        ${this.sql.json(input.evidenceIds)}, ${input.changedBy}
      )
    `;
    return mapBelief(rows[0]);
  }

  async linkEvidence(input: {
    organizationId: string;
    evidenceId: string;
    entityType: "belief" | "hypothesis" | "experiment" | "outcome";
    entityId: string;
    relationship: "supports" | "counters" | "informs" | "confounds";
    rationale?: string;
    createdBy: string;
  }) {
    await this.sql`
      insert into decision_evidence_links (
        organization_id, evidence_id, entity_type, entity_id,
        relationship, rationale, created_by
      ) values (
        ${input.organizationId}, ${input.evidenceId}, ${input.entityType},
        ${input.entityId}, ${input.relationship}, ${input.rationale ?? null},
        ${input.createdBy}
      )
      on conflict do nothing
    `;
    return input;
  }

  async createHypothesis(input: Omit<Hypothesis, "createdAt">) {
    const rows = await this.sql<Array<any>>`
      insert into decision_hypotheses (
        id, organization_id, decision_case_id, statement, likelihood, confidence,
        expected_value, estimated_risk, suggested_experiment, status, created_by
      ) values (
        ${input.id}, ${input.organizationId}, ${input.decisionCaseId}, ${input.statement},
        ${input.likelihood}, ${input.confidence}, ${input.expectedValue ?? null},
        ${input.estimatedRisk}, ${input.suggestedExperiment ?? null}, ${input.status},
        ${input.createdBy}
      ) returning *
    `;
    return mapHypothesis(rows[0]);
  }

  async createExperiment(input: Omit<Experiment, "createdAt">) {
    const rows = await this.sql<Array<any>>`
      insert into decision_experiments (
        id, organization_id, decision_case_id, hypothesis_id, title, expected_lift,
        expected_risk, observation_window, rollback_plan, success_criteria,
        approval_status, status, execution_time, created_by
      ) values (
        ${input.id}, ${input.organizationId}, ${input.decisionCaseId}, ${input.hypothesisId},
        ${input.title}, ${input.expectedLift ?? null}, ${input.expectedRisk},
        ${this.sql.json(input.observationWindow)}, ${input.rollbackPlan},
        ${this.sql.json(input.successCriteria)}, ${input.approvalStatus},
        ${input.status}, ${input.executionTime ?? null}, ${input.createdBy}
      ) returning *
    `;
    return mapExperiment(rows[0]);
  }

  async createPrediction(input: {
    id: string; organizationId: string; decisionCaseId: string; beliefId: string;
    experimentId: string; confidence: number; predictedAt: string;
    successCriteria: Experiment["successCriteria"]; createdBy: string;
  }) {
    const rows = await this.sql<Array<any>>`
      insert into decision_predictions (
        id, organization_id, decision_case_id, belief_id, experiment_id,
        confidence, predicted_at, success_criteria, created_by
      ) values (
        ${input.id}, ${input.organizationId}, ${input.decisionCaseId}, ${input.beliefId},
        ${input.experimentId}, ${input.confidence}, ${input.predictedAt},
        ${this.sql.json(input.successCriteria)}, ${input.createdBy}
      ) returning *
    `;
    return rows[0];
  }

  async resolvePrediction(input: {
    organizationId: string; experimentId: string; succeeded: boolean;
    posteriorConfidence: number; resolvedAt: string;
  }) {
    const rows = await this.sql<Array<any>>`
      update decision_predictions
      set succeeded = ${input.succeeded}, posterior_confidence = ${input.posteriorConfidence},
          resolved_at = ${input.resolvedAt}
      where organization_id = ${input.organizationId}
        and experiment_id = ${input.experimentId}
        and resolved_at is null
      returning *
    `;
    return rows[0] ?? null;
  }

  async updateCaseStatus(input: {
    organizationId: string; caseId: string; from: DecisionCase["status"];
    to: DecisionCase["status"];
  }) {
    const rows = await this.sql<Array<any>>`
      update decision_cases set status = ${input.to}, updated_at = now(),
        closed_at = case when ${input.to} = 'closed' then now() else closed_at end
      where organization_id = ${input.organizationId} and id = ${input.caseId}
        and status = ${input.from}
      returning *
    `;
    return rows[0] ? mapCase(rows[0]) : null;
  }

  async recordExecution(input: {
    id: string; organizationId: string; decisionCaseId: string; experimentId: string;
    interventionId: string; idempotencyKey: string; executionMode: "manual" | "provider";
    result: Record<string, unknown>; executedBy: string; startedAt: string;
  }) {
    const rows = await this.sql<Array<any>>`
      insert into decision_executions (
        id, organization_id, decision_case_id, experiment_id, intervention_id,
        idempotency_key, status, execution_mode, result, executed_by, started_at, completed_at
      )
      select ${input.id}, ${input.organizationId}, ${input.decisionCaseId},
        experiment.id, intervention.id, ${input.idempotencyKey}, 'completed',
        ${input.executionMode}, ${this.sql.json(input.result as Json)}, ${input.executedBy},
        ${input.startedAt}, ${input.startedAt}
      from decision_experiments experiment
      join decision_interventions intervention
        on intervention.experiment_id = experiment.id and intervention.organization_id = experiment.organization_id
      where experiment.id = ${input.experimentId}
        and intervention.id = ${input.interventionId}
        and experiment.organization_id = ${input.organizationId}
        and experiment.decision_case_id = ${input.decisionCaseId}
        and intervention.status = 'approved'
        and (experiment.approval_status = 'approved' or experiment.approval_status = 'not_required')
        and experiment.status in ('approved', 'draft', 'running')
      on conflict (organization_id, idempotency_key) do nothing
      returning *
    `;
    let execution = rows[0];
    if (!execution) {
      const existing = await this.sql<Array<any>>`
        select * from decision_executions
        where organization_id = ${input.organizationId}
          and idempotency_key = ${input.idempotencyKey}
          and decision_case_id = ${input.decisionCaseId}
          and experiment_id = ${input.experimentId}
          and intervention_id = ${input.interventionId}
        limit 1
      `;
      execution = existing[0];
    }
    if (!execution) return null;
    await this.sql`
      update decision_experiments set status = 'running', execution_time = ${input.startedAt}, updated_at = now()
      where id = ${input.experimentId} and organization_id = ${input.organizationId}
    `;
    await this.sql`
      update decision_interventions set status = 'executed', executed_by = ${input.executedBy}, executed_at = ${input.startedAt}
      where id = ${input.interventionId} and organization_id = ${input.organizationId}
    `;
    return execution;
  }

  async calibrationData(organizationId: string) {
    const [predictions, counts] = await Promise.all([
      this.sql<Array<any>>`
        select confidence, succeeded, predicted_at, resolved_at, posterior_confidence
        from decision_predictions where organization_id = ${organizationId} and resolved_at is not null
        order by predicted_at
      `,
      this.sql<Array<any>>`
        select
          (select count(*)::int from decision_cases where organization_id = ${organizationId}) as case_count,
          (select count(*)::int from decision_evidence where organization_id = ${organizationId}) as evidence_count,
          (select count(*)::int from decision_experiments where organization_id = ${organizationId}) as experiment_count,
          (select count(*)::int from decision_lessons where organization_id = ${organizationId}) as lesson_count,
          (select count(*)::int from decision_lesson_reuse where organization_id = ${organizationId}) as reuse_count,
          (select count(*)::int from decision_evidence where organization_id = ${organizationId} and freshness in ('stale','unavailable')) as stale_evidence_count,
          (select avg(extract(epoch from (closed_at - created_at)) / 3600) from decision_cases where organization_id = ${organizationId} and closed_at is not null) as latency_hours,
          (select count(*)::int from decision_cases where organization_id = ${organizationId} and created_at >= now() - interval '30 days') as throughput_30d
      `,
    ]);
    return { predictions, counts: counts[0] };
  }

  async decideExperimentApproval(input: {
    organizationId: string;
    experimentId: string;
    decision: "approved" | "rejected";
    decidedBy: string;
  }) {
    const rows = await this.sql<Array<any>>`
      update decision_experiments
      set approval_status = ${input.decision},
          status = case when ${input.decision} = 'approved' then 'approved' else 'cancelled' end,
          approved_by = ${input.decidedBy},
          approved_at = now(),
          updated_at = now()
      where id = ${input.experimentId}
        and organization_id = ${input.organizationId}
        and approval_status = 'pending'
      returning *
    `;
    if (rows[0] && input.decision === "approved") {
      await this.sql`
        update decision_interventions set status = 'approved'
        where organization_id = ${input.organizationId}
          and experiment_id = ${input.experimentId}
          and status = 'proposed'
      `;
    }
    return rows[0] ? mapExperiment(rows[0]) : null;
  }

  async createIntervention(input: Omit<Intervention, "createdAt">) {
    const rows = await this.sql<Array<any>>`
      insert into decision_interventions (
        id, organization_id, experiment_id, description, exact_intent,
        reversibility, rollback_plan, status, created_by, executed_by, executed_at
      ) values (
        ${input.id}, ${input.organizationId}, ${input.experimentId}, ${input.description},
        ${this.sql.json(input.exactIntent as Json)}, ${input.reversibility},
        ${input.rollbackPlan}, ${input.status}, ${input.createdBy},
        ${input.executedBy ?? null}, ${input.executedAt ?? null}
      ) returning *
    `;
    return mapIntervention(rows[0]);
  }

  async createOutcome(input: Omit<Outcome, "createdAt">) {
    const rows = await this.sql<Array<any>>`
      insert into decision_outcomes (
        id, organization_id, decision_case_id, experiment_id, observed_result,
        evidence_grade, measured_impact, unexpected_effects, posterior_confidence,
        updated_belief_id, observed_at, recorded_by
      ) values (
        ${input.id}, ${input.organizationId}, ${input.decisionCaseId}, ${input.experimentId},
        ${input.observedResult}, ${input.evidenceGrade},
        ${this.sql.json(input.measuredImpact as Json)}, ${this.sql.json(input.unexpectedEffects)},
        ${input.posteriorConfidence}, ${input.updatedBeliefId ?? null},
        ${input.observedAt}, ${input.recordedBy}
      ) returning *
    `;
    await this.sql`
      update decision_experiments set status = 'completed', updated_at = now()
      where id = ${input.experimentId} and organization_id = ${input.organizationId}
    `;
    return mapOutcome(rows[0]);
  }

  async createLesson(input: Omit<Lesson, "createdAt">) {
    const rows = await this.sql<Array<any>>`
      insert into decision_lessons (
        id, organization_id, decision_case_id, outcome_id, statement,
        applicability, limitations, confidence, created_by
      ) values (
        ${input.id}, ${input.organizationId}, ${input.decisionCaseId}, ${input.outcomeId},
        ${input.statement}, ${this.sql.json(input.applicability)},
        ${this.sql.json(input.limitations)}, ${input.confidence}, ${input.createdBy}
      ) returning *
    `;
    return mapLesson(rows[0]);
  }

  async appendHistory(input: Omit<DecisionHistoryEvent, "id" | "occurredAt"> & { id?: string }) {
    const id = input.id ?? randomUUID();
    const rows = await this.sql<Array<any>>`
      insert into decision_history_events (
        id, organization_id, decision_case_id, actor_id, event_type,
        entity_type, entity_id, summary, metadata
      ) values (
        ${id}, ${input.organizationId}, ${input.decisionCaseId}, ${input.actorId},
        ${input.eventType}, ${input.entityType}, ${input.entityId}, ${input.summary},
        ${this.sql.json(input.metadata as Json)}
      ) returning *
    `;
    const row = rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      decisionCaseId: row.decision_case_id,
      actorId: row.actor_id,
      eventType: row.event_type,
      entityType: row.entity_type,
      entityId: row.entity_id,
      summary: row.summary,
      metadata: row.metadata,
      occurredAt: iso(row.occurred_at),
    } satisfies DecisionHistoryEvent;
  }

  async listHistory(organizationId: string, caseId?: string, limit = 100) {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const rows = await this.sql<Array<any>>`
      select * from decision_history_events
      where organization_id = ${organizationId}
        and (${caseId ?? null}::uuid is null or decision_case_id = ${caseId ?? null})
      order by occurred_at desc, id desc
      limit ${safeLimit}
    `;
    return rows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      decisionCaseId: row.decision_case_id,
      actorId: row.actor_id,
      eventType: row.event_type,
      entityType: row.entity_type,
      entityId: row.entity_id,
      summary: row.summary,
      metadata: row.metadata,
      occurredAt: iso(row.occurred_at),
    } satisfies DecisionHistoryEvent));
  }

  async getCaseDetail(organizationId: string, caseId: string): Promise<DecisionCaseDetail | null> {
    const decisionCase = await this.findCase(organizationId, caseId);
    if (!decisionCase) return null;
    const [evidence, evidenceLinks, beliefs, hypotheses, experiments, interventions, outcomes, lessons, reusedLessons] =
      await Promise.all([
        this.sql<Array<any>>`select * from decision_evidence where organization_id = ${organizationId} and decision_case_id = ${caseId} order by observed_at desc`,
        this.sql<Array<any>>`select link.* from decision_evidence_links link join decision_evidence evidence on evidence.id = link.evidence_id and evidence.organization_id = link.organization_id where link.organization_id = ${organizationId} and evidence.decision_case_id = ${caseId} order by link.created_at`,
        this.sql<Array<any>>`select * from decision_beliefs where organization_id = ${organizationId} and decision_case_id = ${caseId} order by version desc`,
        this.sql<Array<any>>`select * from decision_hypotheses where organization_id = ${organizationId} and decision_case_id = ${caseId} order by created_at`,
        this.sql<Array<any>>`select * from decision_experiments where organization_id = ${organizationId} and decision_case_id = ${caseId} order by created_at`,
        this.sql<Array<any>>`select intervention.* from decision_interventions intervention join decision_experiments experiment on experiment.id = intervention.experiment_id and experiment.organization_id = intervention.organization_id where intervention.organization_id = ${organizationId} and experiment.decision_case_id = ${caseId} order by intervention.created_at`,
        this.sql<Array<any>>`select * from decision_outcomes where organization_id = ${organizationId} and decision_case_id = ${caseId} order by observed_at`,
        this.sql<Array<any>>`select * from decision_lessons where organization_id = ${organizationId} and decision_case_id = ${caseId} order by created_at`,
        this.sql<Array<any>>`select lesson.* from decision_lesson_reuse reuse join decision_lessons lesson on lesson.id = reuse.lesson_id and lesson.organization_id = reuse.organization_id where reuse.organization_id = ${organizationId} and reuse.target_decision_case_id = ${caseId} order by reuse.reused_at`,
      ]);
    return {
      ...decisionCase,
      evidence: evidence.map(mapEvidence),
      evidenceLinks: evidenceLinks.map(mapEvidenceLink),
      beliefs: beliefs.map(mapBelief),
      hypotheses: hypotheses.map(mapHypothesis),
      experiments: experiments.map(mapExperiment),
      interventions: interventions.map(mapIntervention),
      outcomes: outcomes.map(mapOutcome),
      lessons: lessons.map(mapLesson),
      reusedLessons: reusedLessons.map(mapLesson),
    };
  }
}
