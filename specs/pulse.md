# Pulse — Executive Intelligence Specification

**Status:** Planned
**Roadmap stage:** 8
**Canonical route:** `/pulse`

## Purpose

Pulse synthesizes verified intelligence across MerchantFlare into concise executive reporting that explains performance, drivers, risks, decisions, ownership, and measured outcomes.

## Current implementation evidence

Pulse currently has navigation metadata, a `reporting.generate` capability, a reporting task appended to deterministic Mercury plans, legacy module registration, and deterministic example output. The dashboard contains static executive metrics and a static brief. There is no Pulse route, metric governance, cross-module aggregation, scheduled report workflow, or sourced executive reporting.

## In scope

- Governed metric definitions and reporting periods.
- Cross-module findings, recommendations, actions, risks, and outcomes.
- Executive briefs, scorecards, trends, and decision summaries.
- Owner and next-action accountability.
- Scheduled and on-demand reports.
- Drill-through from summary claims to evidence.

## Required inputs

Pulse MUST consume:

- versioned metric definitions;
- normalized observations with currency and date context;
- module findings and evidence;
- plan, approval, and execution state;
- projected and measured outcomes; and
- organization goals, reporting preferences, and ownership.

Pulse MUST expose missing, delayed, or incomparable data.

## Outputs

Pulse outputs MUST include:

- reporting period and comparison period;
- metric definition version;
- result, driver, risk, and opportunity;
- source and freshness;
- confidence and limitation;
- related decisions and execution;
- owner and next action; and
- projected versus measured impact.

## Functional requirements

- Users MUST drill from every material summary claim to supporting evidence.
- Reports MUST distinguish outcome metrics from driver metrics.
- Currency conversion and period comparisons MUST be explicit.
- Scheduled reports MUST be versioned and reproducible.
- Corrections to source data MUST create a traceable revised report.
- Distribution MUST respect authorization and organization boundaries.
- Pulse MUST not report deterministic example output or static dashboard values as live facts.

## Experience requirements

The route MUST provide:

- executive overview;
- metric trends and drivers;
- prioritized risks and opportunities;
- decisions and action ownership;
- projected and measured outcomes;
- report history and scheduling; and
- evidence drill-through.

## Non-goals for the first Pulse milestone

- A general business-intelligence authoring platform.
- Untraceable narrative generation.
- Cross-currency rollups without approved conversion rules.
- Automatic external distribution without access controls.

## Acceptance criteria

Pulse is implemented only when:

- `/pulse` is authenticated and organization-scoped;
- metrics use versioned definitions and sourced observations;
- every material statement drills through to evidence;
- reports distinguish results, drivers, risks, actions, and outcomes;
- scheduled reports are durable and reproducible;
- distribution enforces authorization;
- static dashboard claims are removed or labeled as sample; and
- tests cover metric periods, revisions, authorization, and missing data.

## Dependencies

- [Platform contracts](platform-contracts.md)
- [History](history.md)
- [Knowledge](knowledge.md)
- [Mercury Command Center](mercury-command-center.md)
- Atlas, Vector, Oracle, Sentinel, and Forge production outputs

## Open decisions

- Initial executive metric set and owners.
- Currency and fiscal-calendar rules.
- Report distribution channels.
- Scheduling and snapshot retention.
- Threshold between a brief revision and a new report.

\n