# Scientific Decision Platform

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

### Verified locally

- TypeScript typecheck.
- Forty-two automated tests covering reasoning, confidence calibration, RBAC, causal claims, posterior beliefs, and migration safety.
- Ordered dry-run checksums for migrations `001` through `007`.

### Planned or unverified

- Migration `007` has not been applied to production by this sprint branch.
- The APIs have not been exercised against production PostgreSQL or a production browser.
- There is no full Decision Case authoring UI, execution queue, automated intervention, or live outcome collector.
- Cross-case semantic search and lesson reuse recommendations remain planned.

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

Existing `/api/mercury/*`, `/api/platform/*`, and `/api/atlas/*` routes remain unchanged.

## Evidence and causality

Evidence grade constrains the claim MerchantFlare may make. Observed and Correlated records may describe an association, not causation. Causal language is accepted only for Experimental or Replicated outcomes.

## Rollout and rollback

Apply migration `007` to isolated development PostgreSQL first, run database integration tests for two organizations, and verify authenticated browser behavior before production. Rollback is application-first: redeploy the prior revision so it stops reading additive tables. The tables should remain intact to preserve learning and audit history; removal would require a separate destructive migration.
