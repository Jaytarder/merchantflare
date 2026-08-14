# Architecture

## Architectural direction

MerchantFlare uses a Next.js App Router frontend and is intended to run on AWS with managed service boundaries.

Target platform:

```text
Browser
  -> AWS Amplify Hosting (Next.js application)
  -> API Gateway
  -> Lambda services
  -> Aurora PostgreSQL
  -> S3

External systems:
  -> Amazon SP-API
  -> Amazon Ads API
  -> Stripe

Identity:
  -> Amazon Cognito managed login (authorization code + PKCE)
  -> MerchantFlare server session
  -> Platform Core organization membership and RBAC
```

This diagram remains the target architecture. The Amplify application, Cognito client, and PostgreSQL RDS database used by the authenticated application were inspected and exercised in production on 2026-08-02; the remaining managed services are not inferred from those verified resources.

## Current repository implementation

### Application

- Next.js App Router with TypeScript.
- Root application code lives in `app/`.
- Shared presentational components live in `app/components/` and `components/`.
- Core domain and Mercury logic live in `lib/`.
- Organization, authorization, identity, audit, notification, feature-flag, and subscription domains live in `lib/platform/`.
- Provider-neutral evidence contracts and orchestration live in `lib/evidence/`.
- PostgreSQL migrations live in `db/migrations/`.
- The checksum-enforced migration runner lives in `scripts/migrate.ts`.
- Global brand and shell styling currently live in `app/globals.css`, `app/marketing-brand.css`, `app/components/app-shell.css`, and `styles/design-system.css`.

### Implemented page routes

| Route | Current state |
| --- | --- |
| `/` | Marketing page; contains some legacy workforce positioning |
| `/login` | Cognito sign-in entry, recovery link, and user-safe authentication states |
| `/dashboard` | Auth-gated Mercury conversation workspace with durable threads and deterministic message-linked plans when PostgreSQL is available |
| `/workers` | Legacy intelligence-module prototype using workforce terminology; not a canonical product destination |

Atlas and Oracle have authenticated application routes. Vector, Sentinel, Forge, Pulse, Execution, Approvals, History, Knowledge, Integrations, Billing, and Settings appear in shell configuration, but corresponding page routes are not implemented.

### Application shell

Sprint 1 is implemented under `app/components/layout/`.

It includes:

- a persistent desktop sidebar;
- a collapsible tablet sidebar;
- a mobile drawer;
- config-driven navigation;
- route highlighting;
- a sticky topbar;
- navigation search;
- role-filtered navigation plus data-backed notification and user-menu surfaces;
- platform-status presentation; and
- a workspace content boundary.

The shell is wired into `app/dashboard/layout.tsx`. The legacy `/workers` page renders the same shell directly. Provider entries in the sidebar explicitly show “Not configured”; they are configuration presentation, not live integration health.

### Authentication

The repository now contains a Cognito authentication implementation:

- `infra/cognito.yaml` declares an email-sign-in user pool, public web client, callback/logout allowlists, token lifetimes, and managed-login domain;
- `/api/auth/login` starts authorization code with PKCE, state, and nonce;
- `/api/auth/callback` exchanges the code server-side and validates Cognito RS256 signatures, issuer, audience, token use, expiry, nonce, identity claims, and verified email;
- encrypted HttpOnly refresh cookies and signed HttpOnly application-session cookies keep tokens out of browser JavaScript;
- `/api/auth/refresh` renews the session and `/api/auth/logout` clears local state before Cognito logout;
- `proxy.ts` protects authenticated pages and APIs, including the legacy `/workers` route;
- `lib/server-auth.ts` re-resolves active organization membership for every server authorization boundary; and
- `scripts/bootstrap-cognito-owner.ts` provides an explicit, guarded first-Owner bootstrap without auto-provisioning unknown identities.

The legacy administrator credential and cookie adapter has been removed. The live login entry redirects to Cognito managed login using PKCE and the exact `https://app.merchantflare.com/api/auth/callback` URI. Owner callback completion, refresh persistence, logout, database-backed membership, organization resolution, and Mercury authorization were verified live on 2026-08-02. Recovery completion and non-Owner live role variants remain open. Deployment and first-user operations are defined in [`deployment-authentication.md`](deployment-authentication.md). Multi-organization selection and early centralized revocation remain open.

### Platform Core

Sprint 4 introduces the foundational SaaS control plane:

- durable organizations, users, memberships, invitations, and organization settings;
- organization-scoped services and route handlers under `/api/platform/`;
- role-based authorization for organization, member, audit, notification, billing, integration, and Mercury capabilities;
- single-use invitation tokens stored only as SHA-256 hashes;
- append-only audit events protected against update and delete by a database trigger;
- durable organization or recipient notifications with deduplication, expiry, and read state;
- typed feature flags with deterministic organization rollout and user/organization overrides; and
- versioned subscription plans, plan entitlements, subscription projections, organization overrides, and trusted server-side entitlement evaluation.

This is a domain and API foundation. There is no `/settings` or `/billing` page, organization selector, invitation delivery/acceptance route, flag-management surface, or live Stripe workflow. Cognito authentication code and a reachable authorization endpoint exist, but authenticated application and database-backed authorization still require verification.

### Mercury APIs

Implemented route handlers:

- `POST /api/mercury/plan` validates an objective, creates a plan, and attempts persistence;
- `GET /api/mercury/history` returns organization-scoped persisted plan summaries;
- `GET` and `POST /api/mercury/conversations` list conversations and create the first durable turn;
- `GET` and `PATCH /api/mercury/conversations/[conversationId]` load, rename, archive, or restore a conversation; and
- `POST /api/mercury/conversations/[conversationId]/messages` appends a durable conversation turn or creates a versioned revision of an existing plan; and
- `POST /api/mercury/plans/[planId]/approval` records an idempotent plan-level approval or rejection.

The dashboard renders the conversation thread and deterministic plan detail, including modules, dependencies, version history, normalized evidence coverage, and approval requirements. It supports revision and inline plan-level approval decisions and explicitly reports when evidence is unavailable. Mercury selects normalized evidence by the capabilities in a plan and never reads provider payloads. Model-backed reasoning, a connected evidence provider, and execution controls are not implemented.

### Mercury domain layer

The repository contains an early Mercury foundation:

- keyword-based objective planning;
- capability-to-module routing;
- approval policies;
- dependency routing;
- timeline events;
- plan and task persistence;
- versioned plan supersession;
- evidence-source, evidence-item, and plan-evidence contracts;
- idempotent plan-level approval decisions with immutable proposal and policy versions;
- execution result types;
- a generic executor with a mock fallback; and
- a database-backed runtime with deterministic module output builders.

These are foundations, not the completed Mercury orchestration engine. There are currently two execution paths (`executor.ts` and `runtime.ts`), and neither is exposed through a complete production API workflow.

### Scientific Decision Platform

Release 1.0 adds an explainable Scientific Reasoning Engine and a persistent Belief Graph through additive migration `009_scientific_reasoning_engine.sql`. Read-only reasoning computes evidence coverage, freshness, knowledge completeness, contradictions, confidence, uncertainty, and experiment priority from an organization-scoped Decision Case. An explicit recalculation appends a reasoning snapshot, materializes only explicit graph relationships, and records Decision History. See [Reasoning Engine](reasoning-engine.md), [Belief Graph](belief-graph.md), [Knowledge Engine](knowledge-engine.md), and [Decision Lab](decision-lab.md).

Migration `007_scientific_decision_platform.sql` adds organization-scoped Decision Cases, graded evidence, versioned beliefs, competing hypotheses, evidence relationships, experiments, interventions, outcomes, lessons, confidence history, and immutable decision history. It is additive: existing Mercury, Platform Core, evidence, authentication, and approval tables remain unchanged.

Migration `008_decision_learning_engine.sql` adds immutable prediction cohorts, organization-scoped idempotent execution records, and explicit lesson reuse. Experiment creation freezes the current belief confidence and success criteria. Outcome recording resolves that prediction, versions the belief, creates a bounded lesson, completes the experiment, and appends history in a single transaction. Lifecycle transitions use an optimistic status predicate so concurrent state changes fail closed.

Authenticated handlers under `/api/decisions/` expose the lifecycle without removing current endpoints. Central permissions distinguish read, investigation, measurement, and experiment approval. High-risk experiments require approval, and approval does not execute an intervention.

Mercury conversation reads optionally attach linked Decision Case context to a plan. The existing dashboard also hosts a compact authoring workbench and an audit-permission-gated engineering metrics overlay; navigation and conversation APIs are unchanged. Older clients and plans without a Decision Case retain existing behavior. See [Scientific Decision Platform](decision-platform.md), [Decision Lifecycle](decision-lifecycle.md), and [Confidence Calibration](calibration.md).

Legacy internal types use `Worker`, `WorkerKey`, `workerRegistry`, and related names. New user-facing work must use intelligence-module language. Renaming internal contracts should be a deliberate compatibility migration rather than a casual search-and-replace.

### Commerce Evidence layer

`lib/evidence/` is the provider-neutral boundary between external commerce systems and Mercury:

- generic provider reader and adapter contracts keep provider records inside an adapter;
- versioned normalization pipelines produce a canonical `NormalizedEvidenceRecord`;
- normalized values use attribute, metric, or status contracts rather than provider payload JSON;
- provenance records provider, source record, observation/ingestion time, pipeline version, transformations, and content hash;
- dataset policies classify current, delayed, and stale evidence and set cache windows;
- memory and PostgreSQL cache adapters implement explicit fresh, stale, and miss semantics;
- cache-aside query services recalculate freshness at the read boundary;
- a registry and bounded synchronization coordinator provide idempotency, pagination, cursors, run state, page safety limits, and cache invalidation; and
- PostgreSQL adapters persist normalized evidence, sync runs, cursors, and normalized cache entries.

The sync coordinator is an invocation boundary, not a scheduler or live job. No production provider reader is registered. `lib/evidence/providers/amazon-sp-api.ts` and `amazon-ads.ts` define the first typed provider record/reader contracts and normalization pipelines only.

### Data layer

`lib/db.ts` provides an optional PostgreSQL connection through `DATABASE_URL`.

Migrations currently define:

- Platform Core organizations, identities, memberships, invitations, and settings;
- immutable audit events, notifications, and feature flags;
- subscription plans, subscriptions, and entitlements;
- Mercury conversations;
- Mercury messages;
- Mercury plans;
- Mercury tasks;
- Mercury events;
- Mercury approvals; and
- Mercury evidence sources, evidence items, and plan-evidence links;
- normalized evidence values and provenance;
- evidence synchronization runs and cursors;
- normalized evidence cache entries;
- mutation idempotency records;
- commerce integration metadata.
- Decision Cases, graded evidence, versioned beliefs, competing hypotheses, experiments, interventions, outcomes, lessons, confidence history, and immutable Decision History.

Platform Core, conversation, normalized evidence, and Decision Platform operations require `DATABASE_URL` and the committed migrations through `007_scientific_decision_platform.sql`. `npm run migrate` applies unapplied migrations under a PostgreSQL advisory lock and rejects changed, missing, misnamed, or duplicate-sequence migration files; checksums normalize line endings for cross-platform stability. `npm run migrate:dry-run` validates ordering and checksums without a database. A submitted turn queries normalized evidence by capability dataset, then persists its user message, versioned plan, evidence links, tasks, events, approval requirements, notification, and audit event transactionally. When persistence is unavailable, the workspace presents an explicit unavailable state rather than fabricated conversation data.

The evidence engine and schemas are implemented boundaries, not evidence that a source is connected. No live provider reader currently populates normalized evidence.

### Atlas domain layer

`lib/atlas/` is the provider-neutral Catalog Intelligence domain. It accepts only organization-scoped `NormalizedEvidenceRecord` values from the Commerce Evidence Layer. It contains separate assessment, health, finding, recommendation, opportunity, planning, and routing modules.

Health dimensions are scored only when the required normalized fact exists. Each component exposes its score or unavailable state, explanation, evidence references, confidence, assumptions, and unavailable evidence. The overall score renormalizes weights across scored dimensions so missing data is never treated as poor performance. Recommendations are generated only for evidence-backed quality gaps; evidence gaps remain informational findings.

Mercury enriches catalog plans after normalized evidence retrieval and embeds the typed Atlas assessment in the persisted plan payload. When recommendations exist, Mercury adds an approval-gated catalog improvement review task using the existing catalog approval policy. Approval does not publish content. `/atlas` and its read-only assessment API use the same domain and organization authorization. There is no provider client, publication path, or outcome measurement in this layer.

Aurora PostgreSQL is the target managed database, but the repository contains no AWS deployment configuration proving an Aurora cluster exists.

### Media and supply coordination layer

`lib/vector/` consumes normalized advertising evidence and joins it to the same SKU/ASIN identity and Oracle assessment used by Demand & Availability. Vector computes observed efficiency separately from causal incrementality, the Christian Advertising Model retains only attributed report evidence, and the Joint Engine ranks possible futures inside a Safe Demand Envelope. Cross-domain dependency events invalidate stale forecasts or recommendations explicitly.

Migration `011_vector_joint_decision_engine.sql` is additive and organization-scoped. The `/vector` compatibility route, `/api/vector/*`, centralized permissions, and Mercury plan payload extension preserve existing APIs and Oracle behavior. No Amazon Ads or Outlook client is implied by this architecture.

### Demand & Availability domain layer

`lib/oracle/` extends the Scientific Decision Platform without replacing Mercury or the Commerce Evidence boundary. It defines explicit human and independent forecast models, inventory-position semantics, model disagreement and value-of-information calculations, governed replenishment options, newness and stockout-censoring analysis, and outcome scoring. `/oracle` and `/api/oracle/*` enforce the active organization and centralized Oracle permissions. Mercury inventory plans attach the same evidence-derived assessment to their immutable plan payload.

Migration `010_oracle_planning_engine.sql` is additive and links Oracle planning cases, email evidence, demand signals, inventory positions, models, rules, forecasts, comparisons, options, decisions, overrides, and outcomes to canonical Decision Cases and organization scope. Planning evidence, comparisons, overrides, and outcomes are append-only. The schema is deployed through migration `010`; snapshot-backed production verification confirmed all 12 Oracle tables, 6 required indexes, and 4 append-only triggers. This is not evidence that a provider or Outlook source is connected.

### Amazon integration foundation

`lib/amazon/sp-api.ts` contains:

- Login with Amazon refresh-token exchange;
- regional SP-API endpoints;
- configuration checks; and
- marketplace participation request types.

This helper is not wired into a route, UI, or the Commerce Evidence engine. The repository does not demonstrate a complete live SP-API request-signing and production credential flow. Amazon Ads has a typed evidence interface and normalizer, not an API client. Do not mark live Amazon integrations complete.

## Infrastructure state

AWS Amplify Hosting, Cognito, and the application PostgreSQL RDS instance were verified through the AWS control plane and live Owner flow on 2026-08-02. The following technologies remain architectural commitments not provisioned by this repository:

- API Gateway resources;
- Lambda deployment packages or general application infrastructure-as-code (Cognito is the first declared AWS resource set);
- Aurora provisioning;
- S3 buckets and object workflows;
- live Stripe billing integration;
- Amazon Ads API integration; and
- operationally verified Cognito, database, and Amplify authentication.

Add infrastructure declaratively and document environments, secrets, ownership, and failure behavior when those sprints begin.

## Boundary rules

- UI components must call route handlers or typed service boundaries rather than embedding provider credentials.
- External-provider credentials must remain server-side and outside Git.
- Mutating commerce actions must pass approval policy checks.
- Persistence models must distinguish plans, tasks, approvals, execution events, outputs, and measured outcomes.
- Every protected service must enforce both an organization boundary and the applicable centralized permission.
- Entitlements must derive from trusted subscription state and never from client-provided claims.
- Security-sensitive mutations must append an organization-scoped audit event.
- Static demonstrations must be labeled as sample or preview data; they must not impersonate live connected data.
- Route configuration and UI state must not be used as evidence that a backend integration is operational.
