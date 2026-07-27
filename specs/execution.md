# Execution Specification

**Status:** Scaffolded
**Canonical route:** `/execution`

## Purpose

Execution is the operational surface for approved and running actions. It must show what MerchantFlare intends to change, what it attempted, what the provider accepted, and what outcome followed.

## Current implementation evidence

Execution navigation exists. Mercury types, migrations, repository functions, a generic mock executor, and a database-backed deterministic runtime provide scaffolding. No execution route or authenticated execution API exists. No production provider mutation adapter is wired.

## Functional requirements

- Users MUST view queued, running, blocked, failed, succeeded, and cancelled work.
- Every execution MUST link to its originating conversation, plan version, task, approval, organization, module, and provider connection.
- The exact approved intent MUST be immutable.
- Starting execution MUST be authorized and idempotent.
- Users with permission MUST be able to cancel eligible work and retry eligible failures.
- Retries MUST create attempts without overwriting prior attempts.
- Provider acknowledgement MUST be distinct from verified final state.
- Partial success MUST identify affected and unaffected records.
- Execution detail MUST show timestamps, attempts, safe request summary, provider reference, events, artifacts, and errors.

## Experience requirements

- Filters MUST include status, module, account, marketplace, owner, and time.
- Blocking approval, dependency, data, and integration reasons MUST be explicit.
- Destructive or material actions MUST receive a confirmation appropriate to risk.
- Polling or streaming MUST reconcile with durable server state.
- Empty, delayed, and provider-unavailable states MUST be supported.

## Security and reliability

- APIs MUST enforce organization and action authorization.
- Credentials and sensitive payloads MUST not appear in UI or logs.
- Queue leases, retries, timeouts, cancellation, and idempotency MUST follow [Mercury orchestration engine](mercury-orchestration-engine.md).
- Manual state edits that bypass events are prohibited.

## Acceptance criteria

Execution is implemented only when:

- `/execution` and authenticated detail APIs exist;
- production work is queue-backed and resumable;
- exact approved intent and every attempt are durable;
- cancel and retry behavior is permissioned and tested;
- partial and provider failure states are clear;
- provider state is reconciled after mutation; and
- history can reconstruct the lifecycle.

## Open decisions

- Initial executable capability allowlist.
- Cancellation semantics per provider.
- Default retry policy and manual-retry roles.
- Retention for detailed provider responses.

\n