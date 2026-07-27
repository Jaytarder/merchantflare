# MerchantFlare Agent Guide

This file governs work across the repository. It is the starting point for every coding session.

## Required reading

Before changing code, read:

1. `docs/vision.md`
2. `docs/architecture.md`
3. `docs/roadmap.md`
4. `docs/design-system.md`
5. `docs/modules.md`

Use those documents together. The vision and module names define the product language; the architecture and roadmap distinguish implemented code from planned capabilities.

## Product definition

MerchantFlare is a **Commerce Intelligence Platform**.

Mercury is the **Commerce Intelligence Engine** and the primary conversational workspace. Atlas, Vector, Oracle, Sentinel, Forge, and Pulse are intelligence modules.

Do not position MerchantFlare as:

- an AI workforce;
- a set of AI workers or assistants;
- a collection of AI tools; or
- an agent marketplace.

Legacy code and copy still contain terms such as `worker`, `AI Workers`, and `AI workforce`. Treat these as migration debt, not approved product language. Do not extend that terminology into new user-facing work. Internal identifiers may be migrated only when the requested sprint justifies the compatibility work.

## Working rules

- Inspect the existing implementation and search for usages before creating replacement components.
- Reuse and extend existing components when they fit the requirement.
- Preserve the Next.js App Router architecture, TypeScript strictness, MerchantFlare brand, and established module boundaries.
- Avoid placeholders, dead controls, fabricated data integrations, and UI that implies an unavailable backend capability.
- Keep changes scoped to the requested sprint. Do not bundle unrelated redesigns or speculative infrastructure.
- Do not describe a configured navigation target, type definition, mock response, or static dashboard card as a completed feature.
- Keep public product language consistent with `docs/vision.md` and `docs/modules.md`.
- Update the project documents when a sprint materially changes architecture, implementation status, navigation, or product behavior.

## Validation

Before declaring work complete:

- run typecheck, lint, tests, and the production build when the corresponding commands are available;
- fix errors introduced by the change;
- verify responsive UI changes at relevant desktop, tablet, and mobile breakpoints;
- review the final Git diff for accidental or unrelated changes; and
- never claim a command passed unless it was actually run successfully.

The current package scripts include `typecheck` and `build`. There is currently no lint or test script; do not claim those checks ran unless scripts are added and executed.

## Git

- Make logical Git commits with descriptive, imperative messages.
- Keep generated files, dependencies, secrets, and build output out of commits.
- Do not overwrite or discard unrelated user changes.
