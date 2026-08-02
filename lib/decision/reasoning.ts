import { PlatformValidationError } from "../platform/errors";
import type { Belief, DecisionCaseDetail, Evidence, Experiment, Hypothesis, Outcome } from "./types";
import { assertCompetingHypotheses } from "./validation";

export type DecisionRecommendation = {
  belief: Belief;
  supportingEvidence: Evidence[];
  counterEvidence: Evidence[];
  alternativeHypotheses: Hypothesis[];
  assumptions: string[];
  uncertainty: string[];
  whatWouldChange: string;
};

export function assembleRecommendation(input: DecisionRecommendation) {
  assertCompetingHypotheses(input.alternativeHypotheses);
  if (input.supportingEvidence.length === 0) {
    throw new PlatformValidationError(
      "A recommendation requires at least one supporting evidence record.",
    );
  }
  if (!input.whatWouldChange.trim()) {
    throw new PlatformValidationError(
      "A recommendation must state what would change the belief.",
    );
  }
  return input;
}

export function posteriorBelief(input: {
  belief: Belief;
  outcome: Pick<Outcome, "posteriorConfidence" | "observedResult" | "evidenceGrade">;
  changedBy: string;
  changedAt: string;
}): Belief {
  return {
    ...input.belief,
    confidence: input.outcome.posteriorConfidence,
    missingEvidence:
      input.outcome.evidenceGrade === "observed" ||
      input.outcome.evidenceGrade === "correlated"
        ? Array.from(
            new Set([
              ...input.belief.missingEvidence,
              "Stronger causal evidence is still required.",
            ]),
          )
        : input.belief.missingEvidence,
    ownerId: input.changedBy,
    version: input.belief.version + 1,
    updatedAt: input.changedAt,
  };
}

export function calibrationSummary(
  predictions: Array<{ confidence: number; succeeded: boolean }>,
) {
  if (predictions.length === 0) {
    return { count: 0, meanConfidence: 0, successRate: 0, brierScore: 0 };
  }
  for (const prediction of predictions) {
    if (
      !Number.isFinite(prediction.confidence) ||
      prediction.confidence < 0 ||
      prediction.confidence > 1
    ) {
      throw new PlatformValidationError(
        "Calibration confidence values must be between 0 and 1.",
      );
    }
  }
  const count = predictions.length;
  const meanConfidence =
    predictions.reduce((sum, item) => sum + item.confidence, 0) / count;
  const successRate =
    predictions.filter((item) => item.succeeded).length / count;
  const brierScore =
    predictions.reduce(
      (sum, item) =>
        sum + (item.confidence - (item.succeeded ? 1 : 0)) ** 2,
      0,
    ) / count;
  return { count, meanConfidence, successRate, brierScore };
}

export const reasoningEngineVersion = "scientific-reasoning-v1";

const round = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 10_000) / 10_000;
const freshnessWeight = { current: 1, delayed: 0.65, stale: 0.25, unavailable: 0 } as const;
const riskWeight = { low: 0.2, medium: 0.45, high: 0.75, critical: 1 } as const;
const reversibilityWeight = { easy: 1, moderate: 0.7, difficult: 0.35, irreversible: 0, unknown: 0.25 } as const;

export type ExperimentPriority = {
  experimentId: string;
  score: number;
  components: {
    informationGain: number;
    businessValue: number;
    safety: number;
    reversibility: number;
    costEfficiency: number;
    timeEfficiency: number;
    evidenceWeakness: number;
  };
  formula: string;
};

export function rankExperiments(
  experiments: Experiment[],
  uncertainty: number,
  evidenceCoverage: number,
): ExperimentPriority[] {
  return experiments.map((experiment) => {
    const duration = experiment.observationWindow.durationDays ?? 30;
    const informationGain = round(uncertainty * (experiment.successCriteria.length ? 1 : 0.4));
    const businessValue = round(Math.min(1, Math.abs(experiment.expectedLift ?? 0)));
    const safety = round(1 - riskWeight[experiment.expectedRisk]);
    const reversibility = experiment.rollbackPlan.trim() ? 1 : 0;
    const costEfficiency = round((safety + reversibility) / 2);
    const timeEfficiency = round(1 / (1 + duration / 14));
    const evidenceWeakness = round(1 - evidenceCoverage);
    const score = round(
      informationGain * 0.3 + businessValue * 0.2 + safety * 0.15 +
      reversibility * 0.1 + costEfficiency * 0.05 + timeEfficiency * 0.05 +
      evidenceWeakness * 0.15,
    );
    return {
      experimentId: experiment.id,
      score,
      components: { informationGain, businessValue, safety, reversibility, costEfficiency, timeEfficiency, evidenceWeakness },
      formula: "0.30 information gain + 0.20 business value + 0.15 safety + 0.10 reversibility + 0.05 cost efficiency + 0.05 time efficiency + 0.15 evidence weakness",
    };
  }).sort((a, b) => b.score - a.score || a.experimentId.localeCompare(b.experimentId));
}

export function reasonAboutDecision(detail: DecisionCaseDetail, now = new Date() ) {
  const belief = detail.beliefs.find((item) => item.id === detail.currentBeliefId) ?? detail.beliefs[0];
  const beliefLinks = belief ? detail.evidenceLinks.filter((link) => link.entityType === "belief" && link.entityId === belief.id) : [];
  const supportIds = new Set(beliefLinks.filter((link) => link.relationship === "supports" || link.relationship === "informs").map((link) => link.evidenceId));
  const conflictIds = new Set(beliefLinks.filter((link) => link.relationship === "counters" || link.relationship === "confounds").map((link) => link.evidenceId));
  const supportingEvidence = detail.evidence.filter((item) => supportIds.has(item.id));
  const contradictoryEvidence = detail.evidence.filter((item) => conflictIds.has(item.id));
  const staleEvidence = detail.evidence.filter((item) => item.freshness === "stale" || item.freshness === "unavailable");
  const duplicateEvidence = detail.evidence.filter((item, index, all) =>
    all.findIndex((candidate) => candidate.statement.trim().toLowerCase() === item.statement.trim().toLowerCase()) !== index,
  );
  const evidenceCoverage = round(Math.min(1, (supportingEvidence.length + contradictoryEvidence.length) / 4));
  const evidenceFreshness = round(detail.evidence.length ? detail.evidence.reduce((sum, item) => sum + freshnessWeight[item.freshness], 0) / detail.evidence.length : 0);
  const hypothesisCoverage = Math.min(1, detail.hypotheses.length / 2);
  const falsifiability = belief?.whatWouldChange.trim() ? 1 : 0;
  const assumptionsDocumented = (belief?.assumptions.length ?? detail.assumptions.length) ? 1 : 0;
  const knowledgeCompleteness = round((evidenceCoverage + hypothesisCoverage + falsifiability + assumptionsDocumented) / 4);
  const contradictionScore = round(contradictoryEvidence.length / Math.max(1, supportingEvidence.length + contradictoryEvidence.length));
  const evidenceConfidence = supportingEvidence.length ? supportingEvidence.reduce((sum, item) => sum + item.confidence, 0) / supportingEvidence.length : 0;
  const baseConfidence = belief?.confidence ?? 0;
  const confidence = round(baseConfidence * 0.5 + evidenceConfidence * 0.25 + evidenceCoverage * 0.15 + evidenceFreshness * 0.1 - contradictionScore * 0.25);
  const uncertainty = round(1 - confidence);
  const priorities = rankExperiments(detail.experiments, uncertainty, evidenceCoverage);
  const missingEvidence = Array.from(new Set([
    ...(belief?.missingEvidence ?? ["A current belief has not been recorded."]),
    ...(supportingEvidence.length ? [] : ["Evidence explicitly supporting the current belief."]),
    ...(contradictoryEvidence.length ? [] : ["Evidence capable of contradicting the current belief."]),
    ...(detail.hypotheses.length >= 2 ? [] : ["At least two competing hypotheses."]),
  ]));
  const generatedHypotheses = detail.hypotheses.length >= 2 ? [] : [
    {
      statement: `The observed pattern may be driven by an unmeasured confounder rather than: ${belief?.statement ?? detail.problem}`,
      expectedProbability: round(Math.max(0.1, uncertainty / 2)),
      confidence: round(knowledgeCompleteness * 0.5),
      supportingEvidence: [] as string[],
      contradictoryEvidence: supportingEvidence.map((item) => item.id),
      missingEvidence,
      estimatedInformationGain: round(uncertainty * 0.75),
      provenance: "Deterministic gap hypothesis; requires human review before persistence.",
    },
  ];
  const oldestObservation = detail.evidence.reduce<Date | null>((oldest, item) => {
    const observed = new Date(item.observedAt);
    return !oldest || observed < oldest ? observed : oldest;
  }, null);
  return {
    engineVersion: reasoningEngineVersion,
    calculatedAt: now.toISOString(),
    beliefId: belief?.id ?? null,
    metrics: {
      confidence, uncertainty, evidenceCoverage, evidenceFreshness, knowledgeCompleteness,
      contradictionScore, experimentPriority: priorities[0]?.score ?? 0,
    },
    supportingEvidence,
    contradictoryEvidence,
    staleEvidence,
    duplicateEvidence,
    missingEvidence,
    alternativeHypotheses: detail.hypotheses,
    generatedHypotheses,
    experimentPriorities: priorities,
    recommendedExperimentId: priorities[0]?.experimentId ?? null,
    reusableLessons: detail.reusedLessons,
    assumptions: belief?.assumptions ?? detail.assumptions,
    selfCritique: {
      whatIsAssumed: belief?.assumptions ?? detail.assumptions,
      whereCouldBeWrong: missingEvidence,
      weakestEvidenceId: detail.evidence.slice().sort((a, b) => a.confidence - b.confidence)[0]?.id ?? null,
      whatContradictsConclusion: contradictoryEvidence.map((item) => item.id),
      whatWouldChangeConclusion: belief?.whatWouldChange ?? "A falsification condition has not been recorded.",
      firstExperimentId: priorities[0]?.experimentId ?? null,
    },
    formulas: {
      confidence: "0.50 stated belief + 0.25 mean supporting-evidence confidence + 0.15 evidence coverage + 0.10 freshness - 0.25 contradiction score",
      uncertainty: "1 - calculated confidence",
      evidenceCoverage: "min(1, explicitly linked supporting and contradictory evidence / 4)",
      evidenceFreshness: "mean(current=1, delayed=0.65, stale=0.25, unavailable=0)",
      knowledgeCompleteness: "mean(evidence coverage, two-hypothesis coverage, falsifiability, documented assumptions)",
      contradictionScore: "contradictory links / all supporting and contradictory links",
    },
    evidenceAgeDays: oldestObservation ? Math.max(0, Math.floor((now.getTime() - oldestObservation.getTime()) / 86_400_000)) : null,
    caseReversibility: reversibilityWeight[detail.reversibility],
  };
}
