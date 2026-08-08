# Scientific Reasoning Engine

## Status

- **Implemented:** deterministic, explainable case analysis in `lib/decision/reasoning.ts`; organization-scoped reasoning API; append-only snapshot schema.
- **Verified locally:** unit tests cover support, contradiction, missing evidence, explicit formulas, experiment ranking, and non-fabricated gap hypotheses.
- **Planned:** model-assisted hypothesis language, semantic evidence matching, production cohort calibration, and external evidence ingestion.

## Contract

The engine reads one organization-scoped `DecisionCaseDetail`. It never reads provider payloads and never invents supporting evidence. A generated gap hypothesis is labeled as deterministic and remains unpersisted until a human reviews it.

It returns supporting, contradictory, stale, duplicated, and missing evidence; competing hypotheses; reusable lessons; self-critique; and a ranked experiment. Every numeric metric exposes its formula and component values.

## Reasoning metrics

- Confidence = 0.50 stated belief + 0.25 mean supporting-evidence confidence + 0.15 evidence coverage + 0.10 freshness − 0.25 contradiction score.
- Uncertainty = 1 − calculated confidence.
- Evidence coverage = explicitly linked supporting and contradictory evidence divided by four, capped at one.
- Evidence freshness = mean of current 1.00, delayed 0.65, stale 0.25, unavailable 0.
- Knowledge completeness = mean of evidence coverage, two-hypothesis coverage, falsifiability, and documented assumptions.
- Contradiction score = contradictory links divided by all supporting and contradictory links.

These are inspectable engineering heuristics, not causal claims. Calibration against resolved predictions determines whether confidence is useful.

## Experiment priority

The engine ranks recorded experiments using 30% expected information gain, 20% business value, 15% safety, 10% reversibility, 5% cost efficiency, 5% time efficiency, and 15% evidence weakness. Components and the formula are returned with every rank.

## Safety

- Reasoning is tenant scoped at the authenticated service and database boundaries.
- Read-only analysis does not persist.
- Explicit recalculation appends a reasoning snapshot and history event.
- Provider execution, approval, and observed outcomes remain separate operations.
