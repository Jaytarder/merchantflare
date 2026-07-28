# Atlas — Catalog Intelligence Specification

**Status:** Scaffolded
**Roadmap stage:** 3
**Canonical route:** `/atlas`

## Purpose

Atlas turns catalog and product-detail evidence into prioritized findings and governed content recommendations. It must improve discoverability, catalog integrity, and conversion quality without treating generated content as published content.

## Current implementation evidence

Atlas Foundations is implemented. `lib/atlas/` defines typed assessments, explainable health components, findings, recommendations, opportunities, and governed improvement plans. `/atlas` is authenticated and responsive; `GET /api/atlas/assessment` exposes the same organization-scoped read model. Mercury routes catalog objectives through Atlas and persists its typed assessment inside the plan snapshot.

Atlas reads only normalized Commerce Evidence Layer catalog and compliance records. It explicitly reports missing evidence, excludes unavailable dimensions from overall scoring, and generates no recommendation from an evidence gap. No catalog provider is connected, and there is no product filtering, field-level diff, publication adapter, provider result handling, or measured outcome flow. Therefore this specification remains **Scaffolded**, not Implemented, under the acceptance criteria below.

## In scope

- Product, SKU, ASIN, variation, category, and marketplace relationships.
- Title, bullets, description, attributes, imagery references, and enhanced content.
- Content completeness, policy constraints, discoverability, and conversion friction.
- Search-query and keyword coverage when an authorized source exists.
- Prioritized findings and recommended content changes.
- Reviewable before/after diffs and approval-gated publication.
- Measurement of accepted changes against a defined baseline.

## Required inputs

Atlas MUST consume normalized, source-attributed data for:

- catalog identity and relationships;
- current product content and attributes;
- marketplace and category requirements;
- availability and suppression state where relevant;
- permitted search and conversion observations; and
- organization-specific brand, terminology, and content policy.

Missing required inputs MUST produce an explicit coverage limitation, not fabricated analysis.

## Outputs

Atlas outputs MUST use typed contracts for:

- catalog finding;
- affected product scope;
- evidence references;
- severity and confidence rationale;
- recommended change;
- field-level before/after diff;
- expected outcome and assumptions;
- policy or approval requirement; and
- measured result when available.

## Functional requirements

- Users MUST be able to filter findings by account, marketplace, brand, product, severity, status, and freshness.
- Each finding MUST identify evidence, affected records, and why it matters.
- Recommendations MUST preserve factual product claims and organization policy.
- Atlas MUST detect variation and identifier ambiguity before proposing updates.
- Publishing changes MUST be separate from generating recommendations.
- Material content updates MUST pass approval policy and record the exact approved diff.
- Provider failures MUST not mark a change as published.
- Accepted, rejected, superseded, and measured recommendations MUST remain in history.

## Experience requirements

The route MUST provide:

- catalog health and coverage with source/freshness context;
- prioritized findings;
- product-level evidence;
- reviewable recommendations;
- content comparison;
- approval and execution state; and
- outcome reporting.

Sample content MUST be labeled. The page MUST not claim a catalog is connected until integration health verifies it.

## Non-goals for the first Atlas milestone

- Autonomous publication without policy and approval.
- Unsupported marketplace editing.
- Fabricated SEO volume or benchmark data.
- Replacing a product information management system.

## Acceptance criteria

Atlas is implemented only when:

- `/atlas` is an authenticated, responsive route;
- at least one authorized catalog source is ingested and normalized;
- findings cite source records and freshness;
- users can review field-level recommendations;
- approved changes execute idempotently through a production adapter;
- provider results and failures are persisted;
- outcome measurement distinguishes projection from actual performance; and
- tests cover catalog identity, diffing, policy, authorization, and execution failure.

Foundation coverage currently satisfies the authenticated responsive route, evidence citations/freshness contract, transparent assessment behavior, organization isolation, and approval compatibility. It does not satisfy the authorized-source, field-level diff, execution, provider-result, or outcome-measurement criteria.

## Dependencies

- [Platform contracts](platform-contracts.md)
- [Integrations](integrations.md)
- [Approvals](approvals.md)
- [Execution](execution.md)
- [History](history.md)
- [Knowledge](knowledge.md)

## Open decisions

- First catalog source and account model.
- Supported content fields and marketplaces for the first release.
- Brand-policy authoring and enforcement.
- Benchmark and keyword-data providers.
- Minimum measurement window for conversion outcomes.

\n
