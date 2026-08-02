import { PlatformValidationError } from "../platform/errors";
import type { Belief, Evidence, Hypothesis, Outcome } from "./types";
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
