# Product Modules

## Platform model

Mercury is the Commerce Intelligence Engine and primary conversational workspace. Atlas, Vector, Oracle, Sentinel, Forge, and Pulse are the intelligence modules Mercury draws on.

The canonical hierarchy is:

```text
MerchantFlare
├── Mercury — Commerce Intelligence Engine
└── Intelligence
    ├── Atlas — Catalog Intelligence
    ├── Vector — Advertising Intelligence
    ├── Oracle — Demand Intelligence
    ├── Sentinel — Compliance Intelligence
    ├── Forge — Creative Intelligence
    └── Pulse — Executive Intelligence
```

The modules are not assistants, workers, employees, or separate AI products.

## Mercury

**Role:** Commerce Intelligence Engine and conversational workspace

Mercury is responsible for:

- interpreting a user’s question or objective;
- gathering relevant intelligence across modules;
- maintaining business and conversation context;
- explaining findings and confidence;
- building coordinated plans;
- enforcing approval policies;
- tracking execution and history; and
- connecting activity to outcomes.

Current code provides early objective planning, routing, approval, persistence, normalized evidence selection, and execution primitives. Mercury reads and writes through an authenticated organization principal, enforces centralized role permissions, and records material mutations in the Platform Core audit and notification services. Mercury can attach normalized evidence already stored in the Commerce Evidence layer, but no live provider currently populates that store. The full conversational and orchestration experience is not complete.

Mercury can retrieve optional Decision Case context linked to a conversation and plan, including current belief, confidence, and evidence/hypothesis/experiment/outcome/lesson counts. This is additive to the existing response and UI.

## Scientific Decision Platform

The foundation under `lib/decision/`, `/api/decisions/`, and migration `007` makes Decision Cases, graded evidence, beliefs, competing hypotheses, counter-evidence, experiments, interventions, outcomes, and lessons canonical platform objects. Beliefs are versioned, confidence changes are preserved, and case events are append-only. A full authoring workspace, production database verification, live interventions, outcome collection, and cross-case learning remain planned.

## Atlas

**Product name:** Atlas — Catalog Intelligence

Scope:

- catalog structure and item relationships;
- product content quality;
- search discoverability;
- variation integrity;
- listing completeness;
- conversion friction; and
- prioritized catalog recommendations.

Atlas Foundations is implemented under `lib/atlas/`, with an authenticated `/atlas` route and a read-only assessment API. Atlas evaluates only organization-scoped normalized catalog and compliance evidence, produces transparent component scores, findings, recommendations, opportunities, and approval-compatible improvement plans, and renders the same typed assessment inside Mercury catalog conversations. With no connected provider, Atlas reports unavailable evidence and does not infer health or recommendations. Live ingestion, filtering, field-level diffs, publication, and outcome measurement are not implemented.

## Vector

**Product name:** Vector — Advertising Intelligence

Scope:

- campaign and target performance;
- bids and budgets;
- search-term quality;
- advertising efficiency;
- incremental contribution;
- wasted spend and scaling opportunities; and
- governed optimization recommendations.

Current implementation is limited to navigation metadata, advertising capability types, planning rules, deterministic example output, and an Amazon Ads evidence reader/record interface with a normalization pipeline. There is no Vector route, Amazon Ads API client, authorization flow, or live integration.

## Oracle

**Product name:** Oracle — Demand Intelligence

Scope:

- demand forecasting;
- inventory coverage;
- stockout and excess risk;
- lead-time and replenishment decisions;
- seasonal demand;
- availability impact; and
- demand-aware commercial planning.

The Demand & Availability foundation is implemented under `lib/oracle/`, migration `010`, `/api/oracle/*`, and the authenticated `/oracle` route. It compares a versioned MichaelModel with an independent OracleModel, preserves inventory buckets, detects censored demand, ranks governed replenishment options, records attributed overrides, and scores immutable outcomes. Mercury attaches the same evidence-derived assessment for inventory plans. No live demand/inventory provider or Outlook connector is connected, so the route reports unavailable evidence rather than generating sample decisions.

## Sentinel

**Product name:** Sentinel — Compliance Intelligence

Scope:

- policy and documentation requirements;
- product suppression risk;
- case and deadline tracking;
- account-health exposure;
- evidence readiness;
- remediation recommendations; and
- approval-gated submissions or escalations.

Current implementation is limited to navigation metadata, compliance capability types, planning rules, and deterministic example output. There is no Sentinel product route or live compliance feed.

## Forge

**Product name:** Forge — Creative Intelligence

Scope:

- creative performance insight;
- asset gaps;
- messaging hierarchy;
- image, video, and enhanced-content briefs;
- channel requirements;
- production priorities; and
- learning from measured creative outcomes.

Current implementation is limited to navigation metadata, a creative-brief capability, a planning rule, and deterministic example output. There is no Forge product route or asset workflow.

## Pulse

**Product name:** Pulse — Executive Intelligence

Scope:

- cross-module synthesis;
- executive summaries;
- performance drivers;
- risks and opportunities;
- business priorities;
- accountability and owners; and
- measured outcome reporting.

Current implementation is limited to navigation metadata, a reporting capability, a generated reporting task in Mercury plans, and deterministic example output. There is no Pulse product route.

## Operational surfaces

These are platform surfaces, not intelligence modules:

- **Execution:** approved and running actions, status, retries, and results
- **Approvals:** governed review and decisions for material actions
- **History:** conversations, plans, decisions, executions, and outcomes
- **Knowledge:** business context, definitions, evidence, policies, and sources
- **Integrations:** connected commerce and business systems
- **Billing:** subscription, usage, invoices, and entitlements
- **Settings:** organization, users, policies, preferences, and security

Navigation entries exist for these surfaces, but their page routes are not currently implemented.

Platform Core now supplies durable organization/team settings, immutable audit, notification, feature-flag, subscription, and entitlement contracts behind these surfaces. Organization, team, audit, notification, and billing read/update APIs exist. Cognito authentication code and infrastructure configuration exist but await real-pool verification; the corresponding settings experiences and external Stripe adapter do not exist.

## Internal terminology debt

Current source code includes `WorkerKey`, `WorkerDefinition`, `workerRegistry`, task `worker` fields, and a `/workers` page. These names reflect an earlier product model.

Until a dedicated migration is approved:

- keep compatibility where required by persisted data and existing APIs;
- do not expose the legacy terminology in new UI or documentation;
- use “module” in new domain concepts; and
- document schema or API migrations before renaming persisted fields.
