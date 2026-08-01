# MerchantFlare Engineering Guide

This file governs work across the repository. It is the starting point for every coding session.

## Required reading

Before changing code, read:

1. `PROJECT_STATUS.md`
2. every file in `docs/`
3. every file in `specs/`

Use those documents together. The vision and canonical capability names define product language; architecture, roadmap, and project status distinguish implemented code from planned capability; specifications define target behavior and acceptance criteria. A specification is not evidence that a feature is implemented.

## Product definition

MerchantFlare is an **Amazon-first Scientific Decision Platform for commerce**.

Its purpose is to reduce uncertainty and improve decision quality. It connects commerce evidence, competing explanations, governed interventions, and measured outcomes in a durable decision record.

MerchantFlare is not positioned as an AI workforce, a collection of agents, a generic chatbot, or another dashboard. Large language models are replaceable components. The product value is the decision system around them.

## Canonical product model

The primary workspace is **Decision Lab**. It replaces the previous public-facing Mercury identity.

The canonical capability areas are:

- Catalog Diagnostics
- Media Diagnostics
- Demand & Availability
- Risk & Compliance
- Creative Experiments
- Executive Outcomes

Legacy internal identifiers such as `Mercury`, `Atlas`, `Vector`, `Oracle`, `Sentinel`, `Forge`, `Pulse`, `worker`, and `/atlas` may remain temporarily for persistence, API, or route compatibility. Treat them as migration debt. Do not introduce those names into new user-facing copy.

## Canonical decision lifecycle

Every material recommendation should be represented as a **Decision Case** with as much of the following structure as the available evidence supports:

1. problem or objective;
2. observed evidence;
3. current belief;
4. competing hypotheses;
5. supporting evidence;
6. counter-evidence;
7. confidence and freshness;
8. assumptions and confounders;
9. proposed experiment or intervention;
10. risk, reversibility, and approval requirements;
11. measured outcome;
12. updated belief; and
13. reusable lesson.

The system must distinguish observation, correlation, controlled comparison, quasi-causal inference, experiment, and replicated result. Do not imply causation from ordinary before-and-after data.

## Product principles

- **Evidence before assertion.** Every important claim must be traceable to observable evidence.
- **Challenge every belief.** Surface counter-evidence and state what would change the conclusion.
- **Reduce uncertainty.** Optimize for better decisions, not more AI output.
- **Experiment before automation.** Prefer reversible, measurable interventions over opaque action.
- **Outcomes update beliefs.** Every completed intervention should improve or weaken future confidence.
- **Calibrate confidence.** Confidence must be measurable, not decorative.
- **Humans retain authority.** Material decisions remain governed, reviewable, and attributable.
- **Automate tasks, not people.** Design for capability growth and time redeployed to higher-value work.
- **Privacy by design.** Customer data is isolated unless explicit permission allows aggregated learning.
- **No attachment to ideas.** Product claims, architecture, and strategy must be revised when evidence contradicts them.

## Working rules

- Inspect the existing implementation and search for usages before creating replacement components.
- Reuse and extend existing components when they fit the requirement.
- Preserve the Next.js App Router architecture, TypeScript strictness, MerchantFlare brand, and established authorization boundaries.
- Avoid placeholders, dead controls, fabricated integrations, fabricated outcomes, and UI that implies an unavailable backend capability.
- Keep changes scoped to the requested sprint. Do not bundle unrelated redesigns or speculative infrastructure.
- Do not describe a configured navigation target, type definition, mock response, static dashboard card, or planned decision engine as completed functionality.
- Keep specification status aligned with `PROJECT_STATUS.md` and the actual code.
- Keep public product language consistent with `docs/vision.md` and `docs/modules.md`.
- Update `PROJECT_STATUS.md`, `docs/`, and `specs/` when a sprint materially changes architecture, implementation status, navigation, product behavior, or accepted requirements.
- Preserve compatibility aliases until a migration explicitly updates routes, APIs, persisted records, tests, and documentation together.

## Validation

Before declaring work complete:

- run typecheck, lint, tests, and the production build when the corresponding commands are available;
- fix errors introduced by the change;
- verify responsive UI changes at relevant desktop, tablet, and mobile breakpoints;
- review the final Git diff for accidental or unrelated changes; and
- never claim a command passed unless it was actually run successfully.

The current package scripts include `typecheck`, `test`, `build`, `migrate`, and `migrate:dry-run`. There is currently no lint script. Run the available checks that match the change, and do not claim unavailable or unexecuted checks passed.

## Git

- Make logical Git commits with descriptive, imperative messages.
- Keep generated files, dependencies, secrets, and build output out of commits.
- Do not overwrite or discard unrelated user changes.
