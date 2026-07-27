# MerchantFlare Project Status

Last verified against the repository: 2026-07-27

This file is the current implementation record for MerchantFlare. Product direction lives in `docs/`; this tracker records what the code actually supports today. Navigation entries, domain types, static data, and planned infrastructure are not treated as completed features.

## Current project summary

MerchantFlare is an early-stage Commerce Intelligence Platform built with the Next.js App Router and TypeScript. Mercury is the Commerce Intelligence Engine and primary conversational workspace.

Sprint 1, the application shell, is implemented. Sprint 2 now has an organization-scoped conversation and governance foundation: authenticated APIs, durable conversations and messages when PostgreSQL is configured, deterministic versioned plans linked to their originating messages, truthful evidence-coverage records, idempotent plan-level approval decisions, and a responsive Mercury workspace on `/dashboard`. It does not yet provide model-backed reasoning, ingested commerce evidence, production intelligence modules, live commerce data, governed execution controls, or the planned AWS deployment architecture.

## Completed work

### Application shell

- Responsive application frame with a persistent desktop sidebar, collapsible tablet sidebar, and mobile drawer.
- Config-driven navigation with nested intelligence modules and active-route highlighting.
- Sticky topbar with navigation search, notification menu, and user menu.
- Sidebar footer presentation for platform connection statuses. These values are currently static UI data, not live health checks.
- Shell integration on `/dashboard` and `/workers`.
- MerchantFlare black, white, and orange visual treatment, shared CSS tokens, and reusable UI primitives.
- A production brand system with reusable dark- and light-surface wordmarks and monograms, a shared typed `Logo` component, favicon assets, an app icon, and canonical product metadata.

### Application and service foundations

- Root marketing page, administrator login page, dashboard page, and legacy `/workers` prototype.
- HMAC-signed administrator session cookie with login, logout, and a server-side guard for `/dashboard`.
- Organization context in the interim administrator session and server-side authentication checks on Mercury application APIs.
- Mercury objective validation, deterministic keyword-based planning, capability routing, approval-policy evaluation, event generation, and plan responses through `POST /api/mercury/plan`.
- PostgreSQL persistence for organization-scoped Mercury conversations, messages, plans, tasks, events, approvals, execution state, and integration metadata when `DATABASE_URL` is configured and migrations are applied.
- Authenticated, organization-scoped conversation APIs to create, list, open, rename, archive, restore, and extend conversations.
- Atomic persistence of each submitted user message, its deterministic plan, tasks, approval requirements, events, and the linked Mercury response.
- Versioned plan revision in the Mercury workspace and conversation API. Revisions preserve and supersede the prior plan instead of overwriting it.
- Typed evidence and provenance contracts plus PostgreSQL source, item, and plan-link tables. With no ingestion source configured, Mercury truthfully reports evidence as unavailable.
- Authenticated, organization-scoped, idempotent plan approval and rejection from the Mercury workspace. Decisions bind the plan version, policy version, proposal snapshot, actor, note, and timestamp without claiming execution occurred.
- A checksum-enforced PostgreSQL migration runner and a dry-run command for validating ordered migration files.
- Automated domain tests for deterministic routing, approval gating and policy versioning, idempotency-key validation, and evidence coverage.
- A real `/dashboard` Mercury conversation workspace with thread history, plan review, responsive navigation, and explicit database-unavailable and evidence-unavailable states.
- Authenticated, organization-scoped Mercury plan history through `GET /api/mercury/history`.
- Repository functions for plan detail, approval decisions, execution updates, and event appends.
- Deterministic module-output and generic mock-execution foundations for routed Mercury tasks.
- Amazon Selling Partner API helper code for Login with Amazon token exchange and marketplace participation requests.
- Permanent product, architecture, roadmap, design-system, and module documentation in `docs/`.
- A specification library in `specs/` covering shared platform contracts, every roadmap stage, each intelligence module, and every canonical operational and platform surface. Specifications define target behavior and do not change feature implementation status.

## Current architecture

### Implemented runtime

| Layer | Current implementation |
| --- | --- |
| Web application | Next.js App Router application with React and TypeScript |
| Styling | Global CSS in `app/globals.css` and shell CSS in `app/components/app-shell.css`; a second `styles/design-system.css` token set exists but is not imported |
| Pages | `/`, `/login`, `/dashboard`, and legacy `/workers` |
| API | Next.js route handlers for login, logout, Mercury conversations/messages and revisions, plan approval decisions, deterministic planning, and plan history |
| Authentication | Environment-configured administrator credentials and an HMAC-signed, HTTP-only cookie carrying organization context; `/dashboard` and Mercury APIs are guarded |
| Domain services | Local TypeScript modules under `lib/mercury/` for planning, routing, approvals, timelines, persistence, and execution foundations |
| Data | Optional PostgreSQL connection via `DATABASE_URL`; four ordered SQL migrations and a checksum-enforced migration runner |
| Integrations | An incomplete Amazon SP-API helper; no live integration is connected to application UI or Mercury |

The implemented application is currently a single Next.js codebase. Conversation and governance operations require `DATABASE_URL` and migrations through `004_mercury_evidence_and_governance.sql`; the workspace presents a truthful unavailable state when persistence is absent. The compatibility planning endpoint can still return a deterministic, unpersisted plan without a database. Mercury has an evidence storage contract but no live evidence ingestion, so it explicitly reports that evidence is unavailable.

### Planned production architecture

The documented target uses AWS Amplify Hosting, API Gateway, Lambda, Aurora PostgreSQL, S3, Stripe, Amazon SP-API, Amazon Ads API, and later Cognito. The repository does not currently contain infrastructure-as-code, deployment configuration, provisioned resource definitions, or production authentication for that architecture.

## Implemented components

| Area | Code | Verified behavior |
| --- | --- | --- |
| Shell | `AppShell`, `Sidebar`, `SidebarSection`, `SidebarItem`, `Topbar`, `Workspace` | Responsive shell state, drawer behavior, sidebar collapse, and application content framing |
| Navigation | `navigation.ts` | Central navigation configuration and route matching; most configured destination routes do not exist yet |
| Topbar tools | `SearchBar`, `UserMenu`, `NotificationBell` | Navigation filtering and routing, logout form, and static empty notification state |
| Brand | `components/brand/Logo.tsx`, `public/brand/` | Shared wordmark, monogram, and horizontal lockup variants for dark and light surfaces, plus favicon and app-icon assets |
| Shared UI | `Button`, `Card`, `Badge`, `StatusDot`, `MetricTile` | Reusable styled presentation components |
| Marketing | Root page plus components under `components/marketing/` | Public presentation only; the active page uses the shared brand component but does not use all newer marketing components |
| Login | `/login`, login/logout route handlers, `lib/auth.ts` | Single administrator credential check and cookie lifecycle |
| Mercury workspace | `/dashboard`, `MercuryWorkspace`, `ConversationSidebar`, `MercuryPlanCard` | Creates and resumes durable conversations, submits messages, renders deterministic linked plans and evidence status, supports versioned revision and plan-level approval decisions, and supports rename/archive/restore |
| Legacy prototype | `/workers` | Static AI-worker-oriented prototype retained as migration debt; it is not a completed intelligence-module experience |
| Mercury API | `/api/mercury/conversations`, conversation detail/message routes, `/api/mercury/plans/[planId]/approval`, `POST /api/mercury/plan`, `GET /api/mercury/history` | Enforces the administrator session, scopes reads/writes by organization, persists idempotent conversation turns and revisions, records approval decisions, and supports compatibility planning/history |
| Mercury services | `lib/mercury/` | Keyword planning, capability mapping, approval rules, dependency routing, events, repository operations, and two execution foundations |
| Database | `db/migrations/001_mercury_core.sql` through `004_mercury_evidence_and_governance.sql`, `scripts/migrate.ts` | PostgreSQL schemas for conversations, messages, versioned plans, evidence, approvals, execution, and integration metadata; migrations are applied explicitly with `npm run migrate` |
| Amazon integration | `lib/amazon/sp-api.ts` | LWA token exchange and request helper only; it is not a complete production SP-API integration |

## Work in progress

- Sprint 2: Mercury Command Center.
- Replacing deterministic response construction with evidence-grounded conversational reasoning while retaining deterministic routing as an explicitly limited fallback.
- Connecting the persisted evidence contract to an authorized commerce source, and connecting approved plans to a canonical execution path, unified history, and measured outcomes.
- Replacing legacy “AI workforce,” “AI workers,” and worker-oriented product language with the approved Commerce Intelligence vocabulary.
- Consolidating the duplicated styling/token foundations and deciding which unused marketing components belong in the active page.
- Turning module navigation entries and platform statuses into real routes and data-backed experiences.

## Known gaps and blockers

- Mercury conversations require PostgreSQL plus migrations `001` through `004`. The migration files and runner were dry-run validated, but no database was available in this workspace to apply or integration-test them.
- Mercury responses are deterministic planning summaries. No model/provider, evidence ingestion or retrieval adapter, attachments, or streaming is implemented. Evidence records and citation rendering exist but have no live source.
- Atlas, Vector, Oracle, Sentinel, Forge, and Pulse have navigation, types, routing metadata, and deterministic output scaffolding only. They do not have production module pages, data pipelines, or live analysis.
- Navigation links for Execution, Approvals, History, Knowledge, Integrations, Billing, Settings, and all six module pages currently lead to unimplemented routes.
- Notifications and account details are static. Sidebar provider entries truthfully display “Not configured” but are not live health checks.
- `/workers` uses the application shell but is not protected by the `/dashboard` layout guard.
- Authentication contains development fallback credentials and a fallback signing secret. It is not suitable for production, and Cognito is not implemented.
- The Amazon SP-API helper is not wired to UI or persistence and does not implement the complete production authentication/signing and ingestion lifecycle. Amazon Ads is not implemented.
- Stripe billing, S3 artifact storage, API Gateway, Lambda, Aurora provisioning, Amplify configuration, and Cognito are not implemented in this repository.
- Mercury has separate `executor.ts` and `runtime.ts` execution paths. Neither is exposed as a complete authenticated application workflow, and the boundary between them is not finalized.
- Plan-level approval decisions have an application API and inline Mercury UI, but there is no `/approvals` queue, multi-user reviewer authorization, separation of duties, expiry, delegation, or task-level policy.
- A unit-test script exists for selected Mercury domain contracts. There is no lint script, database integration suite, API test suite, or browser automation suite.
- The legacy `/workers` surface and internal compatibility identifiers still use worker terminology. The canonical shell navigation and Mercury workspace no longer do.

## Next sprint

Sprint 2 is the Mercury Command Center.

The next implementation should connect the governed planning foundation to real, authorized evidence:

- Choose and integrate the conversational model/provider behind a typed server boundary.
- Choose the first authorized commerce evidence source and implement ingestion/retrieval into the existing provenance contract.
- Ground Mercury responses and confidence explanations in retrieved evidence with citations, freshness, and limitations.
- Consolidate the two execution foundations before exposing execution controls.
- Add PostgreSQL integration and authenticated API tests for revision, supersession, idempotency, and approval concurrency.
- Remove or migrate `/workers` only after confirming its replacement route and any compatibility requirements.

## Roadmap

| Stage | Status | Repository evidence |
| --- | --- | --- |
| 1. Application Shell | Complete | Responsive shell components are wired into the application |
| 2. Mercury Command Center | In progress | Durable organization-scoped conversations, authenticated APIs, versioned message-linked deterministic plans, evidence/provenance contracts, plan-level approval decisions, and the responsive workspace exist; live evidence-grounded reasoning, execution, and outcomes remain |
| 3. Atlas | Not started | Navigation, types, routing, and output scaffolding only |
| 4. Vector | Not started | Navigation, types, routing, and output scaffolding only |
| 5. Oracle | Not started | Navigation, types, routing, and output scaffolding only |
| 6. Sentinel | Not started | Navigation, types, routing, and output scaffolding only |
| 7. Forge | Not started | Navigation, types, routing, and output scaffolding only |
| 8. Pulse | Not started | Navigation, types, routing, and output scaffolding only |
| 9. Live Amazon integrations | Foundation only | Partial SP-API helper and integration schema; no live application flow |
| 10. Mercury orchestration engine | Foundation only | Deterministic planner, versioned plans, routing, idempotent plan approval, persistence, and execution scaffolding |

## Validation status

Validation was run against this repository state on 2026-07-27.

| Check | Status |
| --- | --- |
| TypeScript typecheck (`npm run typecheck`) | Passed |
| Production build (`npm run build`) | Passed |
| Lint | Unavailable: no lint script is defined |
| Automated tests (`npm test`) | Passed: 8 tests |
| Migration validation (`npm run migrate:dry-run`) | Passed: migrations `001` through `004` and checksums validated; no database application was attempted |

## Changelog

| Date | Change |
| --- | --- |
| 2026-07-27 | Added versioned Mercury plan revision, evidence/provenance contracts, idempotent plan-level approval decisions, migration tooling, and initial domain tests. |
| 2026-07-27 | Added the authenticated, organization-scoped Mercury conversation foundation and replaced the static dashboard with the durable conversation workspace. |
| 2026-07-27 | Implemented the reusable MerchantFlare SVG brand system across marketing, login, the application shell, metadata, favicons, and the web app manifest. |
| 2026-07-27 | Added this code-verified project status baseline. |
| 2026-07-27 | Added MerchantFlare module and platform specifications. |
| 2026-07-27 | Added permanent MerchantFlare product and engineering documentation (`9886941`). |
| 2026-07-27 | Implemented the responsive application shell (`4761e93`). |

