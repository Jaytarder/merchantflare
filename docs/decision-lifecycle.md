# Decision Lifecycle

## Implemented

The persisted state machine is `draft → investigating → proposed → approved → running → measuring → closed`, with `archived` available as a terminal state. Transitions use optimistic concurrency and append Decision History. Readiness guards require evidence before investigation, a belief and two competing hypotheses before proposal, an approved experiment before approval, an executed intervention before measurement, and an outcome plus lesson before closure.

Creating an experiment freezes its belief confidence, timestamp, and success criteria in an immutable prediction. Recording an outcome is one transaction: resolve the prediction, version confidence and belief, persist outcome and lesson, complete the experiment, and append outcome and lesson history. A concurrent belief update or already resolved prediction aborts the transaction.

Approval and execution are separate. The execution endpoint accepts only an organization-matched experiment and intervention, requires approval or an explicitly not-required policy result, and uses an organization-scoped idempotency key. Provider execution is rejected until an authenticated Atlas publisher exists.

## Verified

- Transition ordering, skipped-state rejection, immutable migration rules, prediction uniqueness, and execution idempotency are covered by automated tests.
- Migration dry-run validates checksums through `008`.

## Planned or blocked

- Real PostgreSQL race, rollback, constraint, and tenant-isolation tests require the isolated development database.
- Provider execution, rollback execution, automated observation collection, and semantic lesson matching are planned.

After independently verifying the target and taking a recoverable snapshot, apply with `DATABASE_URL` set via `npm run migrate`. Then run `npm run test:integration:db` with `DECISION_DB_CONFIRMATION=isolated-development` and `DECISION_DB_EXPECTED_NAME` set to the exact connected database name. The verifier checks applied checksums, required indexes, tenant constraints, approval replay, immutable history and predictions, and transaction rollback; its fixture is rolled back.
