import test from "node:test";
import assert from "node:assert/strict";
import {
  NormalizingEvidenceAdapter,
  stringCursorCodec,
  type EvidenceProviderPage,
  type EvidenceProviderReader,
} from "../lib/evidence/provider";
import type { EvidenceNormalizationPipeline } from "../lib/evidence/normalization";
import { EvidenceProviderRegistry } from "../lib/evidence/registry";
import {
  EvidenceSyncCoordinator,
  type EvidenceSyncRun,
  type EvidenceSyncStore,
} from "../lib/evidence/sync";
import type { NormalizedEvidenceRecord } from "../lib/evidence/types";

type TestRecord = {
  id: string;
  observedAt: string;
};

class TestReader implements EvidenceProviderReader<TestRecord, string> {
  readonly descriptor = {
    key: "test-provider",
    displayName: "Test provider",
    contractVersion: "1",
    datasets: ["catalog"] as const,
  };
  calls = 0;

  async pull(): Promise<EvidenceProviderPage<TestRecord, string>> {
    this.calls += 1;
    return {
      records: [
        {
          id: `record_${this.calls}`,
          observedAt: "2026-07-27T11:00:00.000Z",
        },
      ],
      nextCursor: this.calls === 1 ? "page_2" : undefined,
      hasMore: this.calls === 1,
      providerRequestReference: `request_${this.calls}`,
    };
  }
}

const pipeline: EvidenceNormalizationPipeline<TestRecord> = {
  name: "test",
  version: "1",
  normalize(record) {
    return [
      {
        dataset: "catalog",
        kind: "catalog.test",
        sourceRecordReference: record.id,
        title: record.id,
        summary: "Normalized test evidence.",
        value: { type: "attributes", attributes: { id: record.id } },
        observedAt: record.observedAt,
        schemaVersion: "1",
        limitations: [],
      },
    ];
  },
};

class TestStore implements EvidenceSyncStore {
  run?: EvidenceSyncRun;
  cursor?: string;
  records: NormalizedEvidenceRecord[] = [];

  async beginRun(run: EvidenceSyncRun) {
    if (this.run) return { accepted: false, run: this.run };
    this.run = run;
    return { accepted: true, run };
  }

  async getCursor() {
    return this.cursor;
  }

  async savePage(input: {
    records: NormalizedEvidenceRecord[];
    nextCursor?: string;
  }) {
    this.records.push(...input.records);
    this.cursor = input.nextCursor;
  }

  async completeRun(run: EvidenceSyncRun) {
    this.run = { ...run };
  }

  async failRun(run: EvidenceSyncRun) {
    this.run = { ...run };
  }
}

test("sync coordinator normalizes pages and preserves idempotency", async () => {
  const reader = new TestReader();
  const adapter = new NormalizingEvidenceAdapter(
    reader,
    pipeline,
    stringCursorCodec,
  );
  const registry = new EvidenceProviderRegistry().register(adapter);
  const store = new TestStore();
  const times = [
    "2026-07-27T12:00:00.000Z",
    "2026-07-27T12:00:01.000Z",
    "2026-07-27T12:00:02.000Z",
    "2026-07-27T12:00:03.000Z",
  ];
  const coordinator = new EvidenceSyncCoordinator(
    registry,
    store,
    () => times.shift() ?? "2026-07-27T12:00:04.000Z",
  );
  const request = {
    organizationId: "org_1",
    sourceId: "source_1",
    sourceName: "Test source",
    provider: "test-provider",
    dataset: "catalog" as const,
    requestKey: "request_123",
  };

  const completed = await coordinator.synchronize(request);
  const repeated = await coordinator.synchronize(request);

  assert.equal(completed.status, "succeeded");
  assert.equal(completed.pagesProcessed, 2);
  assert.equal(completed.recordsProcessed, 2);
  assert.equal(store.records.length, 2);
  assert.equal(store.records[0].provider, "test-provider");
  assert.equal(reader.calls, 2);
  assert.deepEqual(repeated, completed);
});
