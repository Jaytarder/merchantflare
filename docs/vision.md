# Product Vision

## What MerchantFlare is

MerchantFlare is an **Amazon-first Scientific Decision Platform for commerce**.

Its purpose is to reduce uncertainty, improve decision quality, and learn from measured outcomes. The platform connects commerce evidence, competing explanations, governed interventions, and observed results in a durable decision record.

MerchantFlare is not a generic chatbot, an AI workforce, an agent marketplace, or another dashboard. Large language models are replaceable components. The product value is the decision system around them.

The public domain is `merchantflare.com`.

## Core promise

Every material recommendation should answer:

- What do we know?
- What do we currently believe?
- What evidence supports that belief?
- What evidence contradicts it?
- How confident are we?
- What would change our mind?
- What reversible test should happen next?
- What actually happened after the intervention?
- How should that outcome update future decisions?

The platform must distinguish projected impact from measured impact and correlation from causation.

## Decision Lab

**Decision Lab** is the primary workspace.

It should help operators:

- define a business problem or objective;
- inspect observed evidence and freshness;
- compare competing hypotheses;
- surface supporting and opposing evidence;
- identify assumptions, missing evidence, and confounders;
- choose a measurable intervention;
- route material changes through approval policies;
- record execution and outcomes; and
- update the organization’s reusable decision knowledge.

Conversation remains available inside each Decision Case, but chat is not the canonical application object.

## Canonical Decision Case

A Decision Case contains, where available:

1. problem or objective;
2. observed evidence;
3. current belief;
4. competing hypotheses;
5. supporting evidence;
6. counter-evidence;
7. confidence and freshness;
8. assumptions and confounders;
9. proposed experiment or intervention;
10. risk and reversibility;
11. approval requirements;
12. measured outcome;
13. updated belief; and
14. reusable lesson.

Evidence should be graded honestly as:

- observed;
- correlated;
- controlled;
- quasi-causal;
- experimental; or
- replicated.

## Capability areas

MerchantFlare organizes work through functional capability areas rather than anthropomorphic agents:

| Capability area | Responsibility |
| --- | --- |
| Catalog Diagnostics | Product content, discoverability, structure, conversion friction, and catalog interventions |
| Media Diagnostics | Advertising efficiency, targeting, bids, budgets, incrementality, and media interventions |
| Demand & Availability | Forecasting, inventory exposure, replenishment, and availability decisions |
| Risk & Compliance | Policy, documentation, suppression, account-health, and operational risk |
| Creative Experiments | Creative hypotheses, asset changes, controlled tests, and measured creative outcomes |
| Executive Outcomes | Cross-functional synthesis, decision quality, priorities, and measured business impact |

Legacy internal names may remain temporarily for compatibility, but new user-facing work should use the functional capability names above.

## Product principles

### Evidence before assertion

Important claims must be traceable to observable evidence, source, freshness, and ownership.

### Challenge every belief

The platform must surface counter-evidence and state what would change the conclusion.

### Reduce uncertainty

MerchantFlare optimizes for better decisions, not more AI output.

### Experiment before automation

Prefer reversible, measurable interventions over opaque action. High-risk or irreversible changes require stronger evidence and explicit approval.

### Outcome accountability

Every completed intervention should create an outcome record that can strengthen, weaken, or leave unchanged the underlying belief.

### Calibrated confidence

Confidence is not decoration. If the platform repeatedly claims 80% confidence, approximately 80% of comparable, well-defined predictions should succeed under the stated criteria.

### Governed execution

Material changes require policy checks, approvals, audit history, ownership, and clear separation between proposed, approved, executed, and validated states.

### Human capability growth

MerchantFlare is designed to automate tasks, not eliminate people. The product should increase judgment, explain reasoning, and help teams redeploy time toward higher-value work.

### Privacy by design

Customer data remains organization-scoped unless explicit permission permits aggregated learning. Isolation commitments must be treated as absolute.

### No attachment to ideas

Product claims, architecture, and strategy must change when evidence contradicts them.

## Canonical navigation

- Decision Lab
- Diagnostics
  - Catalog Diagnostics
  - Media Diagnostics
  - Demand & Availability
  - Risk & Compliance
  - Creative Experiments
  - Executive Outcomes
- Experiments
- Approvals
- Decision History
- Evidence
- Integrations
- Billing
- Settings

Navigation configuration may precede route implementation. A navigation entry does not prove that the destination is complete.

## Language guardrails

Use:

- Scientific Decision Platform
- Decision Lab
- Decision Case
- evidence
- belief
- competing hypothesis
- counter-evidence
- confidence
- assumption
- confounder
- experiment
- intervention
- approval
- outcome
- reusable lesson

Avoid:

- AI workforce
- AI worker
- autonomous employee
- collection of AI agents
- AI operating system
- “replace your team” positioning
- causal claims unsupported by controlled evidence

Some existing source files, routes, database fields, and application surfaces retain legacy terminology. Treat that as migration debt and preserve compatibility until a dedicated migration updates the entire boundary safely.
