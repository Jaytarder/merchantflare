# Integrations Specification

**Status:** Scaffolded
**Roadmap stage:** 9 for live Amazon integrations
**Canonical route:** `/integrations`

## Purpose

Integrations connect MerchantFlare to commerce and business systems through secure authorization, observable synchronization, normalized data, and truthful health reporting.

## Current implementation evidence

- Navigation and static sidebar statuses exist.
- `commerce_integrations` stores provider, marketplace, status, credential reference, configuration, and last sync metadata.
- `lib/amazon/sp-api.ts` implements Login with Amazon refresh-token exchange and a marketplace participation request helper.
- The helper is not wired to a route or UI and does not demonstrate the complete production authentication/signing lifecycle.
- Amazon Ads, connection management, secret storage, sync jobs, normalized data models, and live health do not exist.

## Connection lifecycle

```tex
disconnected
  -> authorizing
  -> connected
  -> syncing
  -> connected | attention
  -> disconnected
```

Revoked and expired authorization MUST become `attention` or `disconnected` based on recoverability. Static configuration MUST not create a connected state.

## Functional requirements

- Users with permission MUST connect, inspect, reauthorize, and disconnect providers.
- OAuth or provider authorization MUST use state/nonce protection and server-side callbacks.
- Credentials MUST be encrypted through approved secret management; database rows SHOULD store references, not raw secrets.
- A connection MUST identify organization, provider, account, marketplace, scopes, status, and timestamps.
- Sync jobs MUST be incremental where supported, idempotent, rate-limit aware, and resumable.
- Provider payloads MUST map into versioned normalized contracts.
- Health MUST derive from authorization, recent syncs, error state, and freshness objectives.
- Disconnect MUST define credential revocation and retained-data behavior.
- Backfills MUST be bounded and observable.

## Amazon requirements

The live Amazon milestone MUST include:

- complete SP-API request authentication and supported account authorization;
- Amazon Ads authorization and API client;
- marketplace and profile discovery;
- credential rotation and reauthorization;
- production sync jobs for the first approved datasets;
- throttling, retry, and error classification;
- normalized identity across catalog, advertising, demand, and compliance data; and
- accurate connection and freshness health.

## Experience requirements

- `/integrations` MUST show configured providers and factual status.
- Detail MUST show accounts, marketplaces, scopes, last successful sync, current job, freshness, and actionable errors.
- Setup MUST explain requested access before authorization.
- Disconnect MUST disclose data and workflow impact.
- Sample providers MUST not appear connected.

## Acceptance criteria

Integrations are implemented for a provider only when:

- connection and reauthorization work through production authorization;
- credentials are stored securely;
- at least one production dataset synchronizes idempotently;
- normalized records retain provenance and timestamps;
- health reflects actual authorization and sync state;
- throttling, retry, restart, revoke, and disconnect behavior are tested;
- UI and APIs enforce organization authorization; and
- logs and metrics support provider incident diagnosis.

## Open decisions

- Seller, Vendor, or both for the first SP-API release.
- First marketplaces and datasets.
- AWS secret-management service.
- Sync scheduler and queue.
- Raw payload retention and replay policy.
- Disconnect deletion policy.

\n