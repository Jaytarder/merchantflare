import type { OracleOutcomeScore } from "./types";

export type ModelPerformanceContext = {
  category?: string;
  license?: string;
  maturity: "newness" | "mature";
  promotion: boolean;
  season?: string;
  volatility: number;
  inventoryCondition: string;
};

export function betterModel(michael: OracleOutcomeScore, oracle: OracleOutcomeScore) {
  const michaelPenalty = michael.absoluteError + (michael.stockoutMiss ? 100 : 0) + michael.overbuy + michael.underbuy;
  const oraclePenalty = oracle.absoluteError + (oracle.stockoutMiss ? 100 : 0) + oracle.overbuy + oracle.underbuy;
  return oraclePenalty === michaelPenalty ? "tie" : oraclePenalty < michaelPenalty ? "OracleModel" : "MichaelModel";
}

export function performanceLesson(input: { michael: OracleOutcomeScore; oracle: OracleOutcomeScore; context: ModelPerformanceContext }) {
  const winner = betterModel(input.michael, input.oracle);
  return {
    winner,
    statement: winner === "tie" ? "The planner models performed equivalently for this outcome." : `${winner} produced the lower bounded planning-error penalty for this outcome.`,
    applicability: input.context,
    limitation: "One observed outcome does not establish universal model superiority; reuse requires comparable context.",
  };
}
