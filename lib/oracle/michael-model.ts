import type { MichaelModelConfig, OracleDemandSignal, OracleForecast, OracleLifecycleState, OracleProductRef } from "./types";

export const MICHAEL_MODEL_VERSION = "2026-08-13.v1";

export const defaultMichaelModelConfig: MichaelModelConfig = {
  orderNoiseCeilingMultiplier: 1.33,
  promoBackupRate: 0.06,
  licKidsProductGroups: ["lic kids"],
  minimumBuy: 500,
  possibleProductionMoq: 1000,
  dfAwcMinimum: 300,
  dfAmazonWosMaximum: 4,
  dfLatestSalesMinimum: 10,
  btrAmazonWosMaximum: 3,
  lifecycleModifiers: {
    NEWNESS: 1, GROWTH: 1.1, STABLE: 1, PROMO_SPIKE: 1,
    SEASONAL: 1, MOVIE_RELEASE: 1, POST_EVENT_DECAY: 0.72,
    DECLINING: 0.8, END_OF_LIFE: 0.5,
  },
};

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function recent(signals: OracleDemandSignal[], metric: OracleDemandSignal["metric"], count = 6) {
  return signals.filter((signal) => signal.metric === metric)
    .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd)).slice(0, count).map((signal) => signal.value);
}

export function applyMoq(quantity: number, minimum: number, productionMoq?: number) {
  if (quantity <= 0) return { quantity: 0, impact: "No buy required." };
  const moq = productionMoq && productionMoq > minimum ? productionMoq : minimum;
  const rounded = Math.ceil(quantity / moq) * moq;
  return { quantity: rounded, impact: rounded === quantity ? `Meets ${moq} unit MOQ.` : `Rounded ${Math.ceil(quantity)} to ${rounded} for the ${moq} unit MOQ.` };
}

export function calculateMichaelForecast(input: {
  product: OracleProductRef;
  signals: OracleDemandSignal[];
  horizonWeeks: number;
  lifecycleState: OracleLifecycleState;
  config?: MichaelModelConfig;
  calculatedAt?: string;
}): OracleForecast {
  const config = input.config ?? defaultMichaelModelConfig;
  const sales = average(recent(input.signals, "sales_units"));
  const orders = average(recent(input.signals, "order_units"));
  const promo = recent(input.signals, "promo_quantity", 1)[0] ?? 0;
  const drivers: OracleForecast["drivers"] = [];
  let weeklyRate = Math.max(sales, orders);
  drivers.push({ name: "higher-of-sales-or-orders", impact: weeklyRate, explanation: `Used the higher L6 weekly average: sales ${sales.toFixed(2)}, orders ${orders.toFixed(2)}.` });

  const isLicKids = config.licKidsProductGroups.some((value) => input.product.productGroup?.toLowerCase() === value);
  if (isLicKids && sales > 0 && orders > sales * config.orderNoiseCeilingMultiplier) {
    const capped = sales * config.orderNoiseCeilingMultiplier;
    drivers.push({ name: "Lic Kids order-noise ceiling", impact: capped - weeklyRate, explanation: `Order-driven demand was capped at ${config.orderNoiseCeilingMultiplier}× L6 sales.` });
    weeklyRate = capped;
  }

  const modifier = config.lifecycleModifiers[input.lifecycleState];
  if (modifier !== 1) {
    drivers.push({ name: "lifecycle adjustment", impact: weeklyRate * (modifier - 1), explanation: `${input.lifecycleState} applies an explicit ${modifier.toFixed(2)} multiplier.` });
    weeklyRate *= modifier;
  }
  let total = weeklyRate * input.horizonWeeks;
  if (promo > 0) {
    const promoPlan = promo * (1 + config.promoBackupRate);
    drivers.push({ name: "promo quantity plus backup", impact: Math.max(0, promoPlan - total), explanation: `Significant promo quantity uses actual promo orders plus ${(config.promoBackupRate * 100).toFixed(0)}% backup.` });
    total = Math.max(total, promoPlan);
  }
  const confidence = Math.min(0.9, 0.35 + Math.min(6, recent(input.signals, "sales_units").length) * 0.06 + Math.min(6, recent(input.signals, "order_units").length) * 0.04);
  const missing = [sales === 0 ? "L6 weekly sales" : null, orders === 0 ? "L6 weekly orders" : null].filter((value): value is string => Boolean(value));
  return {
    model: "MichaelModel", modelVersion: MICHAEL_MODEL_VERSION, product: input.product,
    horizonWeeks: input.horizonWeeks, baseForecast: Math.max(0, total),
    lowerBound: Math.max(0, total * 0.85), upperBound: total * 1.15,
    weeklyRate: Math.max(0, weeklyRate), confidence: missing.length ? confidence * 0.65 : confidence,
    assumptions: ["The supplied planning rules are a measurable planner model, not universal truth."],
    missingEvidence: missing, drivers, calculatedAt: input.calculatedAt ?? new Date().toISOString(),
  };
}
