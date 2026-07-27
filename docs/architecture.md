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
  -> current application session
  -> Cognito later
```

This diagram is the target architecture, not a statement that the AWS resources are already provisioned.

## Current repository implementation

### Application

- Next.js App Router with TypeScript.
- Root application code lives in `app/`.
- Shared presentational components live in `app/components/` and `components/`.
- Core domain and Mercury logic live in `lib/`.
- PostgreSQL migrations live in `db/migrations/`.
- Global brand and shell styling currently live in `app/globals.css`, `app/marketing-brand.css`, `app/components/app-shell.css`, and `styles/design-system.css`.

### Implemented page routes

| Route | Current state |
| --- | --- |
| `/` | Marketing page; contains some legacy workforce positioning |
| `/login` | Administrator login form |
| `/dashboard` | Auth-gated Mercury Command Center shell with static business panels and a working plan request form |
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
- notification and user-menu surfaces;
- platform-status presentation; and
- a workspace content boundary.

The shell is wired into `app/dashboard/layout.tsx`. The legacy `/workers` page renders the same shell directly. Platform connection states in the sidebar are static configuration and must not be treated as live integration health.

### Authentication

Current authentication is a repository-local administrator session:

- credentials come from `ADMIN_EMAIL` and `ADMIN_PASSWORD`, with development fallbacks;
- `lib/auth.ts` creates an HMAC-signed cookie;
- `/api/auth/login` creates the session;
- `/api/auth/logout` clears it; and
- the `/dashboard` layout validates the cookie.

This is not the target enterprise identity architecture. Cognito is planned later. The `/workers` prototype is not protected by the dashboard layout.
The Mercury API route handlers do not currently perform their own session validation.

### Mercury APIs

Implemented route handlers:

- `POST /api/mercury/plan` validates an objective, creates a plan, and attempts persistence;
- `GET /api/mercury/history` returns persisted plan summaries when a database is configured.

The dashboard calls the plan endpoint and reports the number of generated tasks. It does not yet render a full conversational thread, evidence, plan detail, approval flow, or execution lifecycle.

### Mercury domain layer

The repository contains an early Mercury foundation:

- keyword-based objective planning;
- capability-to-module routing;
- approval policies;
- dependency routing;
- timeline events;
- plan and task persistence;
- approval decision functions;
- execution result types;
- a generic executor with a mock fallback; and
- a database-backed runtime with deterministic module output builders.

These are foundations, not the completed Mercury orchestration engine. There are currently two execution paths (`executor.ts` and `runtime.ts`), and neither is exposed through a complete production API workflow.

Legacy internal types use `Worker`, `WorkerKey`, `workerRegistry`, and related names. New user-facing work must use intelligence-module language. Renaming internal contracts should be a deliberate compatibility migration rather than a casual search-and-replace.

### Data layer

`lib/db.ts` provides an optional PostgreSQL connection through `DATABASE_URL`.

Migrations currently define:

- Mercury plans;
- Mercury tasks;
- Mercury events;
- Mercury approvals; and
- commerce integration metadata.

When `DATABASE_URL` is absent, plan creation still returns a plan but reports that it was not persisted, and history returns an empty collection.

Aurora PostgreSQL is the target managed database, but the repository contains no AWS deployment configuration proving an Aurora cluster exists.

### Amazon integration foundation

`lib/amazon/sp-api.ts` contains:

- Login with Amazon refresh-token exchange;
- regional SP-API endpoints;
- configuration checks; and
- marketplace participation request types.

This helper is not wired into a route or UI. The repository does not demonstrate a complete live SP-API request-signing and production credential flow, and it has no Amazon Ads API implementation. Do not mark live Amazon integrations complete.

## Planned infrastructure

The following technologies are architectural commitments but are not implemented in this repository:

- AWS Amplify Hosting configuration;
- API Gateway resources;
- Lambda deployment packages or infrastructure-as-code;
- Aurora provisioning;
- S3 buckets and object workflows;
- Stripe billing integration;
- Amazon Ads API integration; and
- Cognito identity.

Add infrastructure declaratively and document environments, secrets, ownership, and failure behavior when those sprints begin.

## Boundary rules

- UI components must call route handlers or typed service boundaries rather than embedding provider credentials.
- External-provider credentials must remain server-side and outside Git.
- Mutating commerce actions must pass approval policy checks.
- Persistence models must distinguish plans, tasks, approvals, execution events, outputs, and measured outcomes.
- Static demonstrations must be labeled as sample or preview data; they must not impersonate live connected data.
- Route configuration and UI state must not be used as evidence that a backend integration is operational.
