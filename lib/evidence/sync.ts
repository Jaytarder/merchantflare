import { createHash } from "node:crypto";
import type { EvidenceSyncAdapter } from "./provider";
import { EvidenceProviderRegistry } from "./registry";
import type { EvidenceCache } from "./cache";
import type {
  EvidenceDataset,
  EvidenceProviderKey,
  NormalizedEvidenceRecord,
} from "./types";

export type EvidenceSyncStatus =
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type EvidenceSyncRun = {
  id: string;
  organizationId: string;
  sourceId: string;
  provider: EvidenceProviderKey;
  dataset: EvidenceDataset;
  requestKey: string;
  status: EvidenceSyncStatus;
  startedAt: string;
  completedAt?: string;
  recordsProcessed: number;
  pagesProcessed: number;
  errorCode?: string;
  errorMessage?: string;
};

export type EvidenceSyncRequest = {
  organizationId: string;
  sourceId: string;
  sourceName: string;
  connectionId?: string;
  provider: EvidenceProviderKey;
  accountId?: string;
  marketplace?: string;
  dataset: EvidenceDataset;
  requestKey: string;
  maxPages?: number;
};

export interface EvidenceSyncStore {
  beginRun(run: EvidenceSyncRun): Promise<{
    accepted: boolean;
    run: EvidenceSyncRun;
  }>;
  getCursor(run: EvidenceSyncRun): Promise<string | undefined>;
  savePage(input: {
    run: EvidenceSyncRun;
    records: NormalizedEvidenceRecord[];
    nextCursor?: string;
    providerRequestReference?: string;
  }): Promise<void>;
  completeRun(run: EvidenceSyncRun): Promise<void>;
  failRun(run: EvidenceSyncRun): Promise<void>;
}

export class EvidenceSyncError extends Error {
  constructor(
    message: string,
    readonly code:
      | "provider_unavailable"
      | "invalid_request"
      | "page_limit_exceeded"
      | "provider_failure",
  ) {
    super(message);
    this.name = "EvidenceSyncError";
  }
}

function syncRunId(input: EvidenceSyncRequest) {
  return `sync_${createHash("sha256")
    .update(`${input.organizationId}:${input.requestKey}`)
    .digest("hex")}`;
}

function supportsDataset(
  adapter: EvidenceSyncAdapter,
  dataset: EvidenceDataset,
) {
  return adapter.descriptor.datasets.includes(dataset);
}

export class EvidenceSyncCoordinator {
  constructor(
    private readonly registry: EvidenceProviderRegistry,
    private readonly store: EvidenceSyncStore,
    private readonly now: () => string = () => new Date().toISOString(),
    private readonly cache?: EvidenceCache,
  ) {}

  async synchronize(input: EvidenceSyncRequest): Promise<EvidenceSyncRun> {
    if (!input.requestKey.trim()) {
      throw new EvidenceSyncError(
        "Evidence synchronization requires an idempotency key.",
        "invalid_request",
      );
    }

    let adapter: EvidenceSyncAdapter;
    try {
      adapter = this.registry.get(input.provider);
    } catch {
      throw new EvidenceSyncError(
        `Evidence provider ${input.provider} is not available.`,
        "provider_unavailable",
      );
    }
    if (!supportsDataset(adapter, input.dataset)) {
      throw new EvidenceSyncError(
        `${input.provider} does not support ${input.dataset} evidence.`,
        "invalid_request",
      );
    }

    const run: EvidenceSyncRun = {
      id: syncRunId(input),
      organizationId: input.organizationId,
      sourceId: input.sourceId,
      provider: input.provider,
      dataset: input.dataset,
      requestKey: input.requestKey,
      status: "running",
      startedAt: this.now(),
      recordsProcessed: 0,
      pagesProcessed: 0,
    };
    const beginning = await this.store.beginRun(run);
    if (!beginning.accepted) return beginning.run;

    const maxPages = Math.min(Math.max(input.maxPages ?? 25, 1), 100);
    let cursor = await this.store.getCursor(run);

    try {
      for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
        const page = await adapter.synchronize({
          context: {
            organizationId: input.organizationId,
            sourceId: input.sourceId,
            sourceName: input.sourceName,
            connectionId: input.connectionId,
            provider: input.provider,
            accountId: input.accountId,
            marketplace: input.marketplace,
          },
          dataset: input.dataset,
          cursor,
          requestedAt: this.now(),
        });

        await this.store.savePage({
          run,
          records: page.records,
          nextCursor: page.nextCursor,
          providerRequestReference: page.providerRequestReference,
        });
        await this.cache?.invalidate(`evidence:${input.organizationId}:`);
        run.recordsProcessed += page.records.length;
        run.pagesProcessed += 1;
        cursor = page.nextCursor;

        if (!page.hasMore) {
          run.status = "succeeded";
          run.completedAt = this.now();
          await this.store.completeRun(run);
          return run;
        }
        if (!cursor) {
          throw new EvidenceSyncError(
            "The provider reported more evidence without a continuation cursor.",
            "provider_failure",
          );
        }
      }

      throw new EvidenceSyncError(
        `Evidence synchronization exceeded the ${maxPages}-page safety limit.`,
        "page_limit_exceeded",
      );
    } catch (error) {
      run.status = "failed";
      run.completedAt = this.now();
      run.errorCode =
        error instanceof EvidenceSyncError ? error.code : "provider_failure";
      run.errorMessage =
        error instanceof Error
          ? error.message
          : "Evidence synchronization failed.";
      await this.store.failRun(run);
      throw error;
    }
  }
}
