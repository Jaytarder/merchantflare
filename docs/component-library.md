# Scientific Component Library

## Implemented

`app/components/decision/DecisionCards.tsx` provides the first reusable scientific components:

- `ScientificCard` for evidence, belief, hypothesis, experiment, outcome, lesson, and knowledge records;
- `ConfidenceIndicator` for bounded confidence and coverage values;
- `UncertaintyMeter` for first-class uncertainty; and
- `ApprovalBanner` for human-governance state.

Decision Lab composes these into a Decision Timeline, Reasoning Panel, and persistent Belief Graph relationship view. Components use semantic headings, native buttons/details, visible text labels, responsive layouts, and reduced-motion handling.

The shared application shell now uses a typed, inline SVG glyph set keyed by the existing `NavigationIcon` contract. These glyphs replace letter placeholders without changing destinations, authorization filtering, route matching, or search behavior. The premium application stylesheet supplies consistent shell, popover, control, Atlas, Mercury, and sign-in presentation with reduced-transparency and reduced-motion fallbacks.

`Logo` supports `surface="auto"` for authenticated surfaces. It renders the existing light- and dark-surface assets and lets the system color-scheme preference select the accessible variant; the underlying production artwork is unchanged.

`AppearanceControl` is a real topbar control that cycles System, Light, and Dark modes with an accessible state/next-action label. It applies `data-mf-theme` to the document root, persists only the non-sensitive browser preference, and keeps adaptive brand assets synchronized with an explicit mode.

## Planned

Split specialized Evidence, Belief, Hypothesis, Experiment, Outcome, Lesson, and Knowledge card props once their independent collection routes exist. Add automated axe coverage and Storybook only when it supports production verification rather than decorative development work.
