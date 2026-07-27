import test from "node:test";
import assert from "node:assert/strict";
import { MemoryEvidenceCache } from "../lib/evidence/cache";
import {
  classifyEvidenceFreshness,
  type EvidenceFreshnessPolicy,
} from "../lib/evidence/freshness";
import { normalizeEvidenceBatch } from "../lib/evidence/normalization";
import { CachedEvidenceQueryService } from "../lib/evidence/query";
import {
  amazonAdsNormalizationPipeline,
  amazonSpApiNormalizationPipeline,
} from "../lib/evidence/providers";
import type {
  EvidenceQuery,
  NormalizedEvidenceRecord,
} from "../lib/evidence/types";

const policy: EvidenceFreshnessPolicy = {
  currentForMs: 1_000,
  delayedForMs: 2_000,
  cacheForMs: 500,
};

test("classifies evidence at explicit freshness boundaries", () => {
  const observedAt = "2026-07-27T12:00:00.000Z";
  assert.equal(
    classifyEvidenceFreshness(
      observedAt,
      policy,
      "2026-07-27T12:00:01.000Z",
    ),
    "current",
  );
  assert.equal(
    classifyEvidenceFreshness(
      observedAt,
      policy,
      "2026-07-27T12:00:01.001Z",
    ),
    "delayed",
  );
  assert.equal(
    classifyEvidenceFreshness(
      observedAt,
      policy,
      "2026-07-27T12:00:02.001Z",
    ),
    "stale",
  );
});

test("normalizes Amazon SP-API records into provider-neutral evidence", () => {
  const records = normalizeEvidenceBatch({
    records: [
      {
        type: "inventory-summary" as const,
        sellerSku: "SKU-1",
        asin: "B000000001",
        marketplace: "ATVPDKIKX0DER",
        fulfillableQuantity: 12,
        inboundQuantity: 5,
        observedAt: "2026-07-27T11:30:00.000Z",
      },
    ],
    context: {
      organizationId: "org_1",
      sourceId: "source_1",
      sourceName: "Amazon operations",
      provider: "amazon-sp-api",
    },
    pipeline: amazonSpApiNormalizationPipeline,
    ingestedAt: "2026-07-27T12:00:00.000Z",
  });

  assert.equal(records.length, 1);
  assert.equal(records[0].dataset, "inventory");
  assert.equal(records[0].kind, "inventory.fulfillment-summary");
  assert.equal(records[0].value.type, "attributes");
  assert.equal(records[0].provenance.provider, "amazon-sp-api");
  assert.equal(records[0].provenance.pipeline, "amazon-sp-api");
  assert.match(records[0].id, /^evidence_[a-f0-9]{64}$/);
});

test("keeps evidence identity stable when a source display name changes", () => {
  const input = {
    records: [
      {
        type: "catalog-item" as const,
        asin: "B000000001",
        marketplace: "ATVPDKIKX0DER",
        title: "Example product",
        status: "active",
        observedAt: "2026-07-27T11:30:00.000Z",
      },
    ],
    context: {
      organizationId: "org_1",
      sourceId: "source_1",
      sourceName: "Original display name",
      provider: "amazon-sp-api",
    },
    pipeline: amazonSpApiNormalizationPipeline,
    ingestedAt: "2026-07-27T12:00:00.000Z",
  };
  const original = normalizeEvidenceBatch(input);
  const renamed = normalizeEvidenceBatch({
    ...input,
    context: {
      ...input.context,
      sourceName: "Renamed display name",
    },
  });

  assert.equal(original[0].id, renamed[0].id);
  assert.equal(renamed[0].sourceName, "Renamed display name");
});

test("normalizes Amazon Ads metrics without exposing a provider payload", () => {
  const records = normalizeEvidenceBatch({
    records: [
      {
        type: "campaign-performance" as const,
        profileId: "profile_1",
        campaignId: "campaign_1",
        campaignName: "Core products",
        marketplace: "US",
        currency: "USD",
        spend: 100,
        attributedSales: 450,
        impressions: 10_000,
        clicks: 500,
        periodStart: "2026-07-20T00:00:00.000Z",
        periodEnd: "2026-07-26T23:59:59.000Z",
        observedAt: "2026-07-27T10:00:00.000Z",
        attributionWindowDays: 14,
      },
    ],
    context: {
      organizationId: "org_1",
      sourceId: "source_ads",
      sourceName: "Amazon advertising",
      provider: "amazon-ads",
    },
    pipeline: amazonAdsNormalizationPipeline,
    ingestedAt: "2026-07-27T12:00:00.000Z",
  });

  assert.equal(records.length, 5);
  const roas = records.find((record) => record.kind === "advertising.roas");
  assert.ok(roas);
  assert.deepEqual(roas.value, {
    type: "metric",
    metric: "roas",
    value: 4.5,
    unit: "ratio",
    dimensions: {
      profileId: "profile_1",
      campaignId: "campaign_1",
      campaignName: "Core products",
      attributionWindowDays: 14,
    },
  });
  assert.equal("rawPayload" in roas, false);
});

test("cache distinguishes fresh, stale, and expired entries", async () => {
  const cache = new MemoryEvidenceCache();
  await cache.set({
    key: "evidence:org_1",
    value: ["record"],
    storedAt: "2026-07-27T12:00:00.000Z",
    expiresAt: "2026-07-27T12:01:00.000Z",
    staleUntil: "2026-07-27T12:02:00.000Z",
  });

  assert.equal(
    (await cache.get("evidence:org_1", "2026-07-27T12:00:30.000Z")).state,
    "fresh",
  );
  assert.equal(
    (await cache.get("evidence:org_1", "2026-07-27T12:01:30.000Z")).state,
    "stale",
  );
  assert.equal(
    (await cache.get("evidence:org_1", "2026-07-27T12:02:01.000Z")).state,
    "miss",
  );
});

test("query service reuses normalized cache entries", async () => {
  let reads = 0;
  const record = {
    dataset: "catalog",
    observedAt: "2026-07-27T11:30:00.000Z",
  } as NormalizedEvidenceRecord;
  const reader = {
    async query(_input: EvidenceQuery) {
      reads += 1;
      return [record];
    },
  };
  const service = new CachedEvidenceQueryService(
    reader,
    new MemoryEvidenceCache(),
    () => "2026-07-27T12:00:00.000Z",
  );
  const query: EvidenceQuery = {
    organizationId: "org_1",
    datasets: ["catalog"],
  };

  await service.query(query);
  await service.query(query);
  assert.equal(reads, 1);
});
