# Demand & Availability Engine

## Status

- **Deployed and publicly verified on 2026-08-13:** snapshot-backed migrations `009` and `010`, generated/custom HTTPS health, protected Oracle route/API behavior, Cognito PKCE initiation, and responsive unauthenticated browser rendering.
- **Implemented:** first-class planning contracts, additive migration `010`, MichaelModel, an independent Oracle forecast, demand-censoring detection, separated inventory buckets, WOS and risk calculations, DF/BTR and MOQ rules, model comparison, value of information, newness review, planner overrides, immutable outcomes, organization-scoped APIs, Mercury context, and the authenticated `/oracle` route.
- **Verified locally:** TypeScript, domain tests, in-process integration, migration dry run, and production build status are recorded in `PROJECT_STATUS.md` after execution.
- **Configured but unverified:** production migration, authenticated database reads/writes, browser behavior, and persisted model/outcome competition remain unverified until the guarded release completes.
- **Planned:** a production demand/inventory provider, Outlook authorization and message retrieval, automated observation collection, calibrated category/SKU priors, provider execution, and purchase-order creation.

## Scientific contract

Demand & Availability never treats a planner rule as truth. Each planning cycle preserves MichaelModel, OracleModel, and an optional naive baseline independently. After observed demand and inventory outcomes arrive, their forecast error, bias, service misses, overbuy, underbuy, and WOS error are scored in the context of category, license, maturity, promotion, season, volatility, and inventory state.

MichaelModel version `2026-08-13.v1` makes the supplied planning method inspectable: higher L6 sales/orders; the configurable 1.33× Lic Kids order ceiling; promo quantity plus 6%; explicit inventory-bucket eligibility; configurable 500/1000 MOQ; coverage horizon; DF and BTR thresholds; lifecycle modifiers; and attributed human overrides. These rules can be versioned and measured.

OracleModel version `2026-08-13.v1` is independent. It weights recent uncensored sales and net orders, discounts large disagreement, incorporates source-attributed category/promo/lifecycle signals, returns uncertainty bounds, and lists assumptions, drivers, and missing evidence. It does not infer unsupported lead times, inventory, seasonality, or cost.

## Evidence boundary

The read model consumes only organization-scoped normalized `demand` and `inventory` records from the Commerce Evidence Layer. With no supported records, the route shows an unavailable state and creates no decisions.

`POST /api/oracle/planning-evidence` is the structured ingestion contract for planning-email facts. It stores message provenance and requires every item to be classified as `OBSERVATION`, `PLANNER_ASSUMPTION`, `PLANNER_RULE`, `PLANNER_OVERRIDE`, `RECOMMENDATION`, or `OUTCOME`. Numeric planner commentary cannot silently become observed fact. This is not an Outlook connector; authorization and message retrieval remain planned.

## Inventory semantics

Amazon OH, Amazon OO, AWC OH, DF, transferable, committed, promo-committed, inbound, and protected inventory remain separate columns and calculation inputs. DF and transferable inventory enter usable inventory only when an explicit rule allows it. Low or intermittent availability marks overlapping sales periods as demand-censored.

## Governance and learning

Oracle planning cases link to canonical Decision Cases. Planning evidence, comparisons, overrides, and outcomes are append-only. Owner/Admin/Manager may approve; Analyst may investigate and measure; Viewer is read-only. Material actions remain proposals until existing approval and execution boundaries authorize and verify them.

Rollback is application-first: redeploy the recorded prior commit while preserving additive tables. Database restoration, if required, uses the pre-Oracle snapshot to a replacement instance before switching `DATABASE_URL`.


## Production release record

Application code merge commit: `18fceaf2d658c814e08a1de3c01a4007c9bc9f18`. Application rollback commit: `9ec115b4d6b41c2a78cef93adb1076652d0dc2e9`. Recovery snapshot: `merchantflare-pre-oracle-20260813`. The snapshot must be restored to a replacement database instance before changing `DATABASE_URL`; additive Oracle tables are not removed during an application rollback.
