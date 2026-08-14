#!/usr/bin/env bash
set -euo pipefail

REGION="us-east-1"
INSTANCE="merchantflare-dev"
SNAPSHOT="merchantflare-pre-vector-joint-20260814"
BRANCH="agent/vector-joint-decision-engine"
ROLLBACK_COMMIT="491b69f27feeba387d9ebb56e063ca935e39388a"
EXPECTED_011="626deed03bbda224cca92536039d2d315229f6878c4c0455387c5a9eb53042a2"
export EXPECTED_011

for command_name in aws git node npm python3; do command -v "$command_name" >/dev/null || { echo "STOP: $command_name is unavailable."; exit 1; }; done
echo "AWS identity: $(aws sts get-caller-identity --query Arn --output text)"
echo "Rollback application commit: $ROLLBACK_COMMIT"

if aws rds describe-db-snapshots --region "$REGION" --db-snapshot-identifier "$SNAPSHOT" >/dev/null 2>&1; then
  echo "Snapshot $SNAPSHOT exists; waiting for availability."
else
  aws rds create-db-snapshot --region "$REGION" --db-instance-identifier "$INSTANCE" --db-snapshot-identifier "$SNAPSHOT" >/dev/null
  echo "Created snapshot $SNAPSHOT."
fi
aws rds wait db-snapshot-available --region "$REGION" --db-snapshot-identifier "$SNAPSHOT"
echo "Snapshot gate passed: $SNAPSHOT is available."

WORKDIR="$(mktemp -d)"; trap 'unset DATABASE_URL; rm -rf -- "$WORKDIR"' EXIT
git clone --quiet --depth 1 --branch "$BRANCH" https://github.com/Jaytarder/merchantflare.git "$WORKDIR/merchantflare"
cd "$WORKDIR/merchantflare"

IFS=$'\t' read -r DB_HOST DB_PORT DB_NAME < <(aws rds describe-db-instances --region "$REGION" --db-instance-identifier "$INSTANCE" --query 'DBInstances[0].[Endpoint.Address,Endpoint.Port,DBName]' --output text)
test -n "$DB_HOST" && test "$DB_HOST" != "None" && test -n "$DB_PORT" || { echo "STOP: RDS metadata is incomplete."; exit 1; }

find_database_url() {
  local app_id candidate branch_name
  while IFS= read -r app_id; do
    candidate="$(aws amplify get-app --region "$REGION" --app-id "$app_id" --query 'app.environmentVariables.DATABASE_URL' --output text 2>/dev/null || true)"
    if test -n "$candidate" && test "$candidate" != "None"; then printf '%s' "$candidate"; return 0; fi
    while IFS= read -r branch_name; do
      candidate="$(aws amplify get-branch --region "$REGION" --app-id "$app_id" --branch-name "$branch_name" --query 'branch.environmentVariables.DATABASE_URL' --output text 2>/dev/null || true)"
      if test -n "$candidate" && test "$candidate" != "None"; then printf '%s' "$candidate"; return 0; fi
    done < <(aws amplify list-branches --region "$REGION" --app-id "$app_id" --query 'branches[].branchName' --output text | tr '\t' '\n')
  done < <(aws amplify list-apps --region "$REGION" --query "apps[?name=='merchantflare'].appId" --output text | tr '\t' '\n')
  return 1
}
DATABASE_URL="$(find_database_url || true)"; test -n "$DATABASE_URL" || { echo "STOP: Amplify DATABASE_URL was not accessible."; exit 1; }; export DATABASE_URL
DATABASE_URL="$DATABASE_URL" EXPECTED_HOST="$DB_HOST" EXPECTED_PORT="$DB_PORT" EXPECTED_DB="$DB_NAME" python3 -c '
import os,sys,urllib.parse
u=urllib.parse.urlparse(os.environ["DATABASE_URL"])
ok=(u.scheme in ("postgres","postgresql") and (u.hostname or "").lower()==os.environ["EXPECTED_HOST"].lower() and (u.port or 5432)==int(os.environ["EXPECTED_PORT"]) and urllib.parse.unquote(u.path.lstrip("/"))==os.environ["EXPECTED_DB"])
sys.exit(0 if ok else 1)' || { echo "STOP: DATABASE_URL does not match $INSTANCE."; exit 1; }

npm install --silent
DRY_RUN="$(npm run migrate:dry-run)"; printf '%s\n' "$DRY_RUN"
grep -q "011_vector_joint_decision_engine.sql $EXPECTED_011" <<<"$DRY_RUN" || { echo "STOP: migration 011 checksum mismatch."; exit 1; }
NODE_ENV=production npm run migrate

node - <<'NODE'
const postgres=require("postgres"); const sql=postgres(process.env.DATABASE_URL,{ssl:"require",max:1});
(async()=>{
 const rows=await sql`select name,checksum from merchantflare_schema_migrations where name=${"011_vector_joint_decision_engine.sql"}`;
 if(rows.length!==1||rows[0].checksum!==process.env.EXPECTED_011)throw new Error("Applied checksum mismatch for migration 011.");
 const tables=await sql`select tablename from pg_tables where schemaname=current_schema() and (tablename like 'vector_%' or tablename like 'joint_%')`;
 if(tables.length!==14)throw new Error(`Expected 14 Vector/Joint tables; found ${tables.length}.`);
 const indexes=await sql`select indexname from pg_indexes where schemaname=current_schema() and indexname in (${"vector_evidence_org_product_period_idx"},${"vector_forecast_org_product_idx"},${"vector_intervention_org_status_idx"},${"joint_case_org_status_idx"},${"joint_dependency_target_idx"},${"joint_outcome_org_observed_idx"},${"joint_performance_org_model_idx"})`;
 if(indexes.length!==7)throw new Error("Vector/Joint indexes are missing.");
 const triggers=await sql`select tgname from pg_trigger where not tgisinternal and tgname in (${"vector_christian_reports_immutable"},${"vector_forecasts_immutable"},${"joint_dependency_events_immutable"},${"joint_outcomes_immutable"},${"joint_model_performance_immutable"})`;
 if(triggers.length!==5)throw new Error("Vector/Joint append-only triggers are missing.");
 console.log("VERIFIED: migration 011, 14 Vector/Joint tables, 7 indexes, and 5 append-only triggers."); await sql.end();
})().catch(async e=>{console.error(`FAILED: ${e.message}`);try{await sql.end()}catch{}process.exit(1)});
NODE
echo "SUCCESS: snapshot $SNAPSHOT is available; migration 011 is verified on $INSTANCE."
