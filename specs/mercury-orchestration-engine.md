# Mercury Orchestration Engine Specification

**Status:** Scaffolded
**Roadmap stage:** 10

## Purpose

Define the server-side engine that converts an approved objective or plan into durable, policy-governed module execution and measurable outcomes.

## Current implementation evidence

The repository contains:

- deterministic objective planning;
- capability-to-module routing using legacy `worker` identifiers;
- dependency and approval flags;
- timeline event generation;
- PostgreSQL persistence for plans, tasks, approvals, and events;
- approval-decision repository functions;
- a generic in-memory executor with a mock fallback;
- a database-backed sequential runtime with deterministic module outputs; and
- execution-state columns and event writes.

There are two execution paths. Neither is exposed through a complete authenticated API, queue, recovery process, or production module adapter.

## Canonical lifecycle

The engine MUST implement a single documented lifecycle:

```tex
draf
  -> planned
  -> awaiting_approval | ready
  -> queued
  -> running
  -> completed | partially_completed | failed | cancelled
  -> measuring
  -> measured | inconclusive
```

Task lifecycle and plan lifecycle MUST be related but independently valid. A plan MUST NOT be marked complete while required tasks remain unresolved.

## Planning requirements

- Planning MUST produce a versioned immutable plan snapshot.
- Every task MUST declare module, capability, inputs, dependencies, expected outputs, policy checks, and idempotency scope.
- Unsupported capabilities MUST fail safely before execution.
- Plan confidence MUST be explainable and tied to evidence coverage.
- Plan revision MUST create a new version rather than silently changing an approved plan.

## Routing and policy

- Capability ownership MUST be centrally registered.
- The engine MUST reject missing, duplicate, and cyclic dependencies.
- Approval policy evaluation MUST occur before tasks become executable.
- Policy decisions MUST record the policy version and rationale.
- Legacy persisted `worker` fields may remain until a versioned migration replaces them; new user-facing contracts MUST use module terminology.

## Execution requirements

- Production execution MUST use durable queueing and leases.
- Every task MUST have an idempotency key.
- Retries MUST be bounded and classify retryable versus terminal failures.
- Timeouts, cancellation, and dead-letter or recovery handling MUST be explicit.
- Dependency release MUST occur only after durable success.
- Provider mutations MUST record request intent and a safe provider response reference.
- A process restart MUST not lose or duplicate accepted work.

## Events and observability

- Lifecycle changes MUST append immutable events.
- Events MUST include correlation, organization, plan, task, attempt, type, timestamp, and safe metadata.
- Current state MAY be projected for efficient reads but MUST be reconstructable from durable records.
- Metrics MUST cover queue age, throughput, retries, failures, cancellations, approval wait, and provider throttling.

## Artifacts and outcomes

- Outputs MUST use typed, versioned artifact contracts.
- Large artifacts MUST use the approved object-storage boundary rather than unbounded database JSON.
- Artifacts MUST reference their evidence and producing execution.
- Outcome measurement MUST link baseline, projected impact, actual observations, and methodology.

## Security

- Only authorized users or trusted services may plan, approve, execute, cancel, or retry.
- Execution identity and approving identity MUST be recorded separately.
- Module adapters MUST receive scoped credentials and minimum required data.
- Sensitive request and response fields MUST be redacted from events and logs.

## Acceptance criteria

The orchestration engine is implemented only when:

- one canonical execution path replaces or retires the two current paths;
- durable queueing, idempotency, dependency release, retries, timeout, cancellation, and recovery are verified;
- approval decisions safely release or stop the correct plan version;
- authenticated APIs expose plan detail and lifecycle controls;
- production module adapters replace mock and deterministic output paths;
- state and event history remain consistent through failure and restart tests;
- artifacts and measured outcomes are persisted through typed contracts; and
- operational dashboards and alerts cover the engine.

## Open decisions

- Queue and scheduler technology.
- Event-sourcing versus event-audited state model.
- Plan-level versus task-level approval semantics.
- Partial-success behavior.
- Artifact storage format and retention.
- Migration strategy for persisted `worker` terminology.

\n