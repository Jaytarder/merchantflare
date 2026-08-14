# Media and Supply Joint Decision Engine

## Implemented

Migration `011_vector_joint_decision_engine.sql` adds organization-scoped advertising models, approved Christian-report facts, canonical product identities, advertising evidence, forecasts, proposed interventions, joint cases, safe demand envelopes, possible futures, dependency events, epistemic graph edges, outcomes, and per-model performance records. Historical reports, forecasts, dependency events, outcomes, and performance records are append-only.

`lib/vector/` implements evidence-derived advertising metrics, an explicit Christian Advertising Model, Vector recommendations, Safe Demand Envelopes, Oracle–Vector coordination, disagreement preservation, causal-neighborhood labels, cross-domain invalidation events, canonical identity checks, and model-specific outcome error. Unknown contribution, margin, incrementality, product identity, or replenishment inputs remain unavailable.

The authenticated `/vector` compatibility route is labeled Media Diagnostics and presents coordinated work rather than an advertising dashboard. `GET /api/vector/assessment` evaluates normalized organization evidence. Write boundaries ingest approved Teikametrics facts, propose approval-gated joint interventions, and record immutable outcomes. Mercury attaches the same joint assessment to advertising or inventory plans.

## Verified

TypeScript, 80 unit tests, five focused integration tests, the 11-migration dry run, the Next.js production build, and `git diff --check` passed on 2026-08-13. These checks cover independent Vector metrics, Christian ingestion and idempotency, inventory constraints, demand envelopes, possible futures, dependency invalidation, entity isolation, RBAC, outcomes, migration safety, and the existing Decision Platform and Oracle lifecycle.

## Planned

No Amazon Ads reader, Outlook connector, contribution-margin source, or provider mutation adapter is connected. Product-resolved advertising evidence must be ingested before a live joint decision can exist. Production migration and browser smoke status are recorded separately in `PROJECT_STATUS.md`; a schema or empty state is not proof of a live integration.

## Decision rules

- Material advertising acceleration is never a Vector-only final recommendation.
- Inventory change invalidates dependent Vector recommendations; advertising change invalidates dependent Oracle forecasts.
- Epistemic edges default to observed, assumed, or inferred. Experimental and replicated labels require linked evidence.
- The joint objective may rank contribution, inventory health, risk, efficiency, cash exposure, and learning value, but it never populates unavailable economics.
- Human approval records authority; it does not imply provider execution.
