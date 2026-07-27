import type {
  EvidenceDataset,
  EvidenceFreshness,
} from "./types";

export type EvidenceFreshnessPolicy = {
  currentForMs: number;
  delayedForMs: number;
  cacheForMs: number;
};

const hour = 60 * 60 * 1000;

export const DEFAULT_FRESHNESS_POLICIES: Record<
  EvidenceDataset,
  EvidenceFreshnessPolicy
> = {
  catalog: {
    currentForMs: 24 * hour,
    delayedForMs: 72 * hour,
    cacheForMs: 4 * hour,
  },
  advertising: {
    currentForMs: 6 * hour,
    delayedForMs: 48 * hour,
    cacheForMs: hour,
  },
  demand: {
    currentForMs: 24 * hour,
    delayedForMs: 72 * hour,
    cacheForMs: 4 * hour,
  },
  inventory: {
    currentForMs: 6 * hour,
    delayedForMs: 24 * hour,
    cacheForMs: hour,
  },
  compliance: {
    currentForMs: 6 * hour,
    delayedForMs: 24 * hour,
    cacheForMs: hour,
  },
  creative: {
    currentForMs: 7 * 24 * hour,
    delayedForMs: 30 * 24 * hour,
    cacheForMs: 24 * hour,
  },
  executive: {
    currentForMs: 24 * hour,
    delayedForMs: 72 * hour,
    cacheForMs: 4 * hour,
  },
};

function timestamp(value: string, field: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${field} must be an ISO 8601 timestamp.`);
  }
  return parsed;
}

export function classifyEvidenceFreshness(
  observedAt: string,
  policy: EvidenceFreshnessPolicy,
  asOf = new Date().toISOString(),
): EvidenceFreshness {
  const age = Math.max(0, timestamp(asOf, "asOf") - timestamp(observedAt, "observedAt"));
  if (age <= policy.currentForMs) return "current";
  if (age <= policy.delayedForMs) return "delayed";
  return "stale";
}

export function evidenceExpiry(
  ingestedAt: string,
  policy: EvidenceFreshnessPolicy,
) {
  return new Date(timestamp(ingestedAt, "ingestedAt") + policy.cacheForMs).toISOString();
}

export function freshnessPolicyFor(dataset: EvidenceDataset) {
  return DEFAULT_FRESHNESS_POLICIES[dataset];
}
