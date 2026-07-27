# Forge — Creative Intelligence Specification

**Status:** Planned
**Roadmap stage:** 7
**Canonical route:** `/forge`

## Purpose

Forge identifies creative evidence gaps, produces channel-aware briefs and asset recommendations, manages review, and connects approved creative changes to measured performance.

## Current implementation evidence

Forge currently has navigation metadata, a `creative.brief` capability, a keyword-planning rule, legacy module registration, and deterministic example output. There is no Forge route, asset repository, generation or production workflow, review model, publishing adapter, or performance feedback loop.

## In scope

- Existing asset inventory and channel placement.
- Asset completeness, messaging hierarchy, use-case coverage, and format requirements.
- Evidence-backed creative briefs for image, video, and enhanced content.
- Brand and product-fact constraints.
- Review, versioning, approval, production handoff, and outcome measurement.
- Links to catalog recommendations and product performance.

## Required inputs

Forge MUST consume:

- normalized product and catalog identity;
- current assets and placements;
- channel requirements;
- approved product facts and brand guidance;
- customer, search, and performance evidence when authorized; and
- source and freshness metadata.

Forge MUST NOT invent product claims, certifications, or performance facts.

## Outputs

Forge outputs MUST include:

- creative finding;
- affected product and placement;
- evidence and gap;
- versioned brief;
- required format and channel constraints;
- approved claims and prohibited claims;
- review state and owner;
- produced asset references; and
- measured result with methodology.

## Functional requirements

- Users MUST inspect existing assets and evidence gaps.
- Briefs MUST be versioned and tied to approved facts and source evidence.
- Generated or uploaded assets MUST record provenance and rights metadata.
- Review comments and decisions MUST be durable.
- Publishing or catalog updates MUST use approval and execution contracts.
- Superseded assets and briefs MUST remain in history.
- Performance feedback MUST distinguish correlation from demonstrated lift.

## Experience requirements

The route MUST provide:

- asset coverage overview;
- prioritized creative gaps;
- product and placement detail;
- brief authoring and review;
- asset version and approval state;
- production or publishing handoff; and
- measured creative outcomes.

## Non-goals for the first Forge milestone

- Unreviewed autonomous asset publication.
- Unsupported claims generation.
- A general-purpose digital asset management replacement.
- Performance claims without defined evidence.

## Acceptance criteria

Forge is implemented only when:

- `/forge` is authenticated and organization-scoped;
- assets and placements are ingested from an approved source;
- findings cite product, channel, and performance evidence;
- briefs are versioned and enforce approved facts;
- review and approval history is durable;
- approved outputs use a production execution boundary;
- rights, provenance, and retention are recorded; and
- tests cover authorization, versioning, claim constraints, and approval.

## Dependencies

- [Platform contracts](platform-contracts.md)
- [Atlas](atlas.md)
- [Knowledge](knowledge.md)
- [Integrations](integrations.md)
- [Approvals](approvals.md)
- [History](history.md)

## Open decisions

- First supported asset sources and publishing channels.
- Whether generation is in the initial milestone.
- Brand-guideline and approved-claims data model.
- Asset storage, rights, and retention policy.
- Creative measurement methodology.

\n