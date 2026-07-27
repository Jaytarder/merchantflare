import {
  evidenceCacheKey,
  type EvidenceCache,
} from "./cache";
import {
  classifyEvidenceFreshness,
  freshnessPolicyFor,
} from "./freshness";
import type {
  EvidenceQuery,
  NormalizedEvidenceRecord,
} from "./types";

export interface EvidenceReader {
  query(input: EvidenceQuery): Promise<NormalizedEvidenceRecord[]>;
}

function cacheWindow(query: EvidenceQuery) {
  return Math.min(
    ...query.datasets.map((dataset) => freshnessPolicyFor(dataset).cacheForMs),
  );
}

function atFreshnessBoundary(
  records: NormalizedEvidenceRecord[],
  asOf: string,
) {
  return records.map((record) => ({
    ...record,
    freshness: classifyEvidenceFreshness(
      record.observedAt,
      freshnessPolicyFor(record.dataset),
      asOf,
    ),
  }));
}

export class CachedEvidenceQueryService {
  constructor(
    private readonly reader: EvidenceReader,
    private readonly cache: EvidenceCache,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async query(input: EvidenceQuery): Promise<NormalizedEvidenceRecord[]> {
    if (input.datasets.length === 0) return [];
    const key = evidenceCacheKey({
      organizationId: input.organizationId,
      dataset: [...input.datasets].sort().join(","),
      accountId: input.accountId,
      marketplace: input.marketplace,
      limit: input.limit,
    });
    const asOf = input.asOf ?? this.now();
    const cached = await this.cache.get<NormalizedEvidenceRecord[]>(key, asOf);
    if (cached.state === "fresh" && cached.value) {
      return atFreshnessBoundary(cached.value, asOf);
    }

    const records = await this.reader.query({ ...input, asOf });
    const windowMs = cacheWindow(input);
    const stored = Date.parse(asOf);
    await this.cache.set({
      key,
      value: records,
      storedAt: asOf,
      expiresAt: new Date(stored + windowMs).toISOString(),
      staleUntil: new Date(stored + windowMs * 2).toISOString(),
    });
    return atFreshnessBoundary(records, asOf);
  }
}
