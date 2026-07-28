# MerchantFlare Project Status

Last verified against the repository: 2026-07-28

This file is the current implementation record for MerchantFlare. Product direction lives in `docs/`; this tracker records what the code actually supports today. Navigation entries, domain types, static data, and planned infrastructure are not treated as completed features.

## Current project summary

MerchantFlare is an early-stage Commerce Intelligence Platform built with the Next.js App Router and TypeScript. Mercury is the Commerce Intelligence Engine and primary conversational workspace.

Sprint 1, the application shell, is implemented. Sprint 2 has an organization-scoped conversation, governance, and Commerce Evidence foundation. Sprint 4 adds the Platform Core foundation. Sprint 5 adds the Atlas foundation. Sprint 5B adds deployment-ready Cognito authentication code and infrastructure, but it is not operationally complete because no real user pool has been deployed or tested. Atlas can only assess normalized evidence already present in the Commerce Evidence Layer; no live catalog provider or publishing adapter is implemented.

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

- Root marketing page, Cognito sign-in entry page, dashboard page, and legacy `/workers` prototype.
- Cognito authorization-code/PKCE login and callback, verified JWT handling, encrypted refresh cookie, signed application session, logout, managed password-recovery entry, and protected page/API routing.
- Server-side active membership resolution for Cognito identities at callback, refresh, and Platform Core/Mercury authorization boundaries.
- Mercury objective validation, deterministic keyword-based planning, capability routing, approval-policy evaluation, event generation, and plan responses through `POST /api/mercury/plan`.
- PostgreSQL persistence for organization-scoped Mercury conversations, messages, plans, tasks, events, approvals, execution state, and integration metadata when `DATABASE_URL` is configured and migrations are applied.
- Authenticated, organization-scoped conversation APIs to create, list, open, rename, archive, restore, and extend conversations.
- Atomic persistence of each submitted user message, its deterministic plan, tasks, approval requirements, events, and the linked Mercury response.
- Versioned plan revision in the Mercury workspace and conversation API. Revisions preserve and supersede the prior plan instead of overwriting it.
- Typed evidence and provenance contracts plus PostgreSQL source, item, and plan-link tables. With no ingestion source configured, Mercury truthfully reports evidence as unavailable.
- A provider-agnostic Commerce Evidence Layer under `lib/evidence/` with typed provider readers, versioned normalization pipelines, deterministic evidence identity, source provenance, dataset freshness policies, memory and PostgreSQL cache adapters, normalized evidence queries, provider registration, and bounded idempotent synchronization orchestration.
- Typed Amazon SP-API and Amazon Ads evidence record/reader interfaces and normalization pipelines. No Amazon evidence reader is implemented or registered, and no live synchronization is enabled.
- Mercury plan creation queries only normalized evidence records by capability dataset, attaches matching records to the immutable plan, recalculates freshness at read time, and preserves the unavailable state when no normalized evidence exists.
- An Atlas Catalog Intelligence foundation under `lib/atlas/` with typed assessments, component health scores, findings, recommendations, opportunities, and governed improvement plans. Every output includes evidence, confidence, freshness, assumptions, or explicit unavailable-evidence reasons.
- Authenticated `/atlas` and `GET /api/atlas/assessment` surfaces evaluate organization-scoped normalized catalog and compliance evidence. Missing evidence produces an unavailable assessment rather than a fabricated score.
- Mercury routes catalog objectives through Atlas, embeds the resulting assessment in the immutable plan snapshot, renders the assessment in conversation continuity, and adds an approval-gated `catalog.optimize` review task only when evidence-backed recommendations exist.
- Authenticated, organization-scoped, idempotent plan approval and rejection from the Mercury workspace. Decisions bind the plan version, policy version, proposal snapshot, actor, note, and timestamp without claiming execution occurred.
- A checksum-enforced PostgreSQL migration runner and a dry-run command for validating ordered migration files.
- A multi-organization Platform Core under `lib/platform/` with Owner, Admin, Manager, Analyst, and Viewer permissions; organization-scoped services; durable memberships, invitations, settings, audit events, notifications, feature flags, subscription plans, subscriptions, and entitlements.
- Cognito CloudFormation for an email-sign-in user pool, public browser client without a secret, callback/logout allowlists, token lifetimes, and a managed-login domain.
- An explicit, idempotent first-Owner bootstrap command that refuses to silently grant access to unknown Cognito identities or replace a different existing Cognito Owner.
- Organization, member, invitation, audit, notification, and subscription read/update APIs under `/api/platform/`. Invitation tokens are generated once and stored only as SHA-256 hashes, but email delivery and invitation acceptance routing are not implemented.
- Database-enforced append-only platform audit events. Mercury plan creation, revision, conversation updates, approval decisions, organization settings, invitations, membership role changes, and removals record typed audit events.
- A central, durable notification framework with severity, category, recipient/broadcast scope, deduplication, expiry, read state, and organization authorization. The shell now renders actual stored notifications rather than a fabricated count.
- Server-side and UI permission enforcement for Mercury reads, writes, plan revision, and approval decisions. Navigation and Mercury controls are filtered by the active organization role.
- A provider-neutral feature flag evaluator with deterministic organization rollout and user/organization overrides.
- A Stripe-ready subscription and entitlement projection with versioned plans and trusted server-side entitlement evaluation. No Stripe SDK, customer synchronization, webhooks, checkout, portal, invoices, or payment UI is implemented.
- Migration checksums now normalize line endings so the same committed SQL has a stable checksum across Windows and Linux.
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
| Pages | `/`, `/login`, `/dashboard`, `/atlas`, and legacy `/workers` |
| API | Next.js route handlers for login, logout, Mercury conversations/messages and revisions, plan approval decisions, deterministic planning/history, Atlas assessment, and Platform Core |
| Authentication | Cognito managed-login/PKCE application flow, RS256 JWT verifier, encrypted refresh token, signed session, protected-route gateway, and active Platform Core membership resolution; real-pool verification is pending |
| Authorization | Central Owner, Admin, Manager, Analyst, and Viewer permission matrix enforced by platform and Mercury server boundaries |
| Domain services | `lib/platform/` for SaaS control-plane services, `lib/mercury/` for planning/governance, `lib/evidence/` for provider-neutral commerce evidence, and `lib/atlas/` for explainable catalog intelligence |
| Data | Optional PostgreSQL connection via `DATABASE_URL`; six ordered SQL migrations and a cross-platform checksum-enforced migration runner |
| Integrations | An incomplete legacy Amazon SP-API helper plus typed SP-API and Amazon Ads evidence interfaces; no provider reader or live integration is connected |

The implemented application is currently a single Next.js codebase. Platform Core, authentication membership resolution, conversation, governance, and normalized evidence operations require `DATABASE_URL` and migrations through `006_platform_core.sql`. Mercury queries normalized evidence and plan citations through the provider-neutral evidence boundary, but no live provider populates it.

### Planned production architecture

The documented target uses AWS Amplify Hosting, API Gateway, Lambda, Aurora PostgreSQL, S3, Stripe, Amazon SP-API, Amazon Ads API, and Cognito. Cognito is the first AWS resource set represented as infrastructure-as-code. No resource was deployed from this workspace, and the broader target infrastructure remains unprovisioned here.

## Implemented components

| Area | Code | Verified behavior |
| --- | --- | --- |
| Shell | `AppShell`, `Sidebar`, `SidebarSection`, `SidebarItem`, `Topbar`, `Workspace` | Responsive shell state, drawer behavior, sidebar collapse, and application content framing |
| Navigation | `navigation.ts` | Central navigation configuration and route matching; most configured destination routes do not exist yet |
| Topbar tools | `SearchBar`, `UserMenu`, `NotificationBell` | Role-filtered navigation search, active role/account display, logout form, and organization-scoped notification inbox |
| Brand | `components/brand/Logo.tsx`, `public/brand/` | Shared wordmark, monogram, and horizontal lockup variants for dark and light surfaces, plus favicon and app-icon assets |
| Shared UI | `Button`, `Card`, `Badge`, `StatusDot`, `MetricTile` | Reusable styled presentation components |
| Marketing | Root page plus components under `components/marketing/` | Public presentation only; the active page uses the shared brand component but does not use all newer marketing components |
| Login | `/login`, `/api/auth/*`, `lib/auth/`, `proxy.ts` | Cognito PKCE initiation/callback, password-recovery entry, JWT validation, refresh, logout, safe redirects, protected routes, and organization membership enforcement; not real-pool verified |
| Mercury workspace | `/dashboard`, `MercuryWorkspace`, `ConversationSidebar`, `MercuryPlanCard` | Creates and resumes durable conversations, submits messages, renders deterministic linked plans and evidence status, supports versioned revision and plan-level approval decisions, and supports rename/archive/restore |
| Legacy prototype | `/workers` | Static AI-worker-oriented prototype retained as migration debt; it is not a completed intelligence-module experience |
| Mercury API | `/api/mercury/conversations`, conversation detail/message routes, `/api/mercury/plans/[planId]/approval`, `POST /api/mercury/plan`, `GET /api/mercury/history` | Enforces the Cognito-derived principal and active membership, scopes reads/writes by organization, persists idempotent conversation turns and revisions, records approval decisions, and supports compatibility planning/history |
| Mercury services | `lib/mercury/` | Keyword planning, capability mapping, approval rules, dependency routing, events, repository operations, and two execution foundations |
| Commerce Evidence | `lib/evidence/`, `lib/mercury/evidence.ts` | Provider contracts, normalized record schema, provenance, freshness, cache-aside queries, sync orchestration, PostgreSQL adapters, Mercury capability-to-dataset selection, and coverage summaries |
| Atlas | `/atlas`, `/api/atlas/assessment`, `lib/atlas/`, `app/components/atlas/` | Organization-scoped evidence assessment, transparent component scoring, findings, recommendations, opportunities, approval-compatible plans, and responsive presentation |
| Platform Core | `lib/platform/`, `/api/platform/*` | Organization and membership services, RBAC, identity abstraction, team invitations, settings, immutable audit, notifications, feature flags, and subscription entitlements |
| Database | `db/migrations/001_mercury_core.sql` through `006_platform_core.sql`, `scripts/migrate.ts` | PostgreSQL schemas for Platform Core, Mercury, evidence, sync, approvals, execution, and integration metadata; migrations are applied explicitly with `npm run migrate` |
| Amazon provider boundaries | `lib/evidence/providers/amazon-sp-api.ts`, `lib/evidence/providers/amazon-ads.ts` | Typed provider records, reader interfaces, and normalization pipelines only; no live reader, authorization flow, or synchronization is registered |
| Legacy Amazon helper | `lib/amazon/sp-api.ts` | LWA token exchange and request helper only; it is not a complete production SP-API integration and is not wired into the evidence engine |

## Work in progress

- Sprint 2: Mercury Command Center remains in progress.
- Sprint 5: Atlas Foundations is implemented; live catalog ingestion, filtering, field-level diffs, execution, and outcomes remain.
- Platform Core UI and external-service operations: organization switching, Settings/Team screens, Cognito deployment/verification, invitation delivery, and Stripe workflows.
- Replacing deterministic response construction with evidence-grounded conversational reasoning while retaining deterministic routing as an explicitly limited fallback.
- Implementing the first authorized provider reader and connection lifecycle against the Commerce Evidence contracts, then connecting approved plans to a canonical execution path, unified history, and measured outcomes.
- Replacing legacy “AI workforce,” “AI workers,” and worker-oriented product language with the approved Commerce Intelligence vocabulary.
- Consolidating the duplicated styling/token foundations and deciding which unused marketing components belong in the active page.
- Turning the remaining module navigation entries and platform statuses into real routes and data-backed experiences.

## Known gaps and blockers

- Platform and Mercury persistence require PostgreSQL plus migrations `001` through `006`. The migration files and runner were dry-run validated, but no database was available in this workspace to apply or integration-test them.
- Mercury responses are deterministic planning summaries. Normalized evidence retrieval and citation attachment are implemented, but no provider reader populates evidence, and there is no model-backed reasoning, attachments, or streaming.
- Atlas has a production-quality foundation and route, but it has no connected source, provider ingestion, field-level diffing, publication adapter, or outcome measurement. Vector, Oracle, Sentinel, Forge, and Pulse remain scaffolds only.
- Navigation links for Execution, Approvals, History, Knowledge, Integrations, Billing, Settings, and five intelligence module pages currently lead to unimplemented routes.
- Notifications are data-backed when PostgreSQL is configured. Sidebar provider entries remain static “Not configured” presentation rather than live health checks.
- `/workers` is protected by the route gateway and authenticated shell but remains a legacy prototype.
- Cognito code and CloudFormation exist, but no real user pool or Amplify environment was available for end-to-end login, logout, verification, reset, refresh, or first-user testing. Authentication must not be called operational until that verification is complete.
- Multi-organization selection, invitation-to-Cognito binding, and centralized early session revocation are not implemented.
- Team persistence and authorized APIs exist, but there is no Settings UI, ownership-transfer workflow, invitation email delivery, or invitation acceptance route.
- Subscription and entitlement persistence exists, but Stripe customer mapping is not synchronized and there are no signed webhooks, checkout/portal sessions, invoices, usage metering, plan catalog, or billing UI.
- Feature flag evaluation and persistence exist, but there is no flag administration API/UI or external configuration provider.
- Amazon SP-API and Amazon Ads have evidence contracts and normalizers only. No live reader, complete authentication/signing flow, connection management, scheduler, credential storage, or production synchronization is implemented.
- Stripe billing, S3 artifact storage, API Gateway, Lambda, Aurora provisioning, and Amplify configuration are not implemented in this repository. Cognito IaC is implemented but not deployed.
- Mercury has separate `executor.ts` and `runtime.ts` execution paths. Neither is exposed as a complete authenticated application workflow, and the boundary between them is not finalized.
- Plan-level approval decisions have an application API and inline Mercury UI, but there is no `/approvals` queue, multi-user reviewer authorization, separation of duties, expiry, delegation, or task-level policy.
- Unit tests cover selected Mercury and Commerce Evidence domain contracts. There is no lint script, database integration suite, API test suite, or browser automation suite.
- The legacy `/workers` surface and internal compatibility identifiers still use worker terminology. The canonical shell navigation and Mercury workspace no longer do.

## Next sprint

The recommended next milestone is the first authorized catalog evidence provider and Atlas product-depth milestone:

- Apply migration `006` to a development PostgreSQL environment and add integration tests for tenant isolation, membership changes, invitation replay/expiry, audit immutability, notification deduplication, and entitlement projections.
- Deploy the Cognito stack, configure Amplify, bootstrap the first Owner, and execute the operational verification checklist before enabling production access.
- Add organization selection and invitation-to-Cognito binding after the single-membership flow is verified.
- Build the authenticated Settings/Team experience and invitation acceptance/delivery flow.
- Decide the first subscription plan catalog, grace behavior, and entitlement keys before implementing signed Stripe webhooks and hosted billing flows.
- Choose the first catalog account model and dataset, then implement authorization and a provider reader without bypassing RBAC, audit, notifications, feature flags, entitlements, or the Commerce Evidence boundary.
- Add Atlas account/marketplace/product filtering, persisted assessment history, and field-level recommendation diffs after real source semantics are known.
- Consolidate the two execution foundations before exposing execution controls.
- Add PostgreSQL integration and authenticated API tests for revision, supersession, idempotency, and approval concurrency.
- Remove or migrate `/workers` only after confirming its replacement route and any compatibility requirements.

## Roadmap

| Stage | Status | Repository evidence |
| --- | --- | --- |
| 1. Application Shell | Complete | Responsive shell components are wired into the application |
| 2. Mercury Command Center | In progress | Durable conversations, versioned deterministic plans, normalized evidence lookup and citations, plan-level approval decisions, and the responsive workspace exist; a connected provider, model-grounded reasoning, execution, and outcomes remain |
| Platform Core | Foundation implemented | Multi-organization persistence, RBAC, identity abstraction, team services, immutable audit, notifications, flags, and subscription entitlements exist; external identity/billing adapters and management UI remain |
| 3. Atlas | Foundation implemented | Explainable normalized-evidence assessment, health scoring, findings, recommendations, opportunities, governed plans, Mercury integration, and `/atlas` exist; live ingestion, diffs, execution, and outcomes remain |
| 4. Vector | Not started | Navigation, types, routing, and output scaffolding only |
| 5. Oracle | Not started | Navigation, types, routing, and output scaffolding only |
| 6. Sentinel | Not started | Navigation, types, routing, and output scaffolding only |
| 7. Forge | Not started | Navigation, types, routing, and output scaffolding only |
| 8. Pulse | Not started | Navigation, types, routing, and output scaffolding only |
| 9. Live Amazon integrations | Foundation only | Typed SP-API and Amazon Ads evidence interfaces/normalizers plus a partial legacy SP-API helper; no provider reader, authorization workflow, or live synchronization |
| 10. Mercury orchestration engine | Foundation only | Deterministic planner, versioned plans, routing, idempotent plan approval, persistence, and execution scaffolding |

## Validation status

Validation was run against this repository state on 2026-07-28.

| Check | Status |
| --- | --- |
| TypeScript typecheck (`npm run typecheck`) | Passed |
| Production build (`npm run build`) | Passed |
| Lint | Unavailable: no lint script is defined |
| Automated tests (`npm test`) | Passed: 36 tests, including Cognito JWT issuer/audience/expiry validation, membership denial, protected routes, safe redirects, permissions, Atlas, Mercury, and Evidence domains |
| Migration validation (`npm run migrate:dry-run`) | Passed: migrations `001` through `006` and checksums validated; no database application was attempted |
| Markdown relative links | Passed across `AGENTS.md`, `PROJECT_STATUS.md`, `docs/`, and `specs/` |
| Responsive browser QA | Passed: `/login` at 1440 × 900 and 390 × 844 with no horizontal overflow or console errors; missing Cognito configuration produced the explicit unavailable state |
| Real Cognito/Amplify verification | Not run: no Cognito User Pool or configured Amplify runtime was available; authentication remains scaffolded rather than operationally complete |

## Changelog

| Date | Change |
| --- | --- |
| 2026-07-28 | Added Sprint 5B Cognito authentication architecture: PKCE managed login, JWT verification, encrypted refresh and signed sessions, protected routes, membership enforcement, first-Owner bootstrap, Cognito CloudFormation, Amplify configuration, tests, and deployment operations. Real-pool verification remains required. |
| 2026-07-28 | Added Atlas Foundations with provider-neutral catalog assessment, explainable health scoring, evidence-backed recommendations and opportunities, governed improvement plans, Mercury routing/rendering, and an authenticated responsive route. |
| 2026-07-27 | Added the Sprint 4 Platform Core foundation with multi-organization persistence, RBAC, team services, Cognito-ready identity contracts, immutable audit, notifications, feature flags, subscription entitlements, and Mercury permission enforcement. |
| 2026-07-27 | Added the provider-agnostic Commerce Evidence Layer, normalized Amazon provider contracts, freshness/cache/provenance behavior, bounded sync orchestration, and Mercury normalized-evidence consumption. |
| 2026-07-27 | Added versioned Mercury plan revision, evidence/provenance contracts, idempotent plan-level approval decisions, migration tooling, and initial domain tests. |
| 2026-07-27 | Added the authenticated, organization-scoped Mercury conversation foundation and replaced the static dashboard with the durable conversation workspace. |
| 2026-07-27 | Implemented the reusable MerchantFlare SVG brand system across marketing, login, the application shell, metadata, favicons, and the web app manifest. |
| 2026-07-27 | Added this code-verified project status baseline. |
| 2026-07-27 | Added MerchantFlare module and platform specifications. |
| 2026-07-27 | Added permanent MerchantFlare product and engineering documentation (`9886941`). |
| 2026-07-27 | Implemented the responsive application shell (`4761e93`). |

