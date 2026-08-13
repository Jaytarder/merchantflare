import type { OracleForecastComparison, OracleInventoryPosition, OracleReplenishmentOption } from "./types";

export type OracleDecisionCompilation = {
  objective: string;
  constraints: string[];
  currentState: OracleInventoryPosition;
  michaelModel: OracleForecastComparison["michael"];
  oracleModel: OracleForecastComparison["oracle"];
  modelDisagreement: { material: boolean; drivers: string[] };
  possibleActions: OracleReplenishmentOption[];
  expectedFutures: Array<{ action: string; stockoutProbability: number; expectedWos?: number; excessUnits: number }>;
  risk: string;
  uncertainty: number;
  valueOfInformation: OracleForecastComparison["valueOfInformation"];
  recommendation: "act" | "buy" | "transfer" | "df" | "btr" | "wait" | "gather_more_evidence" | "escalate_to_human";
};

export function compileOracleDecision(input: {
  objective: string;
  constraints: string[];
  position: OracleInventoryPosition;
  comparison: OracleForecastComparison;
  options: OracleReplenishmentOption[];
}): OracleDecisionCompilation {
  const selected = input.options[0];
  const mapping = {
    BUY: "buy", DF: "df", BTR: "btr", TRANSFER_INVENTORY: "transfer",
    WAIT_FOR_MORE_EVIDENCE: "wait", HUMAN_REVIEW: "escalate_to_human",
  } as const;
  const fallback = input.comparison.oracle.missingEvidence.length ? "gather_more_evidence" : "act";
  return {
    objective: input.objective, constraints: input.constraints, currentState: input.position,
    michaelModel: input.comparison.michael, oracleModel: input.comparison.oracle,
    modelDisagreement: { material: input.comparison.materiallyDisagrees, drivers: input.comparison.disagreementDrivers },
    possibleActions: input.options,
    expectedFutures: input.options.map((option) => ({ action: option.action, stockoutProbability: option.expectedStockoutProbability, expectedWos: option.expectedWos, excessUnits: option.expectedExcessInventory })),
    risk: selected?.risk ?? "unknown", uncertainty: 1 - input.comparison.oracle.confidence,
    valueOfInformation: input.comparison.valueOfInformation,
    recommendation: selected ? (mapping[selected.action as keyof typeof mapping] ?? "act") : fallback,
  };
}
