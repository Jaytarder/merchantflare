#!/usr/bin/env bash
set -euo pipefail

REGION="us-east-1"
INSTANCE="merchantflare-dev"
SNAPSHOT="merchantflare-pre-oracle-20260813"
BRANCH="agent/oracle-planning-engine"
ROLLBACK_COMMIT="9ec115b4d6b41c2a78cef93adb1076652d0dc2e9"
EXPECTED_009="fe0a97787e841b08689954720700f934e89a933320301b874f512ad5f18b2475"
EXPECTED_010="9cb94a313ae484708f7d8dc2b9c8166144f875690454770d412cb98876f10555"
export EXPECTED_009 EXPECTED_010

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
grep -q "009_scientific_reasoning_engine.sql $EXPECTED_009" <<<"$DRY_RUN" || { echo "STOP: migration 009 checksum mismatch."; exit 1; }
grep -q "010_oracle_planning_engine.sql $EXPECTED_010" <<<"$DRY_RUN" || { echo "STOP: migration 010 checksum mismatch."; exit 1; }
NODE_ENV=production npm run migrate

node - <<'NODE'
const postgres=require("postgres"); const sql=postgres(process.env.DATABASE_URL,{ssl:"require",max:1});
(async()=>{
 const rows=await sql`select name,checksum from merchantflare_schema_migrations where name in (${"009_scientific_reasoning_engine.sql"},${"010_oracle_planning_engine.sql"}) order by name`;
 const expected=new Map([["009_scientific_reasoning_engine.sql",process.env.EXPECTED_009],["010_oracle_planning_engine.sql",process.env.EXPECTED_010]]);
 for(const [name,checksum] of expected){const row=rows.find(item=>item.name===name);if(!row||row.checksum!==checksum)throw new Error(`Applied checksum mismatch for ${name}.`)}
 const tables=await sql`select tablename from pg_tables where schemaname=current_schema() and tablename like 'oracle_%'`;
 if(tables.length!==12)throw new Error(`Expected 12 Oracle tables; found ${tables.length}.`);
 const indexes=await sql`select indexname from pg_indexes where schemaname=current_schema() and indexname in (${"oracle_planning_cases_attention_idx"},${"oracle_demand_signals_product_time_idx"},${"oracle_inventory_positions_case_time_idx"},${"oracle_forecasts_case_model_time_idx"},${"oracle_options_case_rank_idx"},${"oracle_outcomes_context_time_idx"})`;
 if(indexes.length!==6)throw new Error("Oracle indexes are missing.");
 const triggers=await sql`select tgname from pg_trigger where not tgisinternal and tgname in (${"oracle_planning_evidence_immutable"},${"oracle_forecast_comparisons_immutable"},${"oracle_planner_overrides_immutable"},${"oracle_planning_outcomes_immutable"})`;
 if(triggers.length!==4)throw new Error("Oracle append-only triggers are missing.");
 console.log("VERIFIED: migrations 009 and 010, 12 Oracle tables, 6 indexes, and 4 append-only triggers."); await sql.end();
})().catch(async e=>{console.error(`FAILED: ${e.message}`);try{await sql.end()}catch{}process.exit(1)});
NODE
echo "SUCCESS: snapshot $SNAPSHOT is available; migrations 009 and 010 are verified on $INSTANCE."
