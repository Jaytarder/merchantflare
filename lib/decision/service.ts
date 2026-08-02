import { randomUUID } from "node:crypto";
import type { OrganizationPrincipal } from "../platform/authorization";
import { requirePermission } from "../platform/authorization";
import { PlatformNotFoundError, PlatformValidationError } from "../platform/errors";
import { PostgresDecisionRepository } from "./repository";
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
    await history(tx, principal, {
      caseId: decisionCaseId,
      eventType: "experiment.created",
      entityType: "experiment",
      entityId: id,
      summary: "A measurable experiment was proposed.",
      metadata: { approvalStatus, expectedRisk },
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
      status: "proposed",
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
  if (!detail.experiments.some((candidate) => candidate.id === experimentId)) {
    throw new PlatformNotFoundError("Experiment");
  }
  const evidenceGrade = requireEvidenceGrade(body.evidenceGrade);
  const observedResult = classifyOutcomeClaim(
    evidenceGrade,
    requireText(body.observedResult, "observedResult"),
  );
  const id = randomUUID();
  return repository.transaction(async (tx) => {
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
      posteriorConfidence: requireConfidence(
        body.posteriorConfidence,
        "posteriorConfidence",
      ),
      updatedBeliefId: optionalText(body.updatedBeliefId, "updatedBeliefId", 64),
      observedAt: requireIsoTimestamp(body.observedAt, "observedAt"),
      recordedBy: principal.subjectId,
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
      },
    });
    return outcome;
  });
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
