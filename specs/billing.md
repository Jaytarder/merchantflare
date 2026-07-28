# Billing Specification

**Status:** Scaffolded
**Canonical route:** `/billing`

## Purpose

Billing manages subscription state, entitlements, usage visibility, invoices, and payment workflows without granting access based only on client-side state.

## Current implementation evidence

Billing navigation exists. Migration `006_platform_core.sql` adds versioned plans and entitlements, organization subscriptions, optional Stripe customer/subscription identifiers, organization overrides, and an effective-entitlement projection. `lib/platform/billing.ts` evaluates entitlements only from trusted trialing or active subscription state, gives explicit organization overrides precedence, and exposes a permission-enforced organization subscription read service through `GET /api/platform/billing`.

There is no Stripe dependency, customer synchronization, signed webhook, checkout or portal route, plan catalog seed, usage metering, invoice UI, `/billing` page, or broad feature entitlement enforcement. The sidebar truthfully remains “Not configured.”

## Functional requirements

- Each billable organization MUST map durably to a Stripe customer.
- Plans, prices, entitlements, and metered dimensions MUST be versioned.
- Checkout and billing-portal sessions MUST be created server-side.
- Webhooks MUST verify signatures, be idempotent, and retain processing state.
- Entitlements MUST derive from trusted server state.
- Subscription transitions MUST define trial, active, past-due, paused, cancelled, and grace behavior.
- Usage MUST be explainable and reconciled before billing.
- Invoice and payment information MUST come from Stripe or a verified local projection.
- Billing administrators MUST be separately authorized.

## Experience requirements

- `/billing` MUST show current plan, status, entitlements, usage, renewal, and invoices.
- Payment management MUST use Stripe-hosted or compliant components.
- Failed payment and grace states MUST explain product impact.
- Plan changes MUST show effective timing and pricing consequences.
- The UI MUST not claim Stripe is connected before verified configuration and webhook health.

## Acceptance criteria

Billing is complete only when:

- organization/customer mapping is durable;
- signed idempotent webhooks synchronize subscription state;
- server-side entitlements protect relevant APIs;
- checkout, portal, invoices, and failure states work;
- metered usage reconciles to auditable source events where used;
- authorization and webhook replay tests pass; and
- operational alerts cover webhook failures and state drift.

## Open decisions

- Plans, prices, trials, and included entitlements.
- Metered dimensions and source events.
- Grace-period and cancellation behavior.
- Tax, currency, and supported billing countries.
- Which roles may view and change billing.

\n
