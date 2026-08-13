import type { InventoryBuckets, MichaelModelConfig, OracleForecast, OracleInventoryPosition, OracleProductRef } from "./types";
import { defaultMichaelModelConfig } from "./michael-model";

export function calculateInventoryPosition(input: {
  product: OracleProductRef;
  buckets: InventoryBuckets;
  forecast: OracleForecast;
  asOf?: string;
  allowTransfer?: boolean;
  allowDf?: boolean;
  estimatedAvailabilityDate?: string;
}): OracleInventoryPosition {
  const asOf = input.asOf ?? new Date().toISOString();
  const usable = Math.max(0, input.buckets.amazonOnHand - input.buckets.committed - input.buckets.promoCommitted - input.buckets.protected)
    + (input.allowTransfer ? input.buckets.transferable : 0) + (input.allowDf ? input.buckets.dfAvailable : 0);
  const forward = usable + input.buckets.amazonOnOrder + input.buckets.inbound;
  const rate = input.forecast.weeklyRate;
  const currentWos = rate > 0 ? usable / rate : undefined;
  const forwardWos = rate > 0 ? forward / rate : undefined;
  const days = currentWos === undefined ? undefined : currentWos * 7;
  const stockout = days === undefined ? undefined : new Date(Date.parse(asOf) + days * 86_400_000).toISOString();
  const risk = currentWos === undefined ? "unknown" : currentWos < 3 ? "stockout" : currentWos < 5 ? "constrained" : currentWos > 16 ? "excess" : "balanced";
  return {
    product: input.product, asOf, buckets: input.buckets, usableInventory: usable,
    currentWos, forwardWos, daysOfCover: days, projectedStockoutDate: stockout,
    projectedExcessDate: forwardWos !== undefined && forwardWos > 16 ? asOf : undefined,
    estimatedAvailabilityDate: input.estimatedAvailabilityDate, risk,
    assumptions: [
      "Inventory buckets remain separate; DF and transferable stock are included only when explicitly allowed.",
      "Stockout timing assumes the forecast weekly rate remains constant across the coverage window.",
    ],
    missingEvidence: [rate <= 0 ? "usable weekly demand rate" : null].filter((value): value is string => Boolean(value)),
  };
}

export function isDfCandidate(input: { position: OracleInventoryPosition; latestWeekSales: number; config?: MichaelModelConfig }) {
  const config = input.config ?? defaultMichaelModelConfig;
  return input.position.currentWos !== undefined
    && input.position.currentWos < config.dfAmazonWosMaximum
    && input.position.buckets.dfAvailable <= 0
    && input.position.buckets.awcOnHand >= config.dfAwcMinimum
    && input.latestWeekSales >= config.dfLatestSalesMinimum;
}

export function isBtrCandidate(input: { position: OracleInventoryPosition; config?: MichaelModelConfig }) {
  const config = input.config ?? defaultMichaelModelConfig;
  const rate = input.position.currentWos && input.position.currentWos > 0
    ? input.position.usableInventory / input.position.currentWos : 0;
  const amazonCoverage = rate > 0
    ? (input.position.buckets.amazonOnHand + input.position.buckets.amazonOnOrder) / rate
    : undefined;
  return amazonCoverage !== undefined && amazonCoverage < config.btrAmazonWosMaximum;
}
