# Vector — Advertising Intelligence Specification

**Status:** Foundation implemented and locally verified; live data and execution planned
**Roadmap stage:** 4
**Canonical route:** `/vector`

## Purpose

Vector explains advertising performance, identifies waste and growth opportunities, and produces governed bid, budget, targeting, and campaign recommendations tied to commercial outcomes.

## Current implementation evidence

Vector now has an authenticated organization-scoped compatibility route, assessment API, typed independent model, Christian report ingestion boundary, Safe Demand Envelope, Oracle–Vector coordination, possible futures, dependency invalidation, outcome scoring, RBAC, and additive migration `011`. There is no Amazon Ads API client or authorization flow, connected ingestion, or mutation adapter. With no product-resolved evidence, the route returns an explicit empty state.

## In scope

- Campaign, ad group, target, search term, placement, budget, bid, and advertised-product performance.
- Spend efficiency and contribution in the context of revenue and profitability.
- Branded, non-branded, competitor, category, and product-targeting analysis.
- Budget constraint, wasted spend, coverage, and scaling opportunities.
- Governed recommendations and approved advertising changes.
- Change-effect measurement with a defensible comparison method.

## Required inputs

Vector MUST consume:

- authorized advertising account structure and performance;
- attributed sales and conversion observations;
- catalog and product identity;
- organization targets and guardrails;
- cost or contribution inputs when profitability is claimed; and
- source date ranges, attribution windows, currency, and freshness.

Absent profit inputs MUST prevent claims about profit improvement.

## Outputs

Each Vector recommendation MUST include:

- account and entity scope;
- evidence and date range;
- current state;
- proposed change;
- rationale and confidence;
- forecast impact with assumptions;
- risk and guardrail checks;
- approval requirement; and
- execution and measured-outcome references.

## Functional requirements

- Future connected-data views MUST filter by account, marketplace, brand, campaign, objective, status, and date range.
- Metric definitions MUST expose attribution window and currency.
- Recommendations MUST identify conflicts with inventory, catalog, or organization guardrails.
- Bid, budget, targeting, and state changes MUST be approval-gated according to policy.
- Mutation requests MUST be idempotent and reconcile provider state after execution.
- Rate limits and partial provider failures MUST be visible.
- Rollback or compensating behavior MUST be defined for each supported change type.
- Outcome reporting MUST avoid attributing all observed movement to the recommendation without a stated method.

## Experience requirements

The route MUST provide:

- performance overview with source context;
- diagnostic findings;
- prioritized recommendations;
- entity-level drill-down;
- exact proposed changes;
- approval and execution state; and
- measured results.

## Non-goals for the first Vector milestone

- Fully autonomous campaign management.
- Cross-network advertising beyond the selected first provider.
- Profit optimization without cost data.
- Unsupported bulk mutation types.

## Acceptance criteria

Vector is implemented only when:

- `/vector` is authenticated and organization-scoped;
- a production Amazon Ads connection ingests normalized entities and metrics;
- findings cite source entities, windows, and freshness;
- recommendations expose exact proposed changes and guardrails;
- approved changes execute idempotently and reconcile provider state;
- errors, throttling, and partial results are persisted and visible;
- measured outcomes use explicit methodology; and
- tests cover metrics, authorization, approvals, idempotency, and provider failures.

## Dependencies

- [Platform contracts](platform-contracts.md)
- [Integrations](integrations.md)
- [Approvals](approvals.md)
- [Execution](execution.md)
- [Atlas](atlas.md)
- [Oracle](oracle.md)

## Open decisions

- First supported Amazon Ads account and marketplace types.
- Attribution windows and canonical advertising metrics.
- Source of cost and contribution margin.
- Initial mutation allowlist and rollback behavior.
- Experimentation or causal measurement approach.

\n
