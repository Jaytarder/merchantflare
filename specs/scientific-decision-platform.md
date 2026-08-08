# Scientific Decision Platform Specification

**Status:** Foundation implemented; production unverified

## Purpose

Make evidence-backed decisions, experiments, outcomes, calibrated confidence, and reusable learning the canonical platform memory beneath Mercury.

## Implemented foundation

- Release 1.0 explainable reasoning with published formulas and component values.
- Persistent append-only Belief Graph edges and reasoning snapshots through additive migration `009`.
- Deterministic contradiction, stale/duplicate/missing evidence detection and labeled gap hypotheses.
- Expected-information-gain experiment ranking and reusable organization knowledge.
- Decision Lab as the authenticated dashboard with Mercury preserved at `/dashboard/mercury`.

- First-class Decision Case, Evidence, Belief, Hypothesis, Counter-Evidence relationship, Experiment, Intervention, Outcome, and Lesson contracts.
- Additive organization-scoped persistence and append-only Decision History.
- Versioned beliefs and explicit confidence history.
- Evidence provenance, freshness, ownership, confidence, references, limitations, and causal grade.
- Authenticated organization-scoped APIs and centralized permissions.
- Competing-hypothesis enforcement for recommendations and experiments.
- Experiment success criteria, observation window, risk, approval status, intervention intent, reversibility, and rollback.
- Outcome evidence grade, measured impact, unexpected effects, posterior confidence, and reusable lesson.
- Optional Decision Case context in existing Mercury conversation plans.
- Immutable experiment predictions, idempotent execution records, and explicit lesson reuse persistence.
- Guarded lifecycle transitions and atomic outcome-to-posterior-belief learning.
- Organization-scoped calibration metrics and deterministic belief self-challenge.
- Minimal Decision Case authoring and internal metrics inside Mercury without navigation changes.

## Required invariants

- A recommendation MUST remain a falsifiable belief.
- A recommendation or experiment MUST consider at least two competing hypotheses.
- Material claims MUST link to evidence with source and observation time.
- Counter-evidence and confounders MUST be retained.
- Observed or Correlated outcomes MUST NOT use causal language.
- Approval MUST NOT imply execution.
- Belief revision MUST preserve prior versions and confidence.
- Every material mutation MUST append Decision History.
- Prediction inputs MUST be immutable after experiment creation and a prediction MUST resolve at most once.
- Outcome, posterior belief, generated lesson, and prediction resolution MUST commit or roll back together.
- Provider execution MUST fail closed until a provider-specific authenticated publisher exists.
- Server reads and writes MUST derive organization scope from the authenticated principal.
- Outcomes, rejected hypotheses, superseded beliefs, and lessons MUST remain durable.

## Acceptance status

Implemented and locally verified: domain contracts, RBAC, additive migrations `007` through `009`, authenticated routes, Mercury authoring, Decision Lab build, internal metrics, reasoning and calibration tests, typecheck, test suite, integration fixtures, and migration dry run.

Not yet verified: isolated-development migration application, live PostgreSQL transaction/concurrency behavior, authenticated browser QA, two-organization database integration, manual intervention recording against PostgreSQL, automated outcome collection, and a real calibration cohort. Production migration is explicitly out of scope.

The platform MUST NOT be called production-complete until those unverified items pass.
