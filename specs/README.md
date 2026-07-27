# MerchantFlare Specifications

These specifications define the expected product behavior and engineering acceptance criteria for MerchantFlare. They are implementation contracts, not evidence that a feature exists.

## How to use this directory

Read these sources together:

1. [`AGENTS.md`](../AGENTS.md) governs engineering work.
2. [`docs/vision.md`](../docs/vision.md) defines the product and language.
3. [`docs/architecture.md`](../docs/architecture.md) defines architectural direction and current boundaries.
4. [`docs/roadmap.md`](../docs/roadmap.md) defines delivery order.
5. [`PROJECT_STATUS.md`](../PROJECT_STATUS.md) records verified implementation status.
6. This directory defines requirements and completion criteria.

If a specification describes target behavior that is absent from the code, the feature remains planned or scaffolded. A specification never changes implementation status by itself.

## Status model

Every specification uses one of these statuses:

- **Implemented:** the core experience is wired into the application and satisfies the listed implemented acceptance criteria.
- **Scaffolded:** meaningful types, services, routes, schemas, or UI fragments exist, but no complete production workflow exists.
- **Planned:** no substantive end-to-end implementation exists.

Static data, navigation configuration, legacy prototypes, deterministic example output, and database types do not make a feature implemented.

## Specification index

| Specification | Current status | Scope |
| --- | --- | --- |
| [Platform contracts](platform-contracts.md) | Scaffolded | Shared tenancy, evidence, status, security, data, accessibility, and operational requirements |
| [Application shell](application-shell.md) | Implemented | Responsive authenticated application frame and navigation |
| [Mercury Command Center](mercury-command-center.md) | Scaffolded | Primary conversational Commerce Intelligence workspace |
| [Atlas](atlas.md) | Planned | Catalog Intelligence |
| [Vector](vector.md) | Planned | Advertising Intelligence |
| [Oracle](oracle.md) | Planned | Demand Intelligence |
| [Sentinel](sentinel.md) | Planned | Compliance Intelligence |
| [Forge](forge.md) | Planned | Creative Intelligence |
| [Pulse](pulse.md) | Planned | Executive Intelligence |
| [Execution](execution.md) | Scaffolded | Governed action lifecycle |
| [Approvals](approvals.md) | Scaffolded | Material-action review and decision records |
| [History](history.md) | Scaffolded | Conversations, plans, decisions, execution, and outcomes |
| [Knowledge](knowledge.md) | Planned | Governed business context and evidence |
| [Integrations](integrations.md) | Scaffolded | Provider connection, sync, and health management |
| [Billing](billing.md) | Planned | Subscription, entitlement, usage, and invoice experience |
| [Settings](settings.md) | Planned | Organization, access, policy, and preference management |
| [Mercury orchestration engine](mercury-orchestration-engine.md) | Scaffolded | Planning, routing, approval, execution, recovery, and outcomes |

## Shared delivery rules

All feature work must:

- preserve MerchantFlare’s Commerce Intelligence positioning;
- distinguish recommendation, approval, execution, and measured outcome;
- identify the source and freshness of displayed commerce data;
- avoid presenting sample data as connected data;
- enforce authorization at server boundaries;
- use durable identifiers and idempotent mutation contracts;
- provide loading, empty, error, unavailable, and permission-denied states;
- meet the accessibility and responsive requirements in [`docs/design-system.md`](../docs/design-system.md);
- add observability without logging credentials or sensitive provider payloads; and
- update implementation status only after the acceptance criteria are verified.

## Open product decisions

These decisions affect more than one specification and must be resolved before their dependent milestones:

1. Organization and marketplace tenancy model, including whether one user may access multiple organizations.
2. Initial identity approach and the migration boundary from the current administrator cookie to Cognito.
3. First supported Amazon account model: Seller, Vendor, or both.
4. System of record for normalized commerce facts and metric definitions.
5. Evidence retention, provider-payload retention, and regional data residency requirements.
6. Default approval policy ownership and whether approval is task-level, plan-level, or both.
7. Canonical execution model and queue technology for the orchestration engine.
8. Subscription tiers, metered dimensions, and entitlement behavior.
9. Which module is the first production module after Mercury.

\n