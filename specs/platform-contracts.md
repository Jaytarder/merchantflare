# Platform Contracts

**Status:** Scaffolded
**Applies to:** All MerchantFlare application, module, operational, and integration surfaces

## Purpose

This specification defines cross-cutting contracts that feature specifications inherit. It prevents each module from inventing separate identity, evidence, status, and outcome models.

## Current implementation evidence

- Strict TypeScript is enabled in `tsconfig.json`.
- `lib/domain.ts` contains early organization, user, account, objective, task, alert, metric, and event types.
- `lib/auth.ts` provides a single administrator session with development fallbacks.
- `lib/db.ts` provides an optional PostgreSQL connection.
- Mercury migrations establish plans, tasks, events, approvals, execution fields, and integration metadata.
- No production tenancy, authorization, normalized commerce model, audit policy, queue, observability stack, or AWS resource configuration is implemented.

## Core domain boundaries

The production domain MUST distinguish:

- organization;
- user and role;
- commerce account and marketplace;
- provider connection;
- conversation and message;
- evidence source and evidence item;
- finding and recommendation;
- plan and task;
- approval policy and decision;
- execution attempt and event;
- artifact;
- metric definition and metric observation; and
- projected impact versus measured outcome.

Persisted records MUST carry an organization boundary. Records tied to a provider MUST also identify the connection, account, marketplace, and source timestamp where applicable.

## Identity and authorization

- Every non-public page and API MUST require an authenticated principal.
- Authorization MUST be evaluated server-side for reads and mutations.
- Roles MUST be explicit and centrally defined; UI hiding alone is not authorization.
- Session and credential secrets MUST be required in production and MUST NOT have production fallbacks.
- Provider credentials MUST remain server-side and be stored through an approved secret-management mechanism.
- Security-sensitive events MUST be auditable.

The current HMAC administrator cookie is an interim scaffold. Its compatibility and migration path must be addressed in the [Settings specification](settings.md) and before multi-user production use.

## Evidence and data provenance

Every material finding, recommendation, and reported outcome MUST be traceable to evidence containing:

- source provider or internal source;
- organization and commerce account;
- source record or query reference when available;
- observation time and ingestion time;
- applicable date range;
- freshness state;
- transformation or metric-definition version; and
- human-readable limitations.

The interface MUST differentiate live, delayed, unavailable, estimated, projected, and sample data.

## Status semantics

Statuses MUST be finite, typed, and documented. At minimum:

- recommendations: proposed, dismissed, accepted;
- approvals: pending, approved, rejected, expired, cancelled;
- executions: queued, running, blocked, succeeded, failed, cancelled;
- integrations: connected, attention, disconnected, syncing;
- evidence freshness: current, delayed, stale, unavailable; and
- outcomes: projected, measuring, measured, inconclusive.

Status transitions MUST be validated at a domain boundary and recorded as append-only events where an audit history is required.

## API contracts

- Route handlers MUST validate input before invoking domain services.
- Error responses MUST use a stable shape with a machine-readable code and safe user message.
- List endpoints MUST use bounded pagination.
- Mutations that may be retried MUST accept or derive an idempotency key.
- Provider-specific payloads MUST not leak directly into UI contracts.
- Dates MUST use ISO 8601 UTC at transport boundaries.
- Monetary values MUST include currency and avoid floating-point persistence.
- API changes SHOULD remain backward compatible or be explicitly versioned.

## Reliability and operations

- External calls MUST define timeouts, bounded retries, rate-limit behavior, and error classification.
- Background work MUST be durable and resumable.
- Logs MUST carry correlation identifiers for organization, request, plan, and execution where applicable.
- Credentials, session values, and sensitive provider payloads MUST be redacted.
- Operational metrics MUST cover latency, failures, queue age, sync freshness, and provider throttling.
- Destructive or material provider mutations MUST support audit and recovery behavior appropriate to the provider.

## User experience

Every data-backed surface MUST provide:

- loading state;
- first-use empty state;
- no-results state;
- stale or unavailable state;
- recoverable error state;
- permission-denied state; and
- clear last-updated and source context.

All interactive controls MUST perform a real action. Sample experiences MUST be labeled as samples and MUST NOT display false “connected” or “operational” claims.

## Acceptance criteria

This cross-cutting specification is complete only when:

- shared production domain contracts replace ad hoc feature-specific equivalents;
- all protected APIs enforce authentication and organization authorization;
- evidence and freshness are available across module outputs;
- projected and measured impact are distinct throughout the product;
- status transitions and audit records are consistent across features;
- retryable mutations are idempotent;
- logs and metrics support production incident diagnosis; and
- security, accessibility, and responsive requirements are verified.

## Open decisions

- Organization membership and role matrix.
- Data retention and deletion policy.
- Currency conversion and metric-definition ownership.
- Event transport and durable queue technology.
- Observability vendor and trace retention.

\n