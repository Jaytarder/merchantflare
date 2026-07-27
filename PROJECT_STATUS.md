# MerchantFlare Project Status

Last verified against the repository: 2026-07-27

This file is the current implementation record for MerchantFlare. Product direction lives in `docs/`; this tracker records what the code actually supports today. Navigation entries, domain types, static data, and planned infrastructure are not treated as completed features.

## Current project summary

MerchantFlare is an early-stage Commerce Intelligence Platform built with the Next.js App Router and TypeScript. Mercury is the Commerce Intelligence Engine and primary conversational workspace.

Sprint 1, the application shell, is implemented. Sprint 2 now has an organization-scoped conversation foundation: authenticated APIs, durable conversations and messages when PostgreSQL is configured, deterministic plans linked to their originating messages, and a responsive Mercury workspace on `/dashboard`. It does not yet provide model-backed reasoning, commerce evidence, production intelligence modules, live commerce data, governed execution controls, or the planned AWS deployment architecture.

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
| API | Next.js route handlers for login, logout, Mercury conversations/messages, deterministic planning, and plan history |
| Authentication | Environment-configured administrator credentials and an HMAC-signed, HTTP-only cookie carrying organization context; `/dashboard` and Mercury APIs are guarded |
| Domain services | Local TypeScript modules under `lib/mercury/` for planning, routing, approvals, timelines, persistence, and execution foundations |
| Data | Optional PostgreSQL connection via `DATABASE_URL`; SQL migrations are committed but no migration runner is included |
| Integrations | An incomplete Amazon SP-API helper; no live integration is connected to application UI or Mercury |

The implemented application is currently a single Next.js codebase. Conversation operations require `DATABASE_URL` and migration `003_mercury_conversations.sql`; the workspace presents a truthful unavailable state when persistence is absent. The compatibility planning endpoint can still return a deterministic, unpersisted plan without a database. Mercury explicitly reports that no live commerce evidence is available.

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
| Mercury workspace | `/dashboard`, `MercuryWorkspace`, `ConversationSidebar`, `MercuryPlanCard` | Creates and resumes durable conversations, submits messages, renders deterministic linked plans, and supports rename/archive/restore |
| Legacy prototype | `/workers` | Static AI-worker-oriented prototype retained as migration debt; it is not a completed intelligence-module experience |
| Mercury API | `/api/mercury/conversations`, conversation detail/message routes, `POST /api/mercury/plan`, `GET /api/mercury/history` | Enforces the administrator session, scopes reads/writes by organization, persists conversation turns, and supports compatibility planning/history |
| Mercury services | `lib/mercury/` | Keyword planning, capability mapping, approval rules, dependency routing, events, repository operations, and two execution foundations |
| Database | `db/migrations/001_mercury_core.sql` through `003_mercury_conversations.sql` | PostgreSQL schemas for conversations, messages, plans, execution, and integration metadata; migrations are not automatically applied |
| Amazon integration | `lib/amazon/sp-api.ts` | LWA token exchange and request helper only; it is not a complete production SP-API integration |

## Work in progress

- Sprint 2: Mercury Command Center.
- Replacing deterministic response construction with evidence-grounded conversational reasoning while retaining deterministic routing as an explicitly limited fallback.
- Connecting the conversation workspace to plan revision, approval decisions, canonical execution, unified history, and measured outcomes.
- Replacing legacy “AI workforce,” “AI workers,” and worker-oriented product language with the approved Commerce Intelligence vocabulary.
- Consolidating the duplicated styling/token foundations and deciding which unused marketing components belong in the active page.
- Turning module navigation entries and platform statuses into real routes and data-backed experiences.

## Known gaps and blockers

- Mercury conversations require PostgreSQL plus migrations `001` through `003`; no automated migration command is defined.
- Mercury responses are deterministic planning summaries. No model/provider, evidence retrieval, citations, attachments, streaming, or plan-revision workflow is implemented.
- Atlas, Vector, Oracle, Sentinel, Forge, and Pulse have navigation, types, routing metadata, and deterministic output scaffolding only. They do not have production module pages, data pipelines, or live analysis.
- Navigation links for Execution, Approvals, History, Knowledge, Integrations, Billing, Settings, and all six module pages currently lead to unimplemented routes.
- Notifications and account details are static. Sidebar provider entries truthfully display “Not configured” but are not live health checks.
- `/workers` uses the application shell but is not protected by the `/dashboard` layout guard.
- Authentication contains development fallback credentials and a fallback signing secret. It is not suitable for production, and Cognito is not implemented.
- The Amazon SP-API helper is not wired to UI or persistence and does not implement the complete production authentication/signing and ingestion lifecycle. Amazon Ads is not implemented.
- Stripe billing, S3 artifact storage, API Gateway, Lambda, Aurora provisioning, Amplify configuration, and Cognito are not implemented in this repository.
- Mercury has separate `executor.ts` and `runtime.ts` execution paths. Neither is exposed as a complete authenticated application workflow, and the boundary between them is not finalized.
- Approval-decision and execution repository functions exist without corresponding application routes or user interfaces.
- No lint or test scripts are defined, and no automated test files were found.
- The legacy `/workers` surface and internal compatibility identifiers still use worker terminology. The canonical shell navigation and Mercury workspace no longer do.

## Next sprint

Sprint 2 is the Mercury Command Center.

The next implementation should turn the durable conversation foundation into an evidence-grounded planning workflow:

- Choose and integrate the conversational model/provider behind a typed server boundary.
- Define and persist evidence/citation contracts with source, date range, freshness, and limitations.
- Add plan revision and approval-decision APIs and UI without implying execution occurred.
- Consolidate the two execution foundations before exposing execution controls.
- Add database migration tooling and automated API/domain tests.
- Remove or migrate `/workers` only after confirming its replacement route and any compatibility requirements.

## Roadmap

| Stage | Status | Repository evidence |
| --- | --- | --- |
| 1. Application Shell | Complete | Responsive shell components are wired into the application |
| 2. Mercury Command Center | In progress | Durable organization-scoped conversations, authenticated APIs, message-linked deterministic plans, and the responsive workspace exist; evidence-grounded reasoning, revision, approval, execution, and outcomes remain |
| 3. Atlas | Not started | Navigation, types, routing, and output scaffolding only |
| 4. Vector | Not started | Navigation, types, routing, and output scaffolding only |
| 5. Oracle | Not started | Navigation, types, routing, and output scaffolding only |
| 6. Sentinel | Not started | Navigation, types, routing, and output scaffolding only |
| 7. Forge | Not started | Navigation, types, routing, and output scaffolding only |
| 8. Pulse | Not started | Navigation, types, routing, and output scaffolding only |
| 9. Live Amazon integrations | Foundation only | Partial SP-API helper and integration schema; no live application flow |
| 10. Mercury orchestration engine | Foundation only | Deterministic planner, routing, approvals, persistence, and execution scaffolding |

## Validation status

Validation was run against this repository state on 2026-07-27.

| Check | Status |
| --- | --- |
| TypeScript typecheck (`npm run typecheck`) | Passed |
| Production build (`npm run build`) | Passed |
| Lint | Unavailable: no lint script is defined |
| Automated tests | Unavailable: no test script or test suite was found |

## Changelog

| Date | Change |
| --- | --- |
| 2026-07-27 | Added the authenticated, organization-scoped Mercury conversation foundation and replaced the static dashboard with the durable conversation workspace. |
| 2026-07-27 | Implemented the reusable MerchantFlare SVG brand system across marketing, login, the application shell, metadata, favicons, and the web app manifest. |
| 2026-07-27 | Added this code-verified project status baseline. |
| 2026-07-27 | Added MerchantFlare module and platform specifications. |
| 2026-07-27 | Added permanent MerchantFlare product and engineering documentation (`9886941`). |
| 2026-07-27 | Implemented the responsive application shell (`4761e93`). |

