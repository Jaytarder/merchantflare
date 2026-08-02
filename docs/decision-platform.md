# Scientific Decision Platform

## Release 1.0 reasoning layer

Migration `009` adds immutable organization-scoped Belief Graph edges and explainable reasoning snapshots without changing migrations `001` through `008`. `/api/decisions/cases/[caseId]/reasoning` returns formulas, components, self-critique, ranked experiments, and reusable knowledge; `persist=true` requires decision-write permission and appends the snapshot and history. `/dashboard` becomes Decision Lab while Mercury remains available at `/dashboard/mercury` and existing APIs remain compatible.

## Status

### Implemented

- Canonical contracts for Decision Case, Evidence, Belief, Hypothesis, Counter-Evidence, Experiment, Intervention, Outcome, and Lesson.
- Organization-scoped PostgreSQL storage in additive migration `007_scientific_decision_platform.sql`.
- Immutable Decision History plus belief-version and confidence-history records.
- Evidence provenance, freshness, confidence, and the grades Observed, Correlated, Controlled, Quasi-Causal, Experimental, and Replicated.
- Competing-hypothesis and causal-language guardrails.
- Approval-pending defaults for high-risk experiments. Approval records authority; it does not execute an intervention.
- Authenticated APIs for the full decision lifecycle.
- Optional, backward-compatible Decision Case context in Mercury plan responses and plan cards.
- Migration `008_decision_learning_engine.sql` adds immutable predictions, idempotent execution records, and lesson-reuse links without changing migration `007`.
- Experiment creation freezes the current belief confidence as a prediction. Outcome recording atomically resolves that prediction, versions the belief, creates the lesson, and appends history.
- Mercury includes a compact Decision Case authoring workbench; existing conversation and plan workflows remain unchanged.
- Owner/Admin audit permission exposes an internal engineering metrics view calculated from resolved organization predictions.
- Deterministic self-challenge reports counter-evidence, unresolved assumptions, alternatives, missing evidence, and the experiment most likely to reduce uncertainty.

### Verified locally

- TypeScript typecheck.
- Fifty-one automated tests covering reasoning, calibration, RBAC, causal claims, lifecycle transitions, Atlas rollback, posterior beliefs, contradiction handling, and migration safety.
- Ordered dry-run checksums for migrations `001` through `009`; migration `009` is not production-applied until the Release 1.0 snapshot gate passes.

### Planned or unverified

- Migration `007` has not been applied to production by this sprint branch.
- The APIs have not been exercised against production PostgreSQL or a production browser.
- Provider execution and automated outcome collection are not implemented. Manual execution may be recorded only for an approved tenant-matched intervention.
- Cross-case semantic retrieval and automatic lesson reuse recommendations remain planned; reuse persistence exists.
- PostgreSQL transaction and concurrency verification remains blocked until an independently verified isolated development database is available.

## Canonical lifecycle

```text
problem + objective
  -> observed evidence
  -> current belief
  -> competing hypotheses + counter-evidence
  -> experiment + exact intervention + rollback
  -> approval
  -> observed outcome
  -> posterior belief + reusable lesson
```

The lifecycle is append-audited. An outcome never overwrites the evidence or belief that preceded it. Belief revisions create a new version and confidence-history record.

## Privacy and authorization

Every row carries `organization_id`. Composite foreign keys keep related records inside the same organization. Server services derive organization scope from the authenticated principal.

| Role | Read | Investigate/write | Measure outcomes | Approve experiments |
| --- | --- | --- | --- | --- |
| Owner | Yes | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes | Yes |
| Manager | Yes | Yes | Yes | Yes |
| Analyst | Yes | Yes | Yes | No |
| Viewer | Yes | No | No | No |

## API

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/decisions/cases` | `GET`, `POST` | List or create Decision Cases |
| `/api/decisions/cases/[caseId]` | `GET` | Retrieve the complete case lifecycle |
| `/api/decisions/evidence` | `GET`, `POST` | Retrieve or record sourced evidence |
| `/api/decisions/evidence-links` | `GET`, `POST` | Retrieve or attach evidence relationships |
| `/api/decisions/beliefs` | `GET`, `POST` | Retrieve or record beliefs |
| `/api/decisions/beliefs/[beliefId]` | `PUT` | Version a belief and confidence |
| `/api/decisions/hypotheses` | `GET`, `POST` | Retrieve or record competing hypotheses |
| `/api/decisions/experiments` | `GET`, `POST` | Retrieve or propose measurable experiments |
| `/api/decisions/experiments/[experimentId]/approval` | `POST` | Approve or reject without executing |
| `/api/decisions/interventions` | `GET`, `POST` | Retrieve or record exact intent and rollback |
| `/api/decisions/outcomes` | `GET`, `POST` | Retrieve or record measured outcomes |
| `/api/decisions/lessons` | `GET`, `POST` | Retrieve or preserve reusable lessons |
| `/api/decisions/history` | `GET` | Search organization or case history |
| `/api/decisions/cases/[caseId]/transition` | `POST` | Guard and persist a lifecycle transition |
| `/api/decisions/cases/[caseId]/challenge` | `GET` | Return deterministic self-challenge gaps |
| `/api/decisions/executions` | `POST` | Idempotently record an approved manual execution |
| `/api/decisions/metrics` | `GET` | Return internal organization learning metrics |
| `/api/decisions/atlas-pilot` | `POST` | Prepare the reversible Atlas title pilot contract |

Existing `/api/mercury/*`, `/api/platform/*`, and `/api/atlas/*` routes remain unchanged.

## Evidence and causality

Evidence grade constrains the claim MerchantFlare may make. Observed and Correlated records may describe an association, not causation. Causal language is accepted only for Experimental or Replicated outcomes.

## Rollout and rollback

Apply migrations `007` and `008` only to an independently identified isolated development PostgreSQL database after taking a snapshot. Rollback is application-first: redeploy the prior revision so it stops reading additive tables. Preserve the additive tables and immutable learning history; removal requires a separately reviewed destructive migration restored from the pre-migration snapshot if necessary.
