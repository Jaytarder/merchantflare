import type { DecisionCaseDetail } from "./types";

export function challengeDecision(detail: DecisionCaseDetail) {
  const belief = detail.beliefs.find((item) => item.id === detail.currentBeliefId) ?? detail.beliefs[0];
  const counterLinks = belief
    ? detail.evidenceLinks.filter((link) => link.entityType === "belief" && link.entityId === belief.id && (link.relationship === "counters" || link.relationship === "confounds"))
    : [];
  const linkedIds = new Set(counterLinks.map((link) => link.evidenceId));
  const contradictoryEvidence = detail.evidence.filter((item) => linkedIds.has(item.id));
  const alternatives = belief
    ? detail.hypotheses.filter((item) => item.status === "active" || item.status === "supported")
    : [];
  const experiment = alternatives
    .filter((item) => item.suggestedExperiment)
    .sort((a, b) => b.confidence - a.confidence)[0];
  return {
    beliefId: belief?.id ?? null,
    contradictoryEvidence,
    unresolvedAssumptions: belief?.assumptions ?? detail.assumptions,
    alternativeHypotheses: alternatives,
    missingEvidence: belief?.missingEvidence ?? ["A current belief has not been recorded."],
    reusableLessons: detail.reusedLessons,
    uncertaintyReducingExperiment: experiment?.suggestedExperiment ?? null,
    warnings: [
      ...(contradictoryEvidence.length === 0 ? ["No counter-evidence is linked to the current belief."] : []),
      ...(alternatives.length < 2 ? ["Fewer than two active competing hypotheses exist."] : []),
      ...(experiment ? [] : ["No hypothesis proposes an uncertainty-reducing experiment."]),
    ],
  };
}
