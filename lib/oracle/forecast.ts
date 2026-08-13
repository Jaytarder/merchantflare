import type { OracleDemandSignal, OracleForecast, OracleLifecycleState, OracleProductRef } from "./types";

export const ORACLE_MODEL_VERSION = "2026-08-13.v1";
const lifecycleModifiers: Record<OracleLifecycleState, number> = {
  NEWNESS: 1, GROWTH: 1.12, STABLE: 1, PROMO_SPIKE: 1, SEASONAL: 1.05,
  MOVIE_RELEASE: 1.12, POST_EVENT_DECAY: 0.7, DECLINING: 0.82, END_OF_LIFE: 0.45,
};

function sorted(signals: OracleDemandSignal[], metric: OracleDemandSignal["metric"]) {
  return signals.filter((signal) => signal.metric === metric).sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
}

function weighted(values: number[]) {
  if (!values.length) return 0;
  const weights = values.map((_, index) => index + 1);
  return values.reduce((sum, value, index) => sum + value * weights[index], 0) / weights.reduce((a, b) => a + b, 0);
}

export function calculateOracleForecast(input: {
  product: OracleProductRef;
  signals: OracleDemandSignal[];
  horizonWeeks: number;
  lifecycleState: OracleLifecycleState;
  calculatedAt?: string;
}): OracleForecast {
  const salesSignals = sorted(input.signals, "sales_units").slice(-8);
  const orderSignals = sorted(input.signals, "order_units").slice(-8);
  const uncensoredSales = salesSignals.filter((signal) => !signal.demandCensored);
  const salesBasis = weighted((uncensoredSales.length ? uncensoredSales : salesSignals).map((signal) => signal.value));
  const orderBasis = weighted(orderSignals.map((signal) => signal.value));
  const cancellations = weighted(sorted(input.signals, "cancellations").slice(-8).map((signal) => signal.value));
  const promo = sorted(input.signals, "promo_quantity").at(-1)?.value ?? 0;
  const categoryTrend = sorted(input.signals, "category_trend").at(-1)?.value ?? 0;
  const divergence = salesBasis > 0 ? Math.abs(orderBasis - salesBasis) / salesBasis : 0;
  const drivers: OracleForecast["drivers"] = [];
  let weeklyRate = salesBasis * 0.7 + Math.max(0, orderBasis - cancellations) * 0.3;
  drivers.push({ name: "weighted recent demand", impact: weeklyRate, explanation: "Recent uncensored sales receive 70% weight; net orders receive 30%." });
  if (salesSignals.some((signal) => signal.demandCensored)) {
    drivers.push({ name: "stockout censoring", impact: 0, explanation: "Low-availability periods were excluded when uncensored observations existed." });
  }
  if (divergence > 0.33) {
    const reduction = weeklyRate * Math.min(0.25, divergence * 0.1);
    weeklyRate -= reduction;
    drivers.push({ name: "sales-order disagreement", impact: -reduction, explanation: "Large sales/order divergence reduces reliance on the blended rate." });
  }
  if (categoryTrend !== 0) {
    const impact = weeklyRate * Math.max(-0.25, Math.min(0.25, categoryTrend));
    weeklyRate += impact;
    drivers.push({ name: "category trend", impact, explanation: "The source-attributed category trend modifies the recent-demand basis." });
  }
  const lifecycle = lifecycleModifiers[input.lifecycleState];
  const lifecycleImpact = weeklyRate * (lifecycle - 1);
  weeklyRate *= lifecycle;
  if (lifecycle !== 1) drivers.push({ name: "lifecycle", impact: lifecycleImpact, explanation: `${input.lifecycleState} uses a ${lifecycle.toFixed(2)} explainable modifier.` });
  let total = weeklyRate * input.horizonWeeks;
  if (promo > 0) {
    const promoUplift = Math.max(0, promo - total) * 0.8;
    total += promoUplift;
    drivers.push({ name: "promo uplift", impact: promoUplift, explanation: "Promo quantity informs the forecast without replacing the independent demand model." });
  }
  const evidenceCoverage = Math.min(1, (salesSignals.length + orderSignals.length) / 12);
  const freshness = input.signals.length ? input.signals.reduce((sum, signal) => sum + (signal.freshness === "current" ? 1 : signal.freshness === "delayed" ? 0.65 : signal.freshness === "stale" ? 0.25 : 0), 0) / input.signals.length : 0;
  const confidence = Math.max(0, Math.min(0.92, 0.2 + evidenceCoverage * 0.45 + freshness * 0.25 - Math.min(0.2, divergence * 0.12)));
  const uncertainty = 0.18 + (1 - confidence) * 0.42;
  const missing = [salesSignals.length < 4 ? "at least four demand periods" : null, orderSignals.length === 0 ? "order history" : null].filter((value): value is string => Boolean(value));
  return {
    model: "OracleModel", modelVersion: ORACLE_MODEL_VERSION, product: input.product,
    horizonWeeks: input.horizonWeeks, baseForecast: Math.max(0, total),
    lowerBound: Math.max(0, total * (1 - uncertainty)), upperBound: total * (1 + uncertainty),
    weeklyRate: Math.max(0, weeklyRate), confidence, assumptions: [
      "Recent demand is more informative than older demand unless source evidence says otherwise.",
      "Censored periods are not evidence of lower underlying demand.",
    ], missingEvidence: missing, drivers, calculatedAt: input.calculatedAt ?? new Date().toISOString(),
  };
}

export function detectStockoutCensoring(signals: OracleDemandSignal[]) {
  const availability = sorted(signals, "availability");
  const oh = sorted(signals, "amazon_oh");
  return signals.map((signal) => {
    if (signal.metric !== "sales_units") return signal;
    const matchingOh = oh.find((item) => item.periodStart <= signal.periodEnd && item.periodEnd >= signal.periodStart);
    const matchingAvailability = availability.find((item) => item.periodStart <= signal.periodEnd && item.periodEnd >= signal.periodStart);
    if ((matchingOh?.value ?? 1) <= 0 || (matchingAvailability?.value ?? 1) < 0.5) {
      return { ...signal, demandCensored: true, censorReason: "Low or intermittent Amazon availability overlaps this demand period." };
    }
    return signal;
  });
}
