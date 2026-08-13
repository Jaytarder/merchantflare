# Oracle — Demand Intelligence Specification

**Status:** Foundation implemented; production unverified
**Roadmap stage:** 5
**Canonical route:** `/oracle`

## Purpose

Oracle converts demand, inventory, availability, and lead-time evidence into forecasts, risk explanations, and governed replenishment or demand-protection recommendations.

## Current implementation evidence

Oracle now has additive organization-scoped persistence, explicit MichaelModel rules, an independent explainable OracleModel, normalized demand/inventory evidence mapping, inventory-position and replenishment reasoning, model comparison, value of information, newness and censoring logic, attributed overrides, immutable outcomes, organization-scoped APIs, Mercury context, and an authenticated `/oracle` route. No production evidence provider or Outlook connector is connected; empty production evidence must remain unavailable rather than becoming sample data.

## In scope

- Demand history and forecast by product, account, marketplace, and time bucket.
- On-hand, inbound, available, reserved, and sellable inventory where sources support them.
- Lead time, reorder timing, weeks of supply, stockout, excess, and availability risk.
- Seasonality, event, promotion, and advertising assumptions.
- Replenishment and demand-protection recommendations.
- Forecast accuracy and recommendation outcome measurement.

## Required inputs

Oracle MUST consume:

- normalized product identity;
- ordered or shipped demand with defined metric semantics;
- current inventory and inbound state;
- lead-time and replenishment constraints;
- promotions and known events when available;
- advertising or catalog changes that materially alter demand; and
- source freshness and granularity.

The system MUST disclose data gaps and MUST NOT manufacture lead times or inventory positions.

## Outputs

Oracle outputs MUST include:

- forecast horizon and granularity;
- point forecast and uncertainty range;
- model/version and input cutoff;
- risk window and affected product scope;
- drivers and assumptions;
- recommended action;
- projected revenue or availability impact with method;
- approval requirement; and
- measured accuracy and outcome when available.

## Functional requirements

- Users MUST be able to inspect forecast history, current forecast, actuals, and error.
- Forecasts MUST be reproducible from versioned inputs and configuration.
- Risk prioritization MUST account for uncertainty and commercial impact.
- Recommendations MUST distinguish replenishment actions from advertising or catalog protections.
- Material replenishment or channel-control actions MUST require policy evaluation.
- Cross-module conflicts, such as scaling ads into constrained inventory, MUST be surfaced.
- Stale inventory MUST block claims of current availability.

## Experience requirements

The route MUST provide:

- demand and availability overview;
- forecast with uncertainty;
- stockout and excess risk queues;
- product-level drivers and assumptions;
- recommendations and governed actions; and
- forecast and business-outcome accuracy.

## Non-goals for the first Oracle milestone

- Replacing ERP or supply-planning systems.
- Unapproved purchase-order creation.
- False precision when history is sparse.
- Forecasting unsupported channels.

## Acceptance criteria

Oracle is implemented only when:

- `/oracle` is authenticated and organization-scoped;
- production demand and inventory data are normalized;
- forecasts are versioned, reproducible, and include uncertainty;
- product risks cite current evidence and assumptions;
- recommendations use approval and execution contracts;
- stale or missing data states are visible;
- forecast accuracy and measured outcomes are available; and
- tests cover time boundaries, sparse data, authorization, and stale inputs.

The foundation satisfies the authenticated organization-scoped route, reproducible versioned model contracts, uncertainty, explainability, missing-data behavior, additive persistence, RBAC, and local tests. It does not satisfy the production-source, provider execution, or measured production-outcome criteria; therefore the end-to-end specification remains production unverified.

## Dependencies

- [Platform contracts](platform-contracts.md)
- [Integrations](integrations.md)
- [Atlas](atlas.md)
- [Vector](vector.md)
- [Approvals](approvals.md)
- [Execution](execution.md)

## Open decisions

- First demand and inventory sources.
- Forecast granularity, horizon, and refresh cadence.
- Lead-time ownership.
- Treatment of promotions and out-of-stock censored demand.
- Initial executable replenishment actions.

\n
