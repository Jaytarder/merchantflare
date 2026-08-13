import { applyMoq, defaultMichaelModelConfig } from "./michael-model";
import { isBtrCandidate, isDfCandidate } from "./inventory";
import type {
  OracleForecast, OracleForecastComparison, OracleInventoryPosition,
  OracleOutcomeScore, OraclePlanningOutcome, OracleReplenishmentOption,
} from "./types";

export function compareForecasts(input: {
  michael: OracleForecast;
  oracle: OracleForecast;
  naive?: OracleForecast;
  waitCost?: number;
  errorCostPerUnit?: number;
}): OracleForecastComparison {
  const difference = Math.abs(input.michael.baseForecast - input.oracle.baseForecast);
  const denominator = Math.max(input.michael.baseForecast, input.oracle.baseForecast);
  const percentage = denominator > 0 ? difference / denominator : undefined;
  const material = difference >= 100 || (percentage ?? 0) >= 0.2;
  const uncertaintyCost = difference * (input.errorCostPerUnit ?? 1) * (1 - input.oracle.confidence);
  const waitCost = input.waitCost ?? 0;
  const nextEvidence = [
    "Verify Amazon on-hand and on-order inventory.",
    "Inspect cancellations and order-to-sales divergence.",
    "Wait one week for an additional uncensored sales signal when service risk permits.",
  ];
  return {
    michael: input.michael, oracle: input.oracle, naive: input.naive,
    absoluteDifference: difference, percentageDifference: percentage,
    materiallyDisagrees: material,
    disagreementDrivers: material
      ? ["Different treatment of recent sales versus orders.", "Oracle discounts model disagreement and censored observations."]
      : ["The independent models are within the material-disagreement threshold."],
    valueOfInformation: {
      recommendation: material && uncertaintyCost > waitCost ? "WAIT" : input.oracle.missingEvidence.length ? "GATHER_EVIDENCE" : "ACT",
      score: Math.max(0, uncertaintyCost - waitCost),
      rationale: material && uncertaintyCost > waitCost
        ? "The estimated cost of acting under model disagreement is greater than the configured cost of waiting."
        : "Current evidence does not show that waiting is economically superior to acting.",
      nextEvidence,
    },
  };
}

function probability(position: OracleInventoryPosition, forecast: OracleForecast) {
  if (position.currentWos === undefined) return 0.5;
  const horizonGap = forecast.horizonWeeks - position.forwardWos!;
  return Math.max(0.02, Math.min(0.98, 0.5 + horizonGap / Math.max(2, forecast.horizonWeeks * 2)));
}

export function generateReplenishmentOptions(input: {
  position: OracleInventoryPosition;
  forecast: OracleForecast;
  latestWeekSales: number;
  targetWos?: number;
  leadTimeDays?: number;
  productionMoq?: number;
  modelDisagreement?: boolean;
}): OracleReplenishmentOption[] {
  const targetWos = input.targetWos ?? 8;
  const needed = Math.max(0, input.forecast.weeklyRate * targetWos - (input.position.usableInventory + input.position.buckets.amazonOnOrder + input.position.buckets.inbound));
  const moq = applyMoq(needed, defaultMichaelModelConfig.minimumBuy, input.productionMoq);
  const stockoutProbability = probability(input.position, input.forecast);
  const common = {
    expectedStockoutProbability: stockoutProbability,
    expectedServiceLevel: 1 - stockoutProbability,
    leadTimeDays: input.leadTimeDays,
    confidence: input.forecast.confidence,
    whatCouldMakeItWrong: ["Inventory or lead-time evidence may be stale.", "Demand may be distorted by promotion, availability, or cancellations."],
  };
  const options: OracleReplenishmentOption[] = [];
  if (input.modelDisagreement && stockoutProbability < 0.45) {
    options.push({ ...common, action: "WAIT_FOR_MORE_EVIDENCE", quantity: 0, expectedWos: input.position.forwardWos, expectedExcessInventory: 0, moqImpact: "No MOQ commitment while evidence is gathered.", risk: "low", reversibility: "easy", why: ["Models materially disagree and near-term stockout exposure is limited."] });
  }
  if (needed > 0) {
    options.push({ ...common, action: "BUY", quantity: moq.quantity, expectedWos: (input.position.usableInventory + input.position.buckets.amazonOnOrder + input.position.buckets.inbound + moq.quantity) / Math.max(input.forecast.weeklyRate, 0.0001), expectedExcessInventory: Math.max(0, moq.quantity - needed), moqImpact: moq.impact, risk: stockoutProbability > 0.7 ? "high" : "medium", reversibility: "difficult", why: [`A ${targetWos}-week target implies ${Math.ceil(needed)} additional units before MOQ rounding.`] });
  } else {
    options.push({ ...common, action: "DO_NOT_BUY", quantity: 0, expectedWos: input.position.forwardWos, expectedExcessInventory: Math.max(0, input.position.usableInventory - input.forecast.weeklyRate * targetWos), moqImpact: "No MOQ commitment.", risk: "low", reversibility: "easy", why: ["Usable and inbound inventory cover the configured horizon."] });
  }
  if (isDfCandidate({ position: input.position, latestWeekSales: input.latestWeekSales })) {
    options.push({ ...common, action: "DF", quantity: Math.min(input.position.buckets.awcOnHand, Math.max(0, Math.ceil(needed))), expectedWos: input.position.forwardWos, expectedExcessInventory: 0, moqImpact: "Uses available AWC inventory; no production MOQ assumed.", risk: "medium", reversibility: "moderate", why: ["Amazon OH is below 4 WOS, DF is absent, AWC OH is at least 300, and last-week sales are at least 10 units."] });
  }
  if (isBtrCandidate({ position: input.position })) {
    options.push({ ...common, action: "BTR", quantity: Math.max(0, Math.ceil(needed)), expectedWos: input.position.forwardWos, expectedExcessInventory: 0, moqImpact: "BTR does not assume a production MOQ.", risk: "high", reversibility: "moderate", why: ["Amazon OH plus OO is below 3 WOS at the recent demand rate."] });
  }
  return options.sort((a, b) => a.expectedStockoutProbability - b.expectedStockoutProbability || b.confidence - a.confidence);
}

export function scorePlanningOutcome(input: OraclePlanningOutcome): OracleOutcomeScore {
  const error = input.forecastDemand - input.actualDemand;
  return {
    absoluteError: Math.abs(error),
    absolutePercentageError: input.actualDemand === 0 ? undefined : Math.abs(error) / input.actualDemand,
    bias: error,
    stockoutMiss: !input.expectedStockout && input.actualStockout,
    overbuy: Math.max(0, input.actualBuy - input.actualDemand),
    underbuy: Math.max(0, input.actualDemand - input.actualBuy),
    wosError: input.expectedWos - input.actualWos,
  };
}
