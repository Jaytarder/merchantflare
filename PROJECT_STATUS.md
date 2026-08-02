# MerchantFlare Project Status

Last verified against the repository, AWS control plane, production database, and live application: 2026-08-02

This file is the current implementation record for MerchantFlare. Product direction lives in `docs/`; this tracker records what the code actually supports today. Navigation entries, domain types, static data, and planned infrastructure are not treated as completed features.

## Current project summary

MerchantFlare is an early-stage Scientific Decision Platform built with the Next.js App Router and TypeScript. Mercury remains the primary conversational interface into commerce evidence, governed plans, and the new decision-learning foundation.

Sprint 1, the application shell, is implemented. Sprint 2 has an organization-scoped conversation, governance, and Commerce Evidence foundation. Sprint 4 adds the Platform Core foundation. Sprint 5 adds the Atlas foundation. Sprint 5B adds Cognito authentication code and infrastructure. The Decision Learning sprint now adds guarded lifecycle transitions, immutable calibrated predictions, atomic outcome-to-belief learning, reusable lessons, deterministic self-challenge, a minimal Mercury authoring workbench, and internal engineering metrics. The Scientific Decision Platform is deployed from `main`; migrations `007` and `008` were applied to `merchantflare-dev` after the new recovery snapshot.

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

### Scientific Decision Platform foundation

- Additive canonical Decision Case, Evidence, Belief, Hypothesis, Counter-Evidence, Experiment, Intervention, Outcome, and Lesson contracts under `lib/decision/`.
- Migration `007_scientific_decision_platform.sql` adds organization-scoped storage, composite tenant constraints, belief versions, confidence history, and append-only Decision History without changing existing production tables.
- Authenticated `/api/decisions/` routes create and retrieve the lifecycle, revise beliefs, attach supporting/counter evidence, record experiment approvals without execution, and preserve outcomes and lessons.
- Recommendations and experiments require competing hypotheses. Observed and Correlated outcomes cannot use causal language.
- Decision read, write, measure, and approve permissions extend the existing role matrix.
- Mercury plan payloads optionally include linked Decision Case context. Existing behavior remains compatible when no case is linked.
- The foundation code is deployed. Migrations `007` and `008` are applied with verified checksums and required indexes. Public live QA was independently verified; the Owner-authenticated workspace and refresh were operator-confirmed in mobile Safari.

## Current architecture

### Implemented runtime

| Layer | Current implementation |
| --- | --- |
| Web application | Next.js App Router application with React and TypeScript |
| Styling | Global CSS in `app/globals.css` and shell CSS in `app/components/app-shell.css`; a second `styles/design-system.css` token set exists but is not imported |
| Pages | `/`, `/login`, `/dashboard`, `/atlas`, and legacy `/workers` |
| API | Next.js route handlers for login/logout, Mercury, Atlas, Platform Core, and the additive Decision Platform lifecycle |
| Authentication | Cognito managed-login/PKCE application flow, RS256 JWT verifier, encrypted refresh token, signed session, protected-route gateway, and active Platform Core membership resolution; the production Owner flow and database-backed membership were verified live on 2026-08-02 |
| Authorization | Central Owner, Admin, Manager, Analyst, and Viewer permission matrix enforced by platform and Mercury server boundaries |
| Domain services | `lib/platform/` for SaaS control-plane services, `lib/mercury/` for planning/governance, `lib/evidence/` for provider-neutral commerce evidence, `lib/decision/` for decision learning, and `lib/atlas/` for explainable catalog intelligence |
| Data | PostgreSQL connection via `DATABASE_URL`; eight ordered SQL migrations and a cross-platform checksum-enforced migration runner |
| Integrations | An incomplete legacy Amazon SP-API helper plus typed SP-API and Amazon Ads evidence interfaces; no provider reader or live integration is connected |

The implemented application is a single Next.js codebase. The production database uses migrations through `008_decision_learning_engine.sql`; the Scientific Decision Platform application code remains pending deployment. Mercury queries normalized evidence through the provider-neutral boundary, but no live provider populates it.

### Production deployment state

Production is deployed from merge commit `71da433c863393fa3b9564e9a8d64c613f0efaf1`; previous application revision `9ffe4061ff2ac14db542fe42d4617cc75186b11d` remains the rollback point. Both `https://main.d2wkvdawpeotl8.amplifyapp.com` and `https://app.merchantflare.com` serve the protected Decision API over HTTPS. The eight required Amplify variables are configured without exposing values. Cognito uses a public PKCE client with the exact app callback/logout allowlists and preserved localhost entries. PostgreSQL migrations `001` through `008` were applied through the snapshot-gated CloudShell runner, which verified migration checksums and required Decision Platform indexes. Encrypted RDS snapshot `merchantflare-pre-decision-platform-20260802` is the immediate pre-migration recovery point. The verified Cognito identity for `jmartin@merchantflare.com` resolves to one active Owner membership in organization `fa1a7c7e-7894-4af7-a136-9fc8a239bba0`.

## Implemented components

| Area | Code | Verified behavior |
| --- | --- | --- |
| Shell | `AppShell`, `Sidebar`, `SidebarSection`, `SidebarItem`, `Topbar`, `Workspace` | Responsive shell state, drawer behavior, sidebar collapse, and application content framing |
| Navigation | `navigation.ts` | Central navigation configuration and route matching; most configured destination routes do not exist yet |
| Topbar tools | `SearchBar`, `UserMenu`, `NotificationBell` | Role-filtered navigation search, active role/account display, logout form, and organization-scoped notification inbox |
| Brand | `components/brand/Logo.tsx`, `public/brand/` | Shared wordmark, monogram, and horizontal lockup variants for dark and light surfaces, plus favicon and app-icon assets |
| Shared UI | `Button`, `Card`, `Badge`, `StatusDot`, `MetricTile` | Reusable styled presentation components |
| Marketing | Root page plus components under `components/marketing/` | Public presentation only; the active page uses the shared brand component but does not use all newer marketing components |
| Login | `/login`, `/api/auth/*`, `lib/auth/`, `proxy.ts` | Production PKCE initiation, callback, Owner membership, session persistence across refresh, logout, and the Cognito password-recovery entry page were verified live; reset-code delivery and every non-Owner role remain separate QA requirements |
| Mercury workspace | `/dashboard`, `MercuryWorkspace`, `ConversationSidebar`, `MercuryPlanCard` | Creates and resumes durable conversations, submits messages, renders deterministic linked plans and evidence status, supports versioned revision and plan-level approval decisions, and supports rename/archive/restore |
| Legacy prototype | `/workers` | Static AI-worker-oriented prototype retained as migration debt; it is not a completed intelligence-module experience |
| Mercury API | `/api/mercury/conversations`, conversation detail/message routes, `/api/mercury/plans/[planId]/approval`, `POST /api/mercury/plan`, `GET /api/mercury/history` | Enforces the Cognito-derived principal and active membership, scopes reads/writes by organization, persists idempotent conversation turns and revisions, records approval decisions, and supports compatibility planning/history |
| Mercury services | `lib/mercury/` | Keyword planning, capability mapping, approval rules, dependency routing, events, repository operations, and two execution foundations |
| Commerce Evidence | `lib/evidence/`, `lib/mercury/evidence.ts` | Provider contracts, normalized record schema, provenance, freshness, cache-aside queries, sync orchestration, PostgreSQL adapters, Mercury capability-to-dataset selection, and coverage summaries |
| Atlas | `/atlas`, `/api/atlas/assessment`, `lib/atlas/`, `app/components/atlas/` | Organization-scoped evidence assessment, transparent component scoring, findings, recommendations, opportunities, approval-compatible plans, and responsive presentation |
| Platform Core | `lib/platform/`, `/api/platform/*` | Organization and membership services, RBAC, identity abstraction, team invitations, settings, immutable audit, notifications, feature flags, and subscription entitlements |
| Decision Platform | `lib/decision/`, `/api/decisions/*` | Canonical objects, graded evidence, competing hypotheses, belief/confidence history, experiments, interventions, outcomes, lessons, RBAC, and immutable history; production verification remains |
| Database | `db/migrations/001_mercury_core.sql` through `008_decision_learning_engine.sql`, `scripts/migrate.ts` | Additive PostgreSQL schemas; migrations `007` and `008` are applied with verified checksums and required indexes |
| Amazon provider boundaries | `lib/evidence/providers/amazon-sp-api.ts`, `lib/evidence/providers/amazon-ads.ts` | Typed provider records, reader interfaces, and normalization pipelines only; no live reader, authorization flow, or synchronization is registered |
| Legacy Amazon helper | `lib/amazon/sp-api.ts` | LWA token exchange and request helper only; it is not a complete production SP-API integration and is not wired into the evidence engine |

## Work in progress

- Sprint 2: Mercury Command Center remains in progress.
- Scientific Decision Platform: domain, migration, APIs, minimal Mercury context, and local tests are implemented; database integration, authoring UI, and production rollout remain.
- Sprint 5: Atlas Foundations is implemented; live catalog ingestion, filtering, field-level diffs, execution, and outcomes remain.
- Platform Core UI and external-service operations: organization switching, Settings/Team screens, Cognito deployment/verification, invitation delivery, and Stripe workflows.
- Replacing deterministic response construction with evidence-grounded conversational reasoning while retaining deterministic routing as an explicitly limited fallback.
- Implementing the first authorized provider reader and connection lifecycle against the Commerce Evidence contracts, then connecting approved plans to a canonical execution path, unified history, and measured outcomes.
- Replacing legacy “AI workforce,” “AI workers,” and worker-oriented product language with the approved Commerce Intelligence vocabulary.
- Consolidating the duplicated styling/token foundations and deciding which unused marketing components belong in the active page.
- Turning the remaining module navigation entries and platform statuses into real routes and data-backed experiences.

## Known gaps and blockers

- Production persistence has migrations `001` through `008`. The snapshot-gated runner verified the target, checksums, and required indexes; full multi-tenant concurrency and authenticated lifecycle QA remain pending.
- Mercury responses are deterministic planning summaries. Normalized evidence retrieval and citation attachment are implemented, but no provider reader populates evidence, and there is no model-backed reasoning, attachments, or streaming.
- Atlas has a production-quality foundation and route, but it has no connected source, provider ingestion, field-level diffing, publication adapter, or outcome measurement. Vector, Oracle, Sentinel, Forge, and Pulse remain scaffolds only.
- Navigation links for Execution, Approvals, History, Knowledge, Integrations, Billing, Settings, and five intelligence module pages currently lead to unimplemented routes.
- Notifications are data-backed when PostgreSQL is configured. Sidebar provider entries remain static “Not configured” presentation rather than live health checks.
- `/workers` is protected by the route gateway and authenticated shell but remains a legacy prototype.
- Production Owner login, callback, refresh persistence, logout, organization resolution, and Mercury history are operationally verified. Reset-code delivery, temporary-password handling, suspended/unknown-user denial, and Admin/Manager/Analyst/Viewer live role matrices remain unverified.
- Multi-organization selection, invitation-to-Cognito binding, and centralized early session revocation are not implemented.
- Team persistence and authorized APIs exist, but there is no Settings UI, ownership-transfer workflow, invitation email delivery, or invitation acceptance route.
- Subscription and entitlement persistence exists, but Stripe customer mapping is not synchronized and there are no signed webhooks, checkout/portal sessions, invoices, usage metering, plan catalog, or billing UI.
- Feature flag evaluation and persistence exist, but there is no flag administration API/UI or external configuration provider.
- Amazon SP-API and Amazon Ads have evidence contracts and normalizers only. No live reader, complete authentication/signing flow, connection management, scheduler, credential storage, or production synchronization is implemented.
- Stripe billing, S3 artifact storage, API Gateway, Lambda, and Aurora provisioning are not implemented in this repository. Amplify, Cognito, and the PostgreSQL RDS instance were verified through the AWS control plane, but only Cognito has repository infrastructure-as-code.
- Mercury has separate `executor.ts` and `runtime.ts` execution paths. Neither is exposed as a complete authenticated application workflow, and the boundary between them is not finalized.
- Plan-level approval decisions have an application API and inline Mercury UI, but there is no `/approvals` queue, multi-user reviewer authorization, separation of duties, expiry, delegation, or task-level policy.
- Unit and in-process integration tests cover Mercury, Commerce Evidence, decision lifecycle, calibration, and Atlas pilot contracts. Live PostgreSQL integration, authenticated API, and browser automation suites remain gaps.
- The legacy `/workers` surface and internal compatibility identifiers still use worker terminology. The canonical shell navigation and Mercury workspace no longer do.

## Next sprint

The recommended Sprint 9 milestone is an isolated-database Atlas calibration cohort followed by the first authorized catalog evidence provider:

- Apply migrations `007` and `008` to independently verified isolated development PostgreSQL after a snapshot and verify all composite organization constraints.
- Add database integration tests for two organizations, belief-version concurrency, approval races, append-only history, evidence links, outcomes, and lessons.
- Add authenticated API tests and browser QA for Owner, Manager, Analyst, and Viewer roles.
- Build a minimal internal Decision Case authoring flow inside the existing Mercury workspace without redesigning navigation.
- Define the first calibration cohort and predefined success criteria, then report Brier score and confidence-versus-success rate.
- Pilot one reversible, approval-gated Atlas experiment with explicit rollback and human accountability.

- Apply migration `006` to a development PostgreSQL environment and add integration tests for tenant isolation, membership changes, invitation replay/expiry, audit immutability, notification deduplication, and entitlement projections.
- Add live QA fixtures for unknown/suspended identities and Admin, Manager, Analyst, and Viewer permission boundaries without granting access to unverified users.
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
| Scientific Decision Platform | Learning engine deployed; migrations applied | Lifecycle guards, predictions, atomic posterior updates, lessons, self-challenge, calibration metrics, APIs, and Mercury authoring are live; public QA is independently verified and Owner-authenticated QA is operator-confirmed |
| 3. Atlas | Foundation implemented | Explainable normalized-evidence assessment, health scoring, findings, recommendations, opportunities, governed plans, Mercury integration, and `/atlas` exist; live ingestion, diffs, execution, and outcomes remain |
| 4. Vector | Not started | Navigation, types, routing, and output scaffolding only |
| 5. Oracle | Not started | Navigation, types, routing, and output scaffolding only |
| 6. Sentinel | Not started | Navigation, types, routing, and output scaffolding only |
| 7. Forge | Not started | Navigation, types, routing, and output scaffolding only |
| 8. Pulse | Not started | Navigation, types, routing, and output scaffolding only |
| 9. Live Amazon integrations | Foundation only | Typed SP-API and Amazon Ads evidence interfaces/normalizers plus a partial legacy SP-API helper; no provider reader, authorization workflow, or live synchronization |
| 10. Mercury orchestration engine | Foundation only | Deterministic planner, versioned plans, routing, idempotent plan approval, persistence, and execution scaffolding |

## Validation status

Validation was run against this branch on 2026-08-02. Decision Platform migrations were subsequently applied by the snapshot-gated CloudShell runner. Authenticated application and full PostgreSQL lifecycle checks remain explicitly unverified until the new application revision is live.

| Check | Status |
| --- | --- |
| TypeScript typecheck (`npm run typecheck`) | Passed |
| Production build (`npm run build`) | Passed |
| Lint | Unavailable: no lint script is defined |
| Automated tests (`npm test`) | Passed: 48 tests, including authentication, RBAC, organization scope, Atlas, Mercury, evidence, lifecycle, causal claims, posterior beliefs, calibration, and migration safety |
| Decision integration tests (`npm run test:integration`) | Passed: 3 in-process lifecycle, organization-boundary, and Atlas learning fixtures; PostgreSQL integration remains unverified |
| Migration validation (`npm run migrate:dry-run`) | Passed: migrations `001` through `008` validated locally and applied through the snapshot-gated CloudShell runner with checksum/index verification |
| Markdown relative links | Passed across `AGENTS.md`, `PROJECT_STATUS.md`, `docs/`, and `specs/` |
| Public deployment smoke QA | Passed: generated Amplify URL and `app.merchantflare.com` returned HTTPS 200, `/api/health` returned `ok`, `/login` rendered without application console errors, login initiated Cognito PKCE with the exact app callback, and unauthenticated `/dashboard` returned a safe internal login redirect |
| Apex marketing availability | Failed pre-change: `merchantflare.com` had no resolvable A, AAAA, or CNAME record from the test environment; no apex DNS record was changed |
| Credentialed Cognito/database QA | Passed for the first Owner: callback returned to `/dashboard`, refresh preserved the session, active organization JSON resolved, Mercury history returned JSON without authorization/database errors, and logout returned to login. Password-recovery entry passed; code delivery and non-Owner role variants remain unverified |
| Database recovery gate | Passed: encrypted snapshot `merchantflare-pre-decision-platform-20260802` was confirmed available before migrations `007` and `008`; the runner verified the database target, checksums, and required indexes afterward |
| Amplify release | Passed: production serves merge commit `71da433c863393fa3b9564e9a8d64c613f0efaf1`; generated/custom health returned 200 and the protected Decision API returned 401 instead of the prior 404 |
| Dependency audit (`npm audit --omit=dev`) | Passed after pinning patched `postcss` and `sharp` transitive versions |

## Changelog

| Date | Change |
| --- | --- |
| 2026-08-02 | Deployed the Scientific Decision Platform to `app.merchantflare.com` from merge commit `71da433c863393fa3b9564e9a8d64c613f0efaf1`; independently verified generated/custom health, protected Decision APIs, safe redirects, Cognito PKCE callback, password recovery entry, target viewport overflow, and browser console state. Owner-authenticated workspace/refresh QA was operator-confirmed. |
| 2026-08-02 | Added the locally verified Scientific Decision Platform foundation: migration `007`, canonical decision objects, evidence and belief guardrails, experiments/interventions/outcomes/lessons, immutable history, RBAC APIs, optional Mercury context, and decision tests. Migrations `007` and `008` were subsequently applied after snapshot `merchantflare-pre-decision-platform-20260802`; live application QA remains pending. |
| 2026-08-02 | Added the Decision Learning engine: migration `008`, immutable predictions, idempotent manual execution records, guarded transitions, atomic posterior learning, generated lessons, self-challenge, calibration metrics, an Atlas title pilot contract, and minimal Mercury authoring/internal metrics. Isolated PostgreSQL application remains unverified. |
| 2026-08-02 | Deployed `main` to Amplify job `13`, verified generated/custom HTTPS, Cognito Owner login/callback/refresh/logout, organization and Mercury APIs, production migration checksums and isolation, and recorded the encrypted predeployment RDS snapshot and rollback state. |
| 2026-08-01 | Prepared the canonical app-subdomain deployment configuration, added a non-secret deployment audit, hardened reproducible Amplify installs, and documented the observed live surfaces and unresolved AWS/database/credentialed-QA blockers. |
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

