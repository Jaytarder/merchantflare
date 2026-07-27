# Mercury Command Center Specification

**Status:** Scaffolded
**Roadmap stage:** 2
**Primary route:** `/dashboard` today; canonical route decision remains open

## Purpose

Mercury is the Commerce Intelligence Engine and the primary conversational workspace. It must move a user from a business question to evidence, a recommendation or plan, governed execution, and measured outcome.

Mercury is not a persona managing assistants or a workforce.

## Current implementation evidence

- `/dashboard` is protected by the administrator session layout.
- The objective form calls `POST /api/mercury/plan`.
- The planning endpoint validates a string objective up to 500 characters.
- Deterministic keyword rules produce a plan, routes, approval reasons, and events.
- Results may be persisted when `DATABASE_URL` exists.
- `GET /api/mercury/history` lists persisted plan summaries.
- The remaining dashboard metrics, signals, brief, recommendations, activity, filters, system health, and provider state are static.
- There is no conversation/thread schema, message API, evidence model, streaming response, plan-detail UI, approval UI, or execution control.

## User outcomes

A permitted operator must be able to:

1. start or resume a conversation;
2. ask a commerce question or state an objective;
3. understand what data Mercury used and how fresh it is;
4. review findings, confidence, assumptions, and limitations;
5. refine the question or proposed plan;
6. review approval requirements before material actions;
7. start, monitor, cancel, or retry permitted execution;
8. inspect artifacts and results; and
9. compare projected impact with measured outcome.

## Functional requirements

### Conversations

- Conversations MUST have durable identifiers, organization ownership, title, lifecycle state, and timestamps.
- Messages MUST record author type, content, creation time, and structured attachments.
- The user MUST be able to create, list, open, rename, archive, and resume conversations.
- Concurrent submissions MUST not reorder or duplicate messages.
- Conversation context MUST be bounded and auditable.

### Responses and evidence

- Mercury responses MUST distinguish facts, inferences, recommendations, and proposed actions.
- Material claims MUST cite evidence with source, date range, and freshness.
- Missing or stale evidence MUST be disclosed.
- Confidence MUST explain its basis; a numeric value alone is insufficient.
- Streaming MAY improve responsiveness but MUST preserve a complete durable final message.

### Plans

- A plan MUST be linked to the originating conversation and message.
- Tasks MUST include module, capability, dependencies, priority, rationale, expected output, and approval requirement.
- The user MUST be able to review the plan before execution.
- Plan revisions MUST preserve prior versions or audit events.
- A deterministic fallback MUST be labeled as limited behavior if retained.

### Approvals and execution

- Approval requirements MUST be visible before execution begins.
- Approval and execution controls MUST use the contracts in [Approvals](approvals.md) and [Execution](execution.md).
- Mercury MUST not imply an action occurred until a verified execution result exists.

### History and outcomes

- Conversation history MUST integrate plans, decisions, events, artifacts, and outcomes.
- Projected and measured impact MUST use distinct labels and fields.
- Outcome measurement MUST show baseline, comparison period, method, and confidence.

## API and data requirements

At minimum, the production boundary requires:

- conversation collection and detail endpoints;
- message submission and retrieval;
- plan detail and revision;
- approval decision;
- execution start, cancel, retry, and status;
- evidence and artifact retrieval; and
- outcome retrieval.

All endpoints MUST enforce session and organization authorization. Input and error contracts MUST follow [Platform contracts](platform-contracts.md).

## Experience requirements

- The workspace MUST preserve the application shell.
- Initial, loading, streaming, offline, stale-data, no-integration, partial-evidence, error, and permission states MUST be designed.
- Sample business data MUST be visibly labeled.
- Mobile and tablet layouts MUST preserve conversation readability and access to plan/evidence panels.

## Acceptance criteria

Mercury Command Center is implemented only when:

- conversations and messages are durable;
- a user can complete the question-to-evidence-to-plan flow;
- every material claim exposes provenance and freshness;
- plan details and approval requirements are reviewable;
- authenticated execution controls expose live persisted status;
- history can reconstruct the full lifecycle;
- projected and measured outcomes are distinct;
- static dashboard claims have been removed, labeled as sample, or replaced with sourced data;
- legacy workforce language is absent from the Mercury experience; and
- automated tests, typecheck, lint, accessibility checks, and production build pass when those commands are configured.

## Open decisions

- Canonical URL and whether `/dashboard` remains an alias.
- Conversation retention and archive behavior.
- Model/provider strategy for conversational reasoning.
- Citation granularity and evidence rendering.
- Whether plan approval is plan-level, task-level, or policy-dependent.
- Initial supported attachment types.

\n