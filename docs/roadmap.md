# Product Roadmap

## Status definitions

- **Complete:** the sprint’s core experience is implemented and wired into the application.
- **In progress:** meaningful code exists, but the end-to-end product experience is incomplete.
- **Foundation only:** supporting types or services exist without a complete user-facing workflow.
- **Not started:** no substantive implementation exists.

Configured navigation, static mockups, and legacy prototypes do not make a roadmap item complete.

## 1. Application Shell — Complete

Implemented:

- responsive desktop sidebar;
- collapsible tablet navigation;
- mobile drawer;
- sticky topbar;
- config-driven navigation and active state;
- Mercury navigation search;
- platform-status footer;
- notification and user-menu surfaces; and
- dashboard layout integration.

Known follow-up:

- migrate or remove the `/workers` prototype during a scoped terminology/module migration;
- replace explicit “Not configured” provider states with real integration health when connections exist; and
- ensure all future platform routes share the authenticated shell layout.

## Platform Core — Foundation only

Implemented:

- durable organization, user, membership, invitation, and settings models;
- centralized Owner, Admin, Manager, Analyst, and Viewer permissions;
- a Cognito-ready identity and membership boundary with the existing signed cookie retained as a transitional adapter;
- organization-scoped team, settings, audit, notification, and subscription APIs;
- database-enforced immutable audit events;
- durable, scoped, deduplicated notifications rendered in the application shell;
- deterministic feature-flag evaluation with organization and user overrides;
- versioned subscription and entitlement persistence with trusted server-side evaluation; and
- Mercury API, repository, and UI permission enforcement.

Still required:

- verified Cognito sessions, multi-user login, session revocation, and organization switching;
- Settings, team, audit, notification-preference, feature-flag, and Billing user interfaces;
- invitation delivery and acceptance routing;
- ownership transfer and organization lifecycle workflows;
- signed Stripe webhooks, customer synchronization, checkout, portal, invoices, usage, and plan catalog; and
- PostgreSQL integration and authenticated API tests.

## 2. Mercury Command Center — In progress

Implemented:

- a responsive `/dashboard` conversation workspace;
- organization-scoped conversation and message persistence;
- authenticated APIs for conversation creation, listing, detail, message submission, rename, archive, and restore;
- transactional conversation turns linked to generated plans;
- rule-based planning, routing, approvals, and timeline generation;
- reviewable deterministic plan details and approval requirements;
- immutable plan versioning and superseding revisions;
- plan-level approval and rejection with idempotency, policy version, proposal snapshot, and audit identity;
- evidence-source, evidence-item, freshness, limitation, and plan-citation storage contracts;
- provider-neutral evidence readers, normalized record/value contracts, versioned normalization, provenance, freshness policies, cache adapters, and bounded sync orchestration;
- capability-scoped normalized evidence lookup and plan attachment in Mercury;
- explicit persistence-unavailable and evidence-unavailable states; and
- checksum-enforced database migration tooling and initial domain tests;
- authenticated organization-scoped plan history.

Still required:

- model-backed conversational reasoning;
- a production provider reader, authorization flow, and live commerce evidence synchronization;
- evidence-grounded model responses and confidence explanations;
- a dedicated approval queue, separation-of-duties policy, expiry, and delegation;
- execution controls and live progress;
- history UI;
- knowledge context;
- measured outcome reporting;
- attachments and optional response streaming; and
- PostgreSQL integration, API, browser, and broader domain test coverage.

## 3. Atlas — Foundation implemented

Atlas now has a provider-neutral domain, explainable assessment and health scoring, evidence-backed findings and recommendations, confidence-degraded opportunities, governed improvement plans, an authenticated responsive route, and Mercury integration. It consumes only normalized Commerce Evidence Layer records. The milestone is not complete because no authorized catalog source, product filtering, field-level diff, execution adapter, or outcome measurement exists.

## 4. Vector — Not started

Navigation and advertising capability types exist. There is no Vector route, Amazon Ads integration, or complete Advertising Intelligence experience.

## 5. Oracle — Not started

Navigation and demand/inventory capability types exist. There is no Oracle route or complete Demand Intelligence experience.

## 6. Sentinel — Not started

Navigation and compliance capability types exist. There is no Sentinel route or complete Compliance Intelligence experience.

## 7. Forge — Not started

Navigation and creative-brief capability types exist. There is no Forge route or complete Creative Intelligence experience.

## 8. Pulse — Not started

Navigation and reporting capability types exist. There is no Pulse route or complete Executive Intelligence experience.

The legacy `/workers` page displays static cards for all six modules. It is not evidence that module sprints 3–8 are implemented.

## 9. Live Amazon integrations — Foundation only

An early SP-API helper and integration database table exist. Provider-neutral synchronization contracts plus typed SP-API and Amazon Ads evidence reader/record interfaces and normalization pipelines are implemented. No production reader is registered and no live synchronization occurs.

Still required:

- production credential storage;
- complete request authentication/signing;
- account connection workflow;
- production provider readers and synchronization jobs;
- provider connection to the normalized evidence models;
- observability and retry behavior;
- live connection health;
- Amazon Ads authorization and API client; and
- integration management UI.

## 10. Mercury orchestration engine — Foundation only

The repository contains deterministic planning, versioned plans, routing, idempotent plan-level approval, evidence/provenance storage, persistence, and execution primitives.

Still required:

- one canonical execution architecture;
- production module adapters;
- durable queues and idempotency;
- a dedicated approval queue and task-level or hybrid policy if selected;
- retries, cancellation, and recovery;
- execution status streaming or polling;
- evidence and artifact storage;
- policy and audit controls;
- outcome measurement; and
- operational monitoring.

## Cross-cutting work

These concerns should be addressed within the sprint that first requires them:

- AWS infrastructure and environment configuration;
- Cognito verification and multi-user session lifecycle on the implemented organization tenancy model;
- S3 artifact storage;
- Stripe synchronization and billing workflows on the implemented subscription and entitlement model;
- testing and linting infrastructure;
- accessibility and responsive QA;
- product-language migration away from workforce terminology; and
- documentation updates when implementation status changes.
