# Approvals Specification

**Status:** Scaffolded
**Canonical route:** `/approvals`

## Purpose

Approvals provide human authority over material commerce actions. An approval must bind a reviewer’s decision to an immutable, understandable action proposal.

## Current implementation evidence

Approval navigation, capability policy rules, versioned policy decisions, and plan-level approval persistence exist. Pending requests bind an immutable proposal snapshot and plan version. An authenticated, organization-scoped, idempotent API and inline Mercury confirmation UI authorize `mercury.approve` roles, approve or reject a pending request, record the actor identity, note, policy version, and timestamp, append a Platform Core audit event, and do not execute the plan. Superseding a pending plan supersedes its approval. There is no `/approvals` route, separation of duties, expiry, delegation, bulk workflow, or task-level approval.

Decision experiments add a separate `decisions.approve` boundary. An approval is rejected until an exact intervention and rollback plan exist. Approval marks that recorded intervention as approved but never executes it; later intervention mutation is rejected after the approval decision.

## Functional requirements

- Policies MUST determine when approval is required and record the policy version.
- Approval requests MUST bind to an immutable plan/task version and exact proposed changes.
- Requests MUST show rationale, evidence, projected impact, risks, affected scope, and conflicts.
- Authorized reviewers MUST approve or reject with identity and timestamp.
- Rejection reason MUST be required when policy requires it.
- Expired, superseded, cancelled, or already-decided requests MUST reject new decisions.
- Decisions MUST be idempotent.
- Approval MUST release only the bound version and eligible tasks.
- Material changes after approval MUST require a new request.
- Delegation and separation-of-duties rules MUST be enforceable if configured.

## Experience requirements

- The queue MUST filter by urgency, module, account, requester, policy, and age.
- Detail MUST show exact before/after state, evidence, dependencies, and consequence.
- Bulk approval MUST be disabled unless every item is independently understandable and policy permits it.
- Users MUST see when a request is stale because source data changed.
- Decision confirmation MUST reflect action risk.

## Acceptance criteria

Approvals are implemented only when:

- `/approvals` and authenticated decision APIs exist;
- policy evaluation is versioned and auditable;
- requests bind immutable proposals and evidence;
- reviewer authorization and separation rules are enforced;
- approval, rejection, expiry, supersession, and duplicate decisions are tested;
- approval releases only the correct executable scope; and
- the full decision is visible in history.

## Open decisions

- Plan-level, task-level, or hybrid approval.
- Role matrix and separation-of-duties defaults.
- Expiry and revalidation rules.
- Delegation and escalation behavior.
- Bulk-decision policy.

\n
