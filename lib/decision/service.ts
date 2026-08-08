import { randomUUID } from "node:crypto";
import type { OrganizationPrincipal } from "../platform/authorization";
import { requirePermission } from "../platform/authorization";
import { PlatformNotFoundError, PlatformValidationError } from "../platform/errors";
import { PostgresDecisionRepository } from "./repository";
import { calculateCalibration } from "./calibration";
import { reasonAboutDecision } from "./reasoning";
import { assertLifecycleReady } from "./lifecycle";
import { challengeDecision } from "./challenge";
import type {
  ApprovalStatus,
  DecisionCase,
  EvidenceFreshness,
  Experiment,
  Intervention,
  RiskLevel,
} from "./types";
import {
  assertCompetingHypotheses,
  classifyOutcomeClaim,
  optionalText,
  requireConfidence,
  requireEvidenceGrade,
  requireIsoTimestamp,
  requireStringList,
  requireText,
} from "./validation";

const risks = ["low", "medium", "high", "critical"] as const;
const freshnessValues = ["current", "delayed", "stale", "unavailable"] as const;

function oneOf<T extends readonly string[]>(
  value: unknown,
  values: T,
  field: string,
): T[number] {
  if (typeof value !== "string" || !values.includes(value)) {
    throw new PlatformValidationError(
      `${field} must be one of: ${values.join(", ")}.`,
    );
  }
  return value;
}

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PlatformValidationError(`${field} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function caseId(body: Record<string, unknown>) {
  return requireText(body.decisionCaseId, "decisionCaseId", 64);
}

async function requireCase(
  repository: PostgresDecisionRepository,
  principal: OrganizationPrincipal,
  id: string,
) {
  const decisionCase = await repository.findCase(principal.organizationId, id);
  if (!decisionCase) throw new PlatformNotFoundError("Decision Case");
  return decisionCase;
}

async function history(
  repository: PostgresDecisionRepository,
  principal: OrganizationPrincipal,
  input: {
    caseId: string;
    eventType: string;
    entityType: string;
    entityId: string;
    summary: string;
    metadata?: Record<string, unknown>;
  },
) {
  await repository.appendHistory({
    organizationId: principal.organizationId,
    decisionCaseId: input.caseId,
    actorId: principal.subjectId,
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId,
    summary: input.summary,
    metadata: input.metadata ?? {},
  });
}

export async function createDecisionCase(
  repository: PostgresDecisionRepository,
  principal: OrganizationPrincipal,
  raw: unknown,
) {
  requirePermission(principal, "decisions.write");
  const body = object(raw, "request");
  const id = randomUUID();
  const risk = oneOf(body.risk ?? "medium", risks, "risk") as RiskLevel;
  const reversibility = oneOf(
    body.reversibility ?? "unknown",
    ["easy", "moderate", "difficult", "irreversible", "unknown"] as const,
    "reversibility",
  );
  const approvalStatus: ApprovalStatus =
    risk === "high" || risk === "critical" || reversibility === "irreversible"
      ? "pending"
      : "not_required";
  return repository.transaction(async (tx) => {
    const decisionCase = await tx.createCase({
      id,
      organizationId: principal.organizationId,
      createdBy: principal.subjectId,
      title: requireText(body.title, "title", 200),
      problem: requireText(body.problem, "problem"),
      objective: requireText(body.objective, "objective"),
      status: "draft",
      risk,
      reversibility,
      approvalStatus,
      assumptions: requireStringList(body.assumptions ?? [], "assumptions"),
      confounders: requireStringList(body.confounders ?? [], "confounders"),
      expectedOutcome: optionalText(body.expectedOutcome, "expectedOutcome"),
      mercuryConversationId: optionalText(body.mercuryConversationId, "mercuryConversationId", 128),
      mercuryPlanId: optionalText(body.mercuryPlanId, "mercuryPlanId", 128),
      metadata: body.metadata === undefined ? {} : object(body.metadata, "metadata"),
    });
    await history(tx, principal, {
      caseId: id,
      eventType: "decision_case.created",
      entityType: "decision_case",
      entityId: id,
      summary: "Decision Case created.",
      metadata: { risk, reversibility, approvalStatus },
    });
    const reusedLessonIds = await tx.reuseApplicableLessons({
      organizationId: principal.organizationId,
      decisionCaseId: id,
      text: `${decisionCase.title} ${decisionCase.problem} ${decisionCase.objective}`,
      reusedBy: principal.subjectId,
    });
    for (const lessonId of reusedLessonIds) {
      await history(tx, principal, {
        caseId: id,
        eventType: "lesson.reused",
        entityType: "lesson",
        entityId: lessonId,
        summary: "An applicable prior lesson was linked to the new Decision Case.",
        metadata: { lessonId },
      });
    }
    return decisionCase;
  });
}

export async function createDecisionEvidence(
  repository: PostgresDecisionRepository,
  principal: OrganizationPrincipal,
  raw: unknown,
) {
  requirePermission(principal, "decisions.write");
  const body = object(raw, "request");
  const decisionCaseId = caseId(body);
  await requireCase(repository, principal, decisionCaseId);
  const id = randomUUID();
  return repository.transaction(async (tx) => {
    const evidence = await tx.createEvidence({
      id,
      organizationId: principal.organizationId,
      decisionCaseId,
      source: requireText(body.source, "source", 500),
      sourceReference: optionalText(body.sourceReference, "sourceReference", 1_000),
      statement: requireText(body.statement, "statement"),
      observedAt: requireIsoTimestamp(body.observedAt, "observedAt"),
      freshness: oneOf(body.freshness, freshnessValues, "freshness") as EvidenceFreshness,
      ownerId: principal.subjectId,
      confidence: requireConfidence(body.confidence),
      grade: requireEvidenceGrade(body.evidenceGrade),
      relationships: requireStringList(body.relationships ?? [], "relationships"),
      supportingReferences: requireStringList(
        body.supportingReferences ?? [],
        "supportingReferences",
      ),
      limitations: requireStringList(body.limitations ?? [], "limitations"),
      mercuryEvidenceItemId: optionalText(
        body.mercuryEvidenceItemId,
        "mercuryEvidenceItemId",
        128,
      ),
    });
    await history(tx, principal, {
      caseId: decisionCaseId,
      eventType: "evidence.recorded",
      entityType: "evidence",
      entityId: id,
      summary: "Evidence recorded with provenance and causal grade.",
      metadata: { grade: evidence.grade, freshness: evidence.freshness },
    });
    return evidence;
  });
}

export async function createDecisionBelief(
  repository: PostgresDecisionRepository,
  principal: OrganizationPrincipal,
  raw: unknown,
) {
  requirePermission(principal, "decisions.write");
  const body = object(raw, "request");
  const decisionCaseId = caseId(body);
  const detail = await repository.getCaseDetail(principal.organizationId, decisionCaseId);
  if (!detail) throw new PlatformNotFoundError("Decision Case");
  if (body.recommendation === true) assertCompetingHypotheses(detail.hypotheses);
  const id = randomUUID();
  return repository.transaction(async (tx) => {
    const belief = await tx.createBelief(
      {
        id,
        organizationId: principal.organizationId,
        decisionCaseId,
        statement: requireText(body.statement, "statement"),
        confidence: requireConfidence(body.confidence),
        missingEvidence: requireStringList(body.missingEvidence ?? [], "missingEvidence"),
        assumptions: requireStringList(body.assumptions ?? [], "assumptions"),
        whatWouldChange: requireText(body.whatWouldChange, "whatWouldChange"),
        ownerId: principal.subjectId,
        version: 1,
        status: "active",
      },
      requireText(body.changeReason ?? "Initial belief", "changeReason", 500),
    );
    await history(tx, principal, {
      caseId: decisionCaseId,
      eventType: "belief.created",
      entityType: "belief",
      entityId: id,
      summary: "A falsifiable belief was recorded.",
      metadata: { confidence: belief.confidence },
    });
    return belief;
  });
}

export async function reviseDecisionBelief(
  repository: PostgresDecisionRepository,
  principal: OrganizationPrincipal,
  beliefId: string,
  raw: unknown,
) {
  requirePermission(principal, "decisions.write");
  const body = object(raw, "request");
  const decisionCaseId = caseId(body);
  const detail = await repository.getCaseDetail(principal.organizationId, decisionCaseId);
  if (!detail) throw new PlatformNotFoundError("Decision Case");
  const previous = detail.beliefs.find((belief) => belief.id === beliefId);
  if (!previous) throw new PlatformNotFoundError("Belief");
  const evidenceIds = requireStringList(body.evidenceIds ?? [], "evidenceIds");
  for (const evidenceId of evidenceIds) {
    if (!detail.evidence.some((evidence) => evidence.id === evidenceId)) {
      throw new PlatformNotFoundError("Evidence");
    }
  }
  return repository.transaction(async (tx) => {
    const belief = await tx.reviseBelief({
      previous,
      statement: requireText(body.statement, "statement"),
      confidence: requireConfidence(body.confidence),
      missingEvidence: requireStringList(body.missingEvidence ?? [], "missingEvidence"),
      assumptions: requireStringList(body.assumptions ?? [], "assumptions"),
      whatWouldChange: requireText(body.whatWouldChange, "whatWouldChange"),
      changedBy: principal.subjectId,
      changeReason: requireText(body.changeReason, "changeReason", 1_000),
      evidenceIds,
    });
    if (!belief) {
      throw new PlatformValidationError(
        "The belief changed concurrently. Reload it before revising.",
      );
    }
    await history(tx, principal, {
      caseId: decisionCaseId,
      eventType: "belief.revised",
      entityType: "belief",
      entityId: beliefId,
      summary: "A belief and its calibrated confidence were revised.",
      metadata: {
        priorConfidence: previous.confidence,
        posteriorConfidence: belief.confidence,
        version: belief.version,
        evidenceIds,
      },
    });
    return belief;
  });
}

export async function linkDecisionEvidence(
  repository: PostgresDecisionRepository,
  principal: OrganizationPrincipal,
  raw: unknown,
) {
  requirePermission(principal, "decisions.write");
  const body = object(raw, "request");
  const decisionCaseId = caseId(body);
  const detail = await repository.getCaseDetail(principal.organizationId, decisionCaseId);
  if (!detail) throw new PlatformNotFoundError("Decision Case");
  const evidenceId = requireText(body.evidenceId, "evidenceId", 64);
  if (!detail.evidence.some((evidence) => evidence.id === evidenceId)) {
    throw new PlatformNotFoundError("Evidence");
  }
  const entityType = oneOf(
    body.entityType,
    ["belief", "hypothesis", "experiment", "outcome"] as const,
    "entityType",
  );
  const entityId = requireText(body.entityId, "entityId", 64);
  const collections = {
    belief: detail.beliefs,
    hypothesis: detail.hypotheses,
    experiment: detail.experiments,
    outcome: detail.outcomes,
  };
  if (!collections[entityType].some((entity) => entity.id === entityId)) {
    throw new PlatformNotFoundError(entityType);
  }
  const relationship = oneOf(
    body.relationship,
    ["supports", "counters", "informs", "confounds"] as const,
    "relationship",
  );
  return repository.transaction(async (tx) => {
    const link = await tx.linkEvidence({
      organizationId: principal.organizationId,
      evidenceId,
      entityType,
      entityId,
      relationship,
      rationale: optionalText(body.rationale, "rationale", 1_000),
      createdBy: principal.subjectId,
    });
    await history(tx, principal, {
      caseId: decisionCaseId,
      eventType: "evidence.linked",
      entityType,
      entityId,
      summary:
        relationship === "counters" || relationship === "confounds"
          ? "Counter-evidence was attached to challenge the current reasoning."
          : "Supporting evidence was attached to the reasoning record.",
      metadata: { evidenceId, relationship },
    });
    return link;
  });
}

export async function createDecisionHypothesis(
  repository: PostgresDecisionRepository,
  principal: OrganizationPrincipal,
  raw: unknown,
) {
  requirePermission(principal, "decisions.write");
  const body = object(raw, "request");
  const decisionCaseId = caseId(body);
  await requireCase(repository, principal, decisionCaseId);
  const id = randomUUID();
  return repository.transaction(async (tx) => {
    const hypothesis = await tx.createHypothesis({
      id,
      organizationId: principal.organizationId,
      decisionCaseId,
      statement: requireText(body.statement, "statement"),
      likelihood: requireConfidence(body.likelihood, "likelihood"),
      confidence: requireConfidence(body.confidence),
      expectedValue:
        body.expectedValue === undefined
          ? undefined
          : Number(body.expectedValue),
      estimatedRisk: oneOf(body.estimatedRisk, risks, "estimatedRisk") as RiskLevel,
      suggestedExperiment: optionalText(body.suggestedExperiment, "suggestedExperiment"),
      status: "active",
      createdBy: principal.subjectId,
    });
    if (
      hypothesis.expectedValue !== undefined &&
      !Number.isFinite(hypothesis.expectedValue)
    ) {
      throw new PlatformValidationError("expectedValue must be a finite number.");
    }
    await history(tx, principal, {
      caseId: decisionCaseId,
      eventType: "hypothesis.created",
      entityType: "hypothesis",
      entityId: id,
      summary: "A competing hypothesis was recorded.",
      metadata: { likelihood: hypothesis.likelihood, confidence: hypothesis.confidence },
    });
    return hypothesis;
  });
}

function successCriteria(value: unknown): Experiment["successCriteria"] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 25) {
    throw new PlatformValidationError(
      "successCriteria must contain between 1 and 25 measurable criteria.",
    );
  }
  return value.map((entry, index) => {
    const criterion = object(entry, `successCriteria[${index}]`);
    const numericValue = Number(criterion.value);
    if (!Number.isFinite(numericValue)) {
      throw new PlatformValidationError(`successCriteria[${index}].value must be numeric.`);
    }
    return {
      metric: requireText(criterion.metric, `successCriteria[${index}].metric`, 100),
      operator: oneOf(
        criterion.operator,
        ["gte", "lte"] as const,
        `successCriteria[${index}].operator`,
      ),
      value: numericValue,
      unit: optionalText(criterion.unit, `successCriteria[${index}].unit`, 40),
    };
  });
}

export async function createDecisionExperiment(
  repository: PostgresDecisionRepository,
  principal: OrganizationPrincipal,
  raw: unknown,
) {
  requirePermission(principal, "decisions.write");
  const body = object(raw, "request");
  const decisionCaseId = caseId(body);
  const detail = await repository.getCaseDetail(principal.organizationId, decisionCaseId);
  if (!detail) throw new PlatformNotFoundError("Decision Case");
  assertCompetingHypotheses(detail.hypotheses);
  const hypothesisId = requireText(body.hypothesisId, "hypothesisId", 64);
  if (!detail.hypotheses.some((candidate) => candidate.id === hypothesisId)) {
    throw new PlatformNotFoundError("Hypothesis");
  }
  const expectedRisk = oneOf(body.expectedRisk, risks, "expectedRisk") as RiskLevel;
  const approvalStatus: ApprovalStatus =
    expectedRisk === "high" || expectedRisk === "critical" ? "pending" : "not_required";
  const id = randomUUID();
  const currentBelief = detail.beliefs.find((belief) => belief.id === detail.currentBeliefId) ?? detail.beliefs[0];
  if (!currentBelief) {
    throw new PlatformValidationError("An experiment requires a current belief prediction.");
  }
  return repository.transaction(async (tx) => {
    const experiment = await tx.createExperiment({
      id,
      organizationId: principal.organizationId,
      decisionCaseId,
      hypothesisId,
      title: requireText(body.title, "title", 200),
      expectedLift:
        body.expectedLift === undefined ? undefined : Number(body.expectedLift),
      expectedRisk,
      observationWindow: object(body.observationWindow, "observationWindow"),
      rollbackPlan: requireText(body.rollbackPlan, "rollbackPlan"),
      successCriteria: successCriteria(body.successCriteria),
      approvalStatus,
      status: approvalStatus === "pending" ? "awaiting_approval" : "draft",
      createdBy: principal.subjectId,
    });
    if (experiment.expectedLift !== undefined && !Number.isFinite(experiment.expectedLift)) {
      throw new PlatformValidationError("expectedLift must be a finite number.");
    }
    const predictionId = randomUUID();
    await tx.createPrediction({
      id: predictionId,
      organizationId: principal.organizationId,
      decisionCaseId,
      beliefId: currentBelief.id,
      experimentId: id,
      confidence: currentBelief.confidence,
      predictedAt: new Date().toISOString(),
      successCriteria: experiment.successCriteria,
      createdBy: principal.subjectId,
    });
    await history(tx, principal, {
      caseId: decisionCaseId,
      eventType: "experiment.created",
      entityType: "experiment",
      entityId: id,
      summary: "A measurable experiment was proposed.",
      metadata: { approvalStatus, expectedRisk, predictionId, confidence: currentBelief.confidence },
    });
    return experiment;
  });
}

export async function decideDecisionExperiment(
  repository: PostgresDecisionRepository,
  principal: OrganizationPrincipal,
  experimentId: string,
  raw: unknown,
) {
  requirePermission(principal, "decisions.approve");
  const body = object(raw, "request");
  const decisionCaseId = caseId(body);
  const detail = await repository.getCaseDetail(principal.organizationId, decisionCaseId);
  if (!detail) throw new PlatformNotFoundError("Decision Case");
  if (!detail.experiments.some((candidate) => candidate.id === experimentId)) {
    throw new PlatformNotFoundError("Experiment");
  }
  if (!detail.interventions.some((candidate) => candidate.experimentId === experimentId)) {
    throw new PlatformValidationError("Approval requires an exact intervention intent and rollback plan.");
  }
  const decision = oneOf(
    body.decision,
    ["approved", "rejected"] as const,
    "decision",
  );
  return repository.transaction(async (tx) => {
    const experiment = await tx.decideExperimentApproval({
      organizationId: principal.organizationId,
      experimentId,
      decision,
      decidedBy: principal.subjectId,
    });
    if (!experiment) {
      throw new PlatformValidationError(
        "This experiment does not have a pending approval.",
      );
    }
    await history(tx, principal, {
      caseId: decisionCaseId,
      eventType: `experiment.${decision}`,
      entityType: "experiment",
      entityId: experimentId,
      summary: `Experiment ${decision}; no execution was performed.`,
      metadata: { decision },
    });
    return experiment;
  });
}

export async function createDecisionIntervention(
  repository: PostgresDecisionRepository,
  principal: OrganizationPrincipal,
  raw: unknown,
) {
  requirePermission(principal, "decisions.write");
  const body = object(raw, "request");
  const decisionCaseId = caseId(body);
  const detail = await repository.getCaseDetail(principal.organizationId, decisionCaseId);
  if (!detail) throw new PlatformNotFoundError("Decision Case");
  const experimentId = requireText(body.experimentId, "experimentId", 64);
  const experiment = detail.experiments.find((candidate) => candidate.id === experimentId);
  if (!experiment) throw new PlatformNotFoundError("Experiment");
  if (experiment.approvalStatus === "approved" || experiment.approvalStatus === "rejected") {
    throw new PlatformValidationError("Intervention intent cannot be added after an approval decision.");
  }
  const id = randomUUID();
  return repository.transaction(async (tx) => {
    const intervention: Omit<Intervention, "createdAt"> = {
      id,
      organizationId: principal.organizationId,
      experimentId,
      description: requireText(body.description, "description"),
      exactIntent: object(body.exactIntent, "exactIntent"),
      reversibility: oneOf(
        body.reversibility,
        ["easy", "moderate", "difficult", "irreversible"] as const,
        "reversibility",
      ),
      rollbackPlan: requireText(body.rollbackPlan, "rollbackPlan"),
      status: experiment.approvalStatus === "not_required" ? "approved" : "proposed",
      createdBy: principal.subjectId,
    };
    const created = await tx.createIntervention(intervention);
    await history(tx, principal, {
      caseId: decisionCaseId,
      eventType: "intervention.proposed",
      entityType: "intervention",
      entityId: id,
      summary: "An exact intervention intent and rollback plan were recorded.",
      metadata: { experimentId, reversibility: created.reversibility },
    });
    return created;
  });
}

export async function createDecisionOutcome(
  repository: PostgresDecisionRepository,
  principal: OrganizationPrincipal,
  raw: unknown,
) {
  requirePermission(principal, "decisions.measure");
  const body = object(raw, "request");
  const decisionCaseId = caseId(body);
  const detail = await repository.getCaseDetail(principal.organizationId, decisionCaseId);
  if (!detail) throw new PlatformNotFoundError("Decision Case");
  const experimentId = requireText(body.experimentId, "experimentId", 64);
  const experiment = detail.experiments.find((candidate) => candidate.id === experimentId);
  if (!experiment) {
    throw new PlatformNotFoundError("Experiment");
  }
  if (experiment.status !== "running") {
    throw new PlatformValidationError("An outcome can only resolve a running experiment.");
  }
  const currentBelief = detail.beliefs.find((belief) => belief.id === detail.currentBeliefId) ?? detail.beliefs[0];
  if (!currentBelief) throw new PlatformValidationError("A current belief is required.");
  const evidenceGrade = requireEvidenceGrade(body.evidenceGrade);
  const observedResult = classifyOutcomeClaim(
    evidenceGrade,
    requireText(body.observedResult, "observedResult"),
  );
  const id = randomUUID();
  const posteriorConfidence = requireConfidence(body.posteriorConfidence, "posteriorConfidence");
  if (typeof body.succeeded !== "boolean") {
    throw new PlatformValidationError("succeeded must be a boolean resolved against predefined success criteria.");
  }
  const succeeded = body.succeeded;
  const observedAt = requireIsoTimestamp(body.observedAt, "observedAt");
  return repository.transaction(async (tx) => {
    const belief = await tx.reviseBelief({
      previous: currentBelief,
      statement: optionalText(body.updatedBelief, "updatedBelief") ?? currentBelief.statement,
      confidence: posteriorConfidence,
      missingEvidence: requireStringList(body.missingEvidence ?? currentBelief.missingEvidence, "missingEvidence"),
      assumptions: requireStringList(body.assumptions ?? currentBelief.assumptions, "assumptions"),
      whatWouldChange: optionalText(body.whatWouldChange, "whatWouldChange") ?? currentBelief.whatWouldChange,
      changedBy: principal.subjectId,
      changeReason: `Experiment outcome: ${observedResult}`,
      evidenceIds: requireStringList(body.evidenceIds ?? [], "evidenceIds"),
    });
    if (!belief) throw new PlatformValidationError("The belief changed concurrently. Reload before recording the outcome.");
    const prediction = await tx.resolvePrediction({
      organizationId: principal.organizationId,
      experimentId,
      succeeded,
      posteriorConfidence,
      resolvedAt: observedAt,
    });
    if (!prediction) throw new PlatformValidationError("The experiment prediction is missing or already resolved.");
    const outcome = await tx.createOutcome({
      id,
      organizationId: principal.organizationId,
      decisionCaseId,
      experimentId,
      observedResult,
      evidenceGrade,
      measuredImpact: object(body.measuredImpact, "measuredImpact"),
      unexpectedEffects: requireStringList(
        body.unexpectedEffects ?? [],
        "unexpectedEffects",
      ),
      posteriorConfidence,
      updatedBeliefId: belief.id,
      observedAt,
      recordedBy: principal.subjectId,
    });
    const lesson = await tx.createLesson({
      id: randomUUID(),
      organizationId: principal.organizationId,
      decisionCaseId,
      outcomeId: outcome.id,
      statement: requireText(body.lesson, "lesson"),
      applicability: requireStringList(body.applicability ?? [], "applicability"),
      limitations: requireStringList(body.lessonLimitations ?? [], "lessonLimitations"),
      confidence: posteriorConfidence,
      createdBy: principal.subjectId,
    });
    await history(tx, principal, {
      caseId: decisionCaseId,
      eventType: "outcome.recorded",
      entityType: "outcome",
      entityId: id,
      summary: "An experiment outcome updated the learning record.",
      metadata: {
        experimentId,
        evidenceGrade,
        posteriorConfidence: outcome.posteriorConfidence,
        priorConfidence: currentBelief.confidence,
        succeeded,
        beliefVersion: belief.version,
        lessonId: lesson.id,
      },
    });
    await history(tx, principal, {
      caseId: decisionCaseId,
      eventType: "lesson.created",
      entityType: "lesson",
      entityId: lesson.id,
      summary: "A reusable lesson was generated from the resolved experiment.",
      metadata: { outcomeId: outcome.id, confidence: lesson.confidence },
    });
    return { outcome, belief, lesson, predictionQuality: { confidence: Number(prediction.confidence), succeeded } };
  });
}

export async function transitionDecisionCase(
  repository: PostgresDecisionRepository,
  principal: OrganizationPrincipal,
  caseIdValue: string,
  raw: unknown,
) {
  requirePermission(principal, "decisions.write");
  const body = object(raw, "request");
  const detail = await repository.getCaseDetail(principal.organizationId, caseIdValue);
  if (!detail) throw new PlatformNotFoundError("Decision Case");
  const target = oneOf(body.status, ["draft", "investigating", "proposed", "approved", "running", "measuring", "closed", "archived"] as const, "status");
  assertLifecycleReady(detail, target);
  return repository.transaction(async (tx) => {
    const updated = await tx.updateCaseStatus({ organizationId: principal.organizationId, caseId: caseIdValue, from: detail.status, to: target });
    if (!updated) throw new PlatformValidationError("The Decision Case changed concurrently. Reload before transitioning it.");
    await history(tx, principal, { caseId: caseIdValue, eventType: "decision_case.transitioned", entityType: "decision_case", entityId: caseIdValue, summary: `Decision Case transitioned from ${detail.status} to ${target}.`, metadata: { from: detail.status, to: target } });
    return updated;
  });
}

export async function executeDecisionIntervention(
  repository: PostgresDecisionRepository,
  principal: OrganizationPrincipal,
  raw: unknown,
) {
  requirePermission(principal, "decisions.write");
  const body = object(raw, "request");
  const decisionCaseId = caseId(body);
  const detail = await repository.getCaseDetail(principal.organizationId, decisionCaseId);
  if (!detail) throw new PlatformNotFoundError("Decision Case");
  const experimentId = requireText(body.experimentId, "experimentId", 64);
  const interventionId = requireText(body.interventionId, "interventionId", 64);
  const intervention = detail.interventions.find((item) => item.id === interventionId && item.experimentId === experimentId);
  if (!intervention) throw new PlatformNotFoundError("Intervention");
  const executionMode = oneOf(body.executionMode, ["manual", "provider"] as const, "executionMode");
  if (executionMode === "provider") {
    throw new PlatformValidationError("No Atlas provider publisher is configured; provider execution is not available.");
  }
  const id = randomUUID();
  return repository.transaction(async (tx) => {
    const execution = await tx.recordExecution({ id, organizationId: principal.organizationId, decisionCaseId, experimentId, interventionId, idempotencyKey: requireText(body.idempotencyKey, "idempotencyKey", 200), executionMode, result: object(body.result ?? {}, "result"), executedBy: principal.subjectId, startedAt: requireIsoTimestamp(body.executedAt, "executedAt") });
    if (!execution) throw new PlatformValidationError("Execution requires a tenant-matched approved experiment and intervention.");
    await history(tx, principal, { caseId: decisionCaseId, eventType: "intervention.executed", entityType: "intervention", entityId: interventionId, summary: "An approved intervention execution was durably recorded.", metadata: { experimentId, executionId: execution.id, executionMode } });
    return execution;
  });
}

export async function getDecisionChallenge(repository: PostgresDecisionRepository, principal: OrganizationPrincipal, caseIdValue: string) {
  requirePermission(principal, "decisions.read");
  const detail = await repository.getCaseDetail(principal.organizationId, caseIdValue);
  if (!detail) throw new PlatformNotFoundError("Decision Case");
  return challengeDecision(detail);
}

export async function getScientificReasoning(
  repository: PostgresDecisionRepository,
  principal: OrganizationPrincipal,
  caseIdValue: string,
  persist = false,
) {
  requirePermission(principal, "decisions.read");
  const detail = await repository.getCaseDetail(principal.organizationId, caseIdValue);
  if (!detail) throw new PlatformNotFoundError("Decision Case");
  const reasoning = reasonAboutDecision(detail);
  const graph = persist
    ? await repository.persistBeliefGraph({ organizationId: principal.organizationId, decisionCaseId: caseIdValue, createdBy: principal.subjectId })
    : await repository.listBeliefGraph(principal.organizationId, caseIdValue);
  let snapshot = null;
  if (persist) {
    requirePermission(principal, "decisions.write");
    snapshot = await repository.persistReasoningSnapshot({
      organizationId: principal.organizationId,
      decisionCaseId: caseIdValue,
      beliefId: reasoning.beliefId,
      engineVersion: reasoning.engineVersion,
      metrics: reasoning.metrics,
      explanation: reasoning as unknown as Record<string, unknown>,
      calculatedBy: principal.subjectId,
    });
    await repository.appendHistory({
      organizationId: principal.organizationId,
      decisionCaseId: caseIdValue,
      actorId: principal.subjectId,
      eventType: "reasoning.calculated",
      entityType: "decision_case",
      entityId: caseIdValue,
      summary: "The explainable Scientific Reasoning Engine recalculated uncertainty.",
      metadata: { engineVersion: reasoning.engineVersion, metrics: reasoning.metrics, snapshotId: snapshot.id },
    });
  }
  return { reasoning, graph, snapshot };
}

export async function getDecisionMetrics(repository: PostgresDecisionRepository, principal: OrganizationPrincipal) {
  requirePermission(principal, "audit.read");
  const data = await repository.calibrationData(principal.organizationId);
  const predictions = data.predictions.map((row: any) => ({ confidence: Number(row.confidence), succeeded: Boolean(row.succeeded), predictedAt: new Date(row.predicted_at).toISOString(), resolvedAt: new Date(row.resolved_at).toISOString(), posteriorConfidence: Number(row.posterior_confidence) }));
  const calibration = calculateCalibration(predictions);
  const counts = data.counts;
  const caseCount = Number(counts.case_count);
  const evidenceCount = Number(counts.evidence_count);
  return {
    calibration,
    evidenceCoverage: caseCount ? evidenceCount / caseCount : null,
    evidenceFreshness: evidenceCount ? 1 - Number(counts.stale_evidence_count) / evidenceCount : null,
    experimentSuccessRate: calibration.decisionSuccessRate,
    falsePositiveRate: predictions.filter((item) => item.confidence >= 0.5).length ? predictions.filter((item) => item.confidence >= 0.5 && !item.succeeded).length / predictions.filter((item) => item.confidence >= 0.5).length : null,
    falseNegativeRate: predictions.filter((item) => item.confidence < 0.5).length ? predictions.filter((item) => item.confidence < 0.5 && item.succeeded).length / predictions.filter((item) => item.confidence < 0.5).length : null,
    decisionLatencyHours: counts.latency_hours === null ? null : Number(counts.latency_hours),
    decisionThroughput30d: Number(counts.throughput_30d),
    knowledgeGrowth: Number(counts.lesson_count),
    decisionReuse: Number(counts.reuse_count),
    knowledgeReuse: Number(counts.reuse_count),
    beliefRevisionRate: caseCount ? Number(counts.belief_revision_count) / caseCount : null,
    averageUncertaintyReduction: counts.uncertainty_reduction === null ? null : Number(counts.uncertainty_reduction),
    contradictionResolutionRate: counts.contradiction_resolution_rate === null ? null : Number(counts.contradiction_resolution_rate),
    reasoningSnapshotCount: Number(counts.reasoning_snapshot_count),
    generatedAt: new Date().toISOString(),
  };
}

export async function createDecisionLesson(
  repository: PostgresDecisionRepository,
  principal: OrganizationPrincipal,
  raw: unknown,
) {
  requirePermission(principal, "decisions.measure");
  const body = object(raw, "request");
  const decisionCaseId = caseId(body);
  const detail = await repository.getCaseDetail(principal.organizationId, decisionCaseId);
  if (!detail) throw new PlatformNotFoundError("Decision Case");
  const outcomeId = requireText(body.outcomeId, "outcomeId", 64);
  if (!detail.outcomes.some((candidate) => candidate.id === outcomeId)) {
    throw new PlatformNotFoundError("Outcome");
  }
  const id = randomUUID();
  return repository.transaction(async (tx) => {
    const lesson = await tx.createLesson({
      id,
      organizationId: principal.organizationId,
      decisionCaseId,
      outcomeId,
      statement: requireText(body.statement, "statement"),
      applicability: requireStringList(body.applicability, "applicability"),
      limitations: requireStringList(body.limitations ?? [], "limitations"),
      confidence: requireConfidence(body.confidence),
      createdBy: principal.subjectId,
    });
    await history(tx, principal, {
      caseId: decisionCaseId,
      eventType: "lesson.created",
      entityType: "lesson",
      entityId: id,
      summary: "A reusable, bounded lesson was recorded.",
      metadata: { outcomeId, confidence: lesson.confidence },
    });
    return lesson;
  });
}
