# Scientific Component Library

## Implemented

`app/components/decision/DecisionCards.tsx` provides the first reusable scientific components:

- `ScientificCard` for evidence, belief, hypothesis, experiment, outcome, lesson, and knowledge records;
- `ConfidenceIndicator` for bounded confidence and coverage values;
- `UncertaintyMeter` for first-class uncertainty; and
- `ApprovalBanner` for human-governance state.

Decision Lab composes these into a Decision Timeline, Reasoning Panel, and persistent Belief Graph relationship view. Components use semantic headings, native buttons/details, visible text labels, responsive layouts, and reduced-motion handling.

## Planned

Split specialized Evidence, Belief, Hypothesis, Experiment, Outcome, Lesson, and Knowledge card props once their independent collection routes exist. Add automated axe coverage and Storybook only when it supports production verification rather than decorative development work.
