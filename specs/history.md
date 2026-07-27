# History Specification

**Status:** Scaffolded
**Canonical route:** `/history`

## Purpose

History provides an auditable, searchable record of conversations, plans, evidence, decisions, executions, artifacts, and outcomes.

## Current implementation evidence

History navigation exists. `GET /api/mercury/history` returns bounded plan summaries from PostgreSQL, and repository code can load plan detail with tasks, events, and approvals. There is no history route, detail endpoint, conversation history, pagination cursor, unified audit model, export, or retention policy. The API does not validate a session.

## Functional requirements

- Users MUST search and filter by time, module, account, conversation, plan, status, actor, and event.
- History MUST expose plan versions, exact approvals, execution attempts, artifacts, and outcome records.
- Events requiring audit MUST be append-only.
- Current state MUST link to the events that produced it.
- Detail views MUST preserve evidence and source freshness as observed at decision time.
- Exports MUST be authorized, scoped, timestamped, and auditable.
- Retention and deletion MUST follow organization and regulatory policy.
- Pagination MUST be stable under concurrent writes.

## Experience requirements

- The timeline MUST distinguish user activity, system analysis, policy decisions, provider execution, and measured outcomes.
- Filters MUST be reflected in shareable URLs without exposing secrets.
- Missing or expired artifacts MUST be explained.
- Users MUST be able to navigate back to originating Mercury context where authorized.

## API requirements

- List APIs MUST use bounded cursor pagination.
- Detail APIs MUST authorize organization ownership.
- Event payloads MUST use typed safe metadata.
- History reads MUST not expose credentials or unrestricted provider payloads.

## Acceptance criteria

History is implemented only when:

- `/history` supports authorized search, filter, and pagination;
- full lifecycle detail is available from conversation through outcome;
- plan and approval versions are immutable and reconstructable;
- exports are scoped and audited;
- retention behavior is defined and tested; and
- all history APIs enforce authentication and organization authorization.

## Open decisions

- Audit retention period and legal requirements.
- Export formats and maximum scope.
- Event storage and projection strategy.
- Redaction behavior after user or organization deletion.

\n