# Scientific Decision Platform Specification

**Status:** Foundation implemented; production unverified

## Purpose

Make evidence-backed decisions, experiments, outcomes, calibrated confidence, and reusable learning the canonical platform memory beneath Mercury.

## Implemented foundation

- First-class Decision Case, Evidence, Belief, Hypothesis, Counter-Evidence relationship, Experiment, Intervention, Outcome, and Lesson contracts.
- Additive organization-scoped persistence and append-only Decision History.
- Versioned beliefs and explicit confidence history.
- Evidence provenance, freshness, ownership, confidence, references, limitations, and causal grade.
- Authenticated organization-scoped APIs and centralized permissions.
- Competing-hypothesis enforcement for recommendations and experiments.
- Experiment success criteria, observation window, risk, approval status, intervention intent, reversibility, and rollback.
- Outcome evidence grade, measured impact, unexpected effects, posterior confidence, and reusable lesson.
- Optional Decision Case context in existing Mercury conversation plans.

## Required invariants

- A recommendation MUST remain a falsifiable belief.
- A recommendation or experiment MUST consider at least two competing hypotheses.
- Material claims MUST link to evidence with source and observation time.
- Counter-evidence and confounders MUST be retained.
- Observed or Correlated outcomes MUST NOT use causal language.
- Approval MUST NOT imply execution.
- Belief revision MUST preserve prior versions and confidence.
- Every material mutation MUST append Decision History.
- Server reads and writes MUST derive organization scope from the authenticated principal.
- Outcomes, rejected hypotheses, superseded beliefs, and lessons MUST remain durable.

## Acceptance status

Implemented and locally verified: domain contracts, RBAC, additive migration structure, authenticated routes, optional Mercury context, reasoning tests, calibration tests, typecheck, test suite, and migration dry run.

Not yet verified: production migration, live PostgreSQL transaction/concurrency behavior, authenticated browser QA, two-organization database integration, intervention execution, automated outcome collection, and calibration cohorts.

The platform MUST NOT be called production-complete until those unverified items pass.
