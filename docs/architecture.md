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
  -> current signed-cookie adapter
  -> Cognito-ready identity boundary
  -> Cognito verifier later
```

This diagram is the target architecture, not a statement that the AWS resources are already provisioned.

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
| `/login` | Administrator login form |
| `/dashboard` | Auth-gated Mercury conversation workspace with durable threads and deterministic message-linked plans when PostgreSQL is available |
| `/workers` | Legacy intelligence-module prototype using workforce terminology; not a canonical product destination |

Atlas, Vector, Oracle, Sentinel, Forge, Pulse, Execution, Approvals, History, Knowledge, Integrations, Billing, and Settings appear in shell configuration, but corresponding page routes are not implemented.

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

Current authentication uses a Cognito-ready principal boundary with a repository-local administrator adapter:

- `lib/platform/identity.ts` separates verified identity, organization membership resolution, and the resulting authenticated principal;
- `lib/platform/authorization.ts` centrally defines the Owner, Admin, Manager, Analyst, and Viewer permission matrix;
- credentials for the active legacy adapter come from `ADMIN_EMAIL` and `ADMIN_PASSWORD`, with development-only fallbacks;
- `lib/auth.ts` creates an HMAC-signed cookie containing an Owner principal and organization identifier;
- `lib/server-auth.ts` idempotently provisions that transitional identity, organization, and membership when PostgreSQL is configured;
- `/api/auth/login` creates the session;
- `/api/auth/logout` clears it; and
- the `/dashboard` layout validates the cookie; and
- Mercury and Platform Core route handlers validate the session, enforce permissions server-side, and scope persistence by its organization identifier.

No Cognito token verifier or multi-user sign-in flow is implemented. The `/workers` prototype is not protected by the dashboard layout.

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

This is a domain and API foundation. There is no `/settings` or `/billing` page, Cognito verifier, organization selector, invitation delivery/acceptance route, flag-management surface, or live Stripe workflow.

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

Platform Core, conversation, and normalized evidence operations require `DATABASE_URL` and the committed migrations through `006_platform_core.sql`. `npm run migrate` applies unapplied migrations under a PostgreSQL advisory lock and rejects changed, missing, misnamed, or duplicate-sequence migration files; checksums normalize line endings for cross-platform stability. `npm run migrate:dry-run` validates ordering and checksums without a database. A submitted turn queries normalized evidence by capability dataset, then persists its user message, versioned plan, evidence links, tasks, events, approval requirements, notification, and audit event transactionally. When persistence is unavailable, the workspace presents an explicit unavailable state rather than fabricated conversation data.

The evidence engine and schemas are implemented boundaries, not evidence that a source is connected. No live provider reader currently populates normalized evidence.

Aurora PostgreSQL is the target managed database, but the repository contains no AWS deployment configuration proving an Aurora cluster exists.

### Amazon integration foundation

`lib/amazon/sp-api.ts` contains:

- Login with Amazon refresh-token exchange;
- regional SP-API endpoints;
- configuration checks; and
- marketplace participation request types.

This helper is not wired into a route, UI, or the Commerce Evidence engine. The repository does not demonstrate a complete live SP-API request-signing and production credential flow. Amazon Ads has a typed evidence interface and normalizer, not an API client. Do not mark live Amazon integrations complete.

## Planned infrastructure

The following technologies are architectural commitments but are not implemented in this repository:

- AWS Amplify Hosting configuration;
- API Gateway resources;
- Lambda deployment packages or infrastructure-as-code;
- Aurora provisioning;
- S3 buckets and object workflows;
- live Stripe billing integration;
- Amazon Ads API integration; and
- Cognito token verification and hosted identity flows.

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
