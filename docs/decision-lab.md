# Decision Lab

## Status

- **Implemented:** `/dashboard` is the authenticated Decision Lab; Mercury remains available at `/dashboard/mercury` and all Mercury APIs remain unchanged.
- **Verified locally:** TypeScript, unit tests, and production build status are recorded in `PROJECT_STATUS.md` after execution.
- **Planned:** saved filters, full collection routes, graph layout manipulation, bulk evidence review, and browser-assisted accessibility audit.

Decision Lab displays only organization-scoped persisted work: open cases, recent history, running or measuring cases, pending approvals, evidence events, confidence-related events, contradictions, and lessons. Missing data renders as an explicit empty or permission state.

The Decision Case experience follows problem, evidence, current belief, alternatives, counter-evidence, assumptions, uncertainty, recommended experiment, outcome, and lessons. Approval and execution remain distinct. The Reasoning Panel exposes formulas and self-critique.
