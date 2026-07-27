# Sentinel — Compliance Intelligence Specification

**Status:** Planned
**Roadmap stage:** 6
**Canonical route:** `/sentinel`

## Purpose

Sentinel identifies commerce policy and documentation risk, organizes evidence, tracks deadlines and cases, and supports governed remediation without claiming legal advice or successful reinstatement before provider confirmation.

## Current implementation evidence

Sentinel currently has navigation metadata, `compliance.audit` and `compliance.resolve` capabilities, planning rules, legacy module registration, approval-policy scaffolding, and deterministic example output. There is no Sentinel route, compliance feed, document store, case workflow, or provider submission adapter.

## In scope

- Product and account compliance issues from authorized sources.
- Suppression, documentation, case, deadline, and account-health tracking.
- Evidence readiness and missing-document analysis.
- Risk prioritization using affected products and commercial exposure.
- Remediation recommendations, review, submission, and provider response tracking.
- Complete audit history for material compliance actions.

## Required inputs

Sentinel MUST consume:

- provider issue or case identifiers;
- affected account, marketplace, product, and policy references;
- status, notice time, deadline, and provider messages;
- available documents and their provenance;
- product and business context; and
- source freshness.

Provider language MUST be retained faithfully where a semantic transformation could change meaning.

## Outputs

Each issue MUST include:

- source identifier and affected scope;
- policy or requirement reference;
- severity and deadline;
- evidence inventory and gaps;
- remediation recommendation;
- confidence and limitation;
- approval requirement;
- submitted artifact and response reference; and
- final provider-confirmed state.

## Functional requirements

- Issues MUST be deduplicated without losing provider history.
- Deadlines and severity MUST use explicit rules and time zones.
- Evidence access MUST be authorized and audited.
- Remediation content MUST distinguish provider requirements, MerchantFlare inference, and human input.
- Submissions and appeals MUST require explicit approval.
- Execution MUST retain the exact approved payload and provider response.
- A submission MUST not be labeled resolved until the source confirms resolution.
- Sensitive documents MUST use encrypted approved storage and retention controls.

## Experience requirements

The route MUST provide:

- risk summary and deadline queue;
- issue detail with provider evidence;
- document readiness;
- remediation plan and exact proposed submission;
- approval and submission state; and
- case timeline and provider-confirmed outcome.

## Non-goals for the first Sentinel milestone

- Legal advice.
- Autonomous appeals or document submission.
- Fabricated policy interpretations.
- Storing sensitive documents in unbounded database JSON.

## Acceptance criteria

Sentinel is implemented only when:

- `/sentinel` is authenticated and organization-scoped;
- a production compliance source is synchronized;
- issues preserve source identity, status, deadline, and freshness;
- evidence documents are secured and auditable;
- exact remediation payloads are approval-gated;
- provider submission and response states are durable;
- resolution requires provider confirmation; and
- tests cover authorization, deadlines, duplicate events, approval, and sensitive-data handling.

## Dependencies

- [Platform contracts](platform-contracts.md)
- [Integrations](integrations.md)
- [Knowledge](knowledge.md)
- [Approvals](approvals.md)
- [Execution](execution.md)
- [History](history.md)

## Open decisions

- First compliance feed and supported issue types.
- Document storage, encryption, and retention.
- Policy-content source and update process.
- Severity model and commercial exposure calculation.
- Reviewer roles for submissions.

\n