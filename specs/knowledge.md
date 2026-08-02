# Knowledge Specification

**Status:** Planned
**Canonical route:** `/knowledge`

## Purpose

Knowledge stores the governed business context Mercury and intelligence modules use: definitions, goals, policies, product facts, evidence references, and approved operating assumptions.

## Current implementation evidence

Decision Lessons provide the first reusable, organization-scoped learning record. Each lesson links to an immutable outcome, carries applicability, limitations, and confidence, and remains searchable through its Decision Case history. Migration `008` adds explicit organization-scoped reuse links so reuse can be measured without copying or weakening the source lesson. Cross-case retrieval, semantic indexing, governance UI, and automated lesson recommendations remain planned.

Knowledge navigation exists, but there is no route, schema, ingestion workflow, retrieval boundary, source/version model, or user interface.

## In scope

- Business definitions and metric semantics.
- Organization goals, targets, thresholds, and constraints.
- Brand, product, and approved-claims facts.
- Approval and operating policies.
- Source documents and structured knowledge references.
- Ownership, versioning, effective dates, review, and expiry.
- Retrieval for Mercury and modules with evidence attribution.

## Functional requirements

- Every knowledge item MUST have organization, type, owner, source, version, status, timestamps, and access scope.
- Changes MUST create versions and preserve audit history.
- Published knowledge MUST support review and expiry.
- Conflicting active facts MUST be surfaced rather than silently merged.
- Retrieval MUST return citations and effective version.
- Sensitive knowledge MUST be access-controlled.
- Uploaded files MUST use approved object storage, malware scanning, and retention controls.
- Deletion MUST define effects on historical decisions that cited the item.

## Experience requirements

- Users MUST browse, search, create, review, publish, supersede, and archive permitted knowledge.
- Detail MUST show source, owner, version, effective dates, citations, and dependent workflows.
- Draft and published states MUST be unmistakable.
- Missing knowledge identified by Mercury SHOULD create a reviewable request, not an invented fact.

## Non-goals for the first milestone

- Unbounded general document management.
- Treating unreviewed generated text as approved knowledge.
- Replacing historical evidence with current versions.

## Acceptance criteria

Knowledge is implemented only when:

- `/knowledge` is authenticated and organization-scoped;
- versioned typed items can be reviewed and published;
- retrieval returns authorized effective versions and citations;
- conflicts, expiry, and supersession are supported;
- file security and retention are implemented where uploads exist;
- historical plans retain references to the versions they used; and
- tests cover authorization, versioning, conflicts, and expiry.

## Open decisions

- Initial knowledge types and editors.
- Review workflow and required approver roles.
- Search and retrieval technology.
- File formats, storage, and retention.
- Historical deletion and legal-hold behavior.

\n
