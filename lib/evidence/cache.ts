export type EvidenceCacheState = "fresh" | "stale" | "miss";

export type EvidenceCacheEntry<T> = {
  key: string;
  value: T;
  storedAt: string;
  expiresAt: string;
  staleUntil: string;
};

export type EvidenceCacheResult<T> = {
  state: EvidenceCacheState;
  value?: T;
  storedAt?: string;
};

export interface EvidenceCache {
  get<T>(key: string, asOf?: string): Promise<EvidenceCacheResult<T>>;
  set<T>(entry: EvidenceCacheEntry<T>): Promise<void>;
  invalidate(prefix: string): Promise<number>;
}

function time(value: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error("Cache timestamps must use ISO 8601.");
  }
  return parsed;
}

export class MemoryEvidenceCache implements EvidenceCache {
  private readonly entries = new Map<string, EvidenceCacheEntry<unknown>>();

  constructor(private readonly maxEntries = 500) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1) {
      throw new Error("Evidence cache capacity must be a positive integer.");
    }
  }

  async get<T>(
    key: string,
    asOf = new Date().toISOString(),
  ): Promise<EvidenceCacheResult<T>> {
    const entry = this.entries.get(key);
    if (!entry) return { state: "miss" };
    const now = time(asOf);
    if (now > time(entry.staleUntil)) {
      this.entries.delete(key);
      return { state: "miss" };
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return {
      state: now <= time(entry.expiresAt) ? "fresh" : "stale",
      value: entry.value as T,
      storedAt: entry.storedAt,
    };
  }

  async set<T>(entry: EvidenceCacheEntry<T>) {
    if (time(entry.expiresAt) < time(entry.storedAt)) {
      throw new Error("Cache expiry cannot precede storage time.");
    }
    if (time(entry.staleUntil) < time(entry.expiresAt)) {
      throw new Error("Cache stale window cannot end before expiry.");
    }
    this.entries.delete(entry.key);
    this.entries.set(entry.key, entry);
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (!oldest) break;
      this.entries.delete(oldest);
    }
  }

  async invalidate(prefix: string) {
    let removed = 0;
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) {
        this.entries.delete(key);
        removed += 1;
      }
    }
    return removed;
  }
}

export function evidenceCacheKey(input: {
  organizationId: string;
  sourceId?: string;
  dataset?: string;
  accountId?: string;
  marketplace?: string;
  limit?: number;
}) {
  return [
    "evidence",
    input.organizationId,
    input.sourceId ?? "*",
    input.dataset ?? "*",
    input.accountId ?? "*",
    input.marketplace ?? "*",
    input.limit?.toString() ?? "*",
  ].join(":");
}
