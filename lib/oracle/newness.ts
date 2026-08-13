import type { OracleDemandSignal, OracleProductRef } from "./types";

export type NewnessAssessment = {
  product: OracleProductRef;
  first7DayVelocity?: number;
  first14DayVelocity?: number;
  first28DayVelocity?: number;
  acceleration?: number;
  availability: number;
  breakout: boolean;
  immediateBuyReview: boolean;
  reasons: string[];
  missingEvidence: string[];
};

export function assessNewness(input: { product: OracleProductRef; signals: OracleDemandSignal[]; expectedWeeklyVelocity?: number }): NewnessAssessment {
  const sales = input.signals.filter((signal) => signal.metric === "sales_units").sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
  const values = sales.map((signal) => signal.value);
  const mean = (items: number[]) => items.length ? items.reduce((sum, item) => sum + item, 0) / items.length : undefined;
  const first7 = values[0];
  const first14 = mean(values.slice(0, 2));
  const first28 = mean(values.slice(0, 4));
  const recent = values.at(-1);
  const acceleration = first14 && recent !== undefined ? (recent - first14) / Math.max(first14, 1) : undefined;
  const expected = input.expectedWeeklyVelocity;
  const breakout = recent !== undefined && expected !== undefined && recent >= expected * 1.5;
  const availability = input.signals.filter((signal) => signal.metric === "availability").at(-1)?.value ?? 1;
  return {
    product: input.product, first7DayVelocity: first7, first14DayVelocity: first14,
    first28DayVelocity: first28, acceleration, availability, breakout,
    immediateBuyReview: breakout && availability > 0,
    reasons: breakout ? ["Recent new-item velocity is at least 50% above the documented expectation."] : [],
    missingEvidence: [!input.product.launchDate ? "launch date" : null, values.length < 2 ? "at least 14 days of sales" : null, expected === undefined ? "expected launch velocity" : null].filter((value): value is string => Boolean(value)),
  };
}
