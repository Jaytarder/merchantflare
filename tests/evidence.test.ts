import test from "node:test";
import assert from "node:assert/strict";
import {
  NO_EVIDENCE_LIMITATION,
  summarizeEvidence,
  type MercuryEvidenceItem,
} from "../lib/mercury/evidence";

function evidence(
  overrides: Partial<MercuryEvidenceItem> = {},
): MercuryEvidenceItem {
  return {
    id: "evidence_1",
    sourceId: "source_1",
    sourceName: "Verified source",
    sourceType: "commerce_provider",
    provider: "test-provider",
    dataset: "catalog",
    kind: "catalog.test",
    title: "Observed record",
    summary: "A sourced observation.",
    observedAt: "2026-07-26T12:00:00.000Z",
    ingestedAt: "2026-07-26T12:05:00.000Z",
    freshness: "current",
    limitations: [],
    provenance: {
      provider: "test-provider",
      sourceId: "source_1",
      sourceRecordReference: "record_1",
      observedAt: "2026-07-26T12:00:00.000Z",
      ingestedAt: "2026-07-26T12:05:00.000Z",
      pipeline: "test",
      pipelineVersion: "1",
      transformations: [],
      contentHash: "hash",
    },
    ...overrides,
  };
}

test("reports unavailable coverage when no evidence exists", () => {
  assert.deepEqual(summarizeEvidence([]), {
    status: "unavailable",
    itemCount: 0,
    sourceCount: 0,
    limitation: NO_EVIDENCE_LIMITATION,
    items: [],
  });
});

test("reports available coverage for current evidence without limitations", () => {
  const result = summarizeEvidence([
    evidence(),
    evidence({
      id: "evidence_2",
      observedAt: "2026-07-27T12:00:00.000Z",
    }),
  ]);

  assert.equal(result.status, "available");
  assert.equal(result.itemCount, 2);
  assert.equal(result.sourceCount, 1);
  assert.equal(result.lastObservedAt, "2026-07-27T12:00:00.000Z");
});

test("reports partial coverage when evidence is stale or limited", () => {
  const result = summarizeEvidence([
    evidence({
      freshness: "stale",
      limitations: ["The source is outside the target reporting window."],
    }),
  ]);

  assert.equal(result.status, "partial");
  assert.match(result.limitation, /stale/i);
});

test("reports partial coverage when evidence is delayed", () => {
  const coverage = summarizeEvidence([
    evidence({ freshness: "delayed" }),
  ]);

  assert.equal(coverage.status, "partial");
  assert.match(coverage.limitation, /delayed/i);
});
