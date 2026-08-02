import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");
if (process.env.DECISION_DB_CONFIRMATION !== "isolated-development") {
  throw new Error("Refusing database integration checks without DECISION_DB_CONFIRMATION=isolated-development.");
}
const expectedName = process.env.DECISION_DB_EXPECTED_NAME;
if (!expectedName) throw new Error("DECISION_DB_EXPECTED_NAME is required.");

const client = postgres(connectionString, { max: 4, connect_timeout: 10, ssl: process.env.NODE_ENV === "production" ? "require" : undefined });
const rollbackMarker = new Error("rollback verified fixture");
const fixture = `decision_verify_${randomUUID().replaceAll("-", "")}`;
const orgA = `${fixture}_a`;
const orgB = `${fixture}_b`;
const caseA = randomUUID();
const caseB = randomUUID();
const beliefId = randomUUID();
const hypothesisId = randomUUID();
const experimentId = randomUUID();
const interventionId = randomUUID();
const predictionId = randomUUID();
const historyId = randomUUID();

async function checksum(name: string) {
  const sql = (await readFile(resolve("db", "migrations", name), "utf8")).replace(/\r\n?/g, "\n");
  return createHash("sha256").update(sql).digest("hex");
}

async function expectRejected(operation: () => Promise<unknown>, label: string) {
  let rejected = false;
  try { await operation(); } catch { rejected = true; }
  if (!rejected) throw new Error(`${label} was not rejected.`);
}

async function main() {
try {
  const identity = await client<Array<{ database_name: string; server_address: string | null }>>`
    select current_database() as database_name, inet_server_addr()::text as server_address
  `;
  if (identity[0].database_name !== expectedName) {
    throw new Error(`Connected database ${identity[0].database_name} does not match DECISION_DB_EXPECTED_NAME.`);
  }
  console.log(`Verified isolated target database ${identity[0].database_name} at ${identity[0].server_address ?? "local socket"}.`);

  for (const name of ["007_scientific_decision_platform.sql", "008_decision_learning_engine.sql"]) {
    const rows = await client<Array<{ checksum: string }>>`
      select checksum from merchantflare_schema_migrations where name = ${name}
    `;
    if (rows[0]?.checksum !== await checksum(name)) throw new Error(`${name} is missing or its applied checksum differs.`);
  }

  const requiredIndexes = ["decision_cases_org_updated_idx", "decision_predictions_org_time_idx", "decision_executions_org_case_idx", "decision_lesson_reuse_org_time_idx"];
  const indexes = await client<Array<{ indexname: string }>>`
    select indexname from pg_indexes where schemaname = current_schema() and indexname = any(${requiredIndexes})
  `;
  if (indexes.length !== requiredIndexes.length) throw new Error("Required Decision Platform indexes are missing.");

  try {
    await client.begin(async (tx) => {
      await tx`insert into platform_organizations (id, slug, name, created_by) values (${orgA}, ${orgA}, 'Decision verify A', ${fixture}), (${orgB}, ${orgB}, 'Decision verify B', ${fixture})`;
      await tx`insert into decision_cases (id, organization_id, created_by, title, problem, objective) values (${caseA}, ${orgA}, ${fixture}, 'Fixture A', 'Problem', 'Objective'), (${caseB}, ${orgB}, ${fixture}, 'Fixture B', 'Problem', 'Objective')`;

      await expectRejected(
        () => tx.savepoint((save) => save`insert into decision_evidence (organization_id, decision_case_id, source, statement, observed_at, freshness, owner_id, confidence, evidence_grade) values (${orgB}, ${caseA}, 'fixture', 'cross tenant', now(), 'current', ${fixture}, 0.5, 'observed')`),
        "Cross-tenant evidence",
      );

      await tx`insert into decision_beliefs (id, organization_id, decision_case_id, statement, confidence, what_would_change, owner_id) values (${beliefId}, ${orgA}, ${caseA}, 'Fixture belief', 0.6, 'Contradictory controlled result', ${fixture})`;
      await tx`update decision_cases set current_belief_id = ${beliefId} where id = ${caseA} and organization_id = ${orgA}`;
      await tx`insert into decision_hypotheses (id, organization_id, decision_case_id, statement, likelihood, confidence, estimated_risk, created_by) values (${hypothesisId}, ${orgA}, ${caseA}, 'Fixture hypothesis', 0.6, 0.6, 'low', ${fixture})`;
      await tx`insert into decision_experiments (id, organization_id, decision_case_id, hypothesis_id, title, expected_risk, observation_window, rollback_plan, success_criteria, approval_status, status, created_by) values (${experimentId}, ${orgA}, ${caseA}, ${hypothesisId}, 'Fixture experiment', 'low', '{"durationDays":1}', 'rollback', '[{"metric":"fixture","operator":"gte","value":1}]', 'pending', 'awaiting_approval', ${fixture})`;
      await tx`insert into decision_interventions (id, organization_id, experiment_id, description, exact_intent, reversibility, rollback_plan, created_by) values (${interventionId}, ${orgA}, ${experimentId}, 'Fixture intervention', '{}', 'easy', 'rollback', ${fixture})`;
      await tx`insert into decision_predictions (id, organization_id, decision_case_id, belief_id, experiment_id, confidence, predicted_at, success_criteria, created_by) values (${predictionId}, ${orgA}, ${caseA}, ${beliefId}, ${experimentId}, 0.6, now(), '[{"metric":"fixture","operator":"gte","value":1}]', ${fixture})`;

      const firstApproval = await tx`update decision_experiments set approval_status = 'approved', status = 'approved' where id = ${experimentId} and organization_id = ${orgA} and approval_status = 'pending' returning id`;
      const duplicateApproval = await tx`update decision_experiments set approval_status = 'rejected' where id = ${experimentId} and organization_id = ${orgA} and approval_status = 'pending' returning id`;
      if (firstApproval.count !== 1 || duplicateApproval.count !== 0) throw new Error("Approval race predicate failed.");

      await tx`insert into decision_history_events (id, organization_id, decision_case_id, actor_id, event_type, entity_type, entity_id, summary) values (${historyId}, ${orgA}, ${caseA}, ${fixture}, 'fixture.created', 'decision_case', ${caseA}, 'fixture')`;
      await expectRejected(() => tx.savepoint((save) => save`update decision_history_events set summary = 'mutated' where id = ${historyId}`), "History mutation");

      await tx`update decision_predictions set succeeded = true, posterior_confidence = 0.7, resolved_at = now() where id = ${predictionId}`;
      await expectRejected(() => tx.savepoint((save) => save`update decision_predictions set posterior_confidence = 0.8 where id = ${predictionId}`), "Resolved prediction mutation");
      throw rollbackMarker;
    });
  } catch (error) {
    if (error !== rollbackMarker) throw error;
  }

  const residue = await client<Array<{ count: number }>>`select count(*)::int as count from platform_organizations where id in (${orgA}, ${orgB})`;
  if (residue[0].count !== 0) throw new Error("Transaction rollback left fixture data behind.");
  console.log("Verified checksums, indexes, tenant isolation, approval race guard, append-only history, prediction immutability, and transaction rollback.");
} finally {
  await client.end();
}
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Decision database verification failed.");
  process.exitCode = 1;
});
