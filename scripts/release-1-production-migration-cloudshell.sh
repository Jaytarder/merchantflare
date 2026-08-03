#!/usr/bin/env bash
set -euo pipefail

REGION="us-east-1"
INSTANCE="merchantflare-dev"
SNAPSHOT="merchantflare-pre-release-1-20260803"
BRANCH="release/scientific-decision-platform-1.0"
EXPECTED_009="fe0a97787e841b08689954720700f934e89a933320301b874f512ad5f18b2475"
export EXPECTED_009

for command_name in aws git jq node npm python3; do
  command -v "$command_name" >/dev/null || { echo "STOP: $command_name is unavailable."; exit 1; }
done

echo "AWS identity: $(aws sts get-caller-identity --query Arn --output text)"

if aws rds describe-db-snapshots --region "$REGION" --db-snapshot-identifier "$SNAPSHOT" >/dev/null 2>&1; then
  echo "Snapshot $SNAPSHOT already exists; waiting for availability."
else
  aws rds create-db-snapshot --region "$REGION" --db-instance-identifier "$INSTANCE" \
    --db-snapshot-identifier "$SNAPSHOT" >/dev/null
  echo "Created snapshot $SNAPSHOT."
fi
aws rds wait db-snapshot-available --region "$REGION" --db-snapshot-identifier "$SNAPSHOT"
echo "Snapshot gate passed: $SNAPSHOT is available."

WORKDIR="$(mktemp -d)"
trap 'unset DATABASE_URL; rm -rf -- "$WORKDIR"' EXIT
git clone --quiet --depth 1 --branch "$BRANCH" https://github.com/Jaytarder/merchantflare.git "$WORKDIR/merchantflare"
cd "$WORKDIR/merchantflare"

IFS=$'\t' read -r DB_HOST DB_PORT DB_NAME < <(aws rds describe-db-instances --region "$REGION" \
  --db-instance-identifier "$INSTANCE" --query 'DBInstances[0].[Endpoint.Address,Endpoint.Port,DBName]' --output text)
test -n "$DB_HOST" && test "$DB_HOST" != "None" && test -n "$DB_PORT" || { echo "STOP: RDS target metadata is incomplete."; exit 1; }

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

DATABASE_URL="$(find_database_url || true)"
test -n "$DATABASE_URL" || { echo "STOP: Amplify DATABASE_URL was not accessible."; exit 1; }
export DATABASE_URL

DATABASE_URL="$DATABASE_URL" EXPECTED_HOST="$DB_HOST" EXPECTED_PORT="$DB_PORT" EXPECTED_DB="$DB_NAME" python3 -c '
import os,sys,urllib.parse
u=urllib.parse.urlparse(os.environ["DATABASE_URL"])
ok=(u.scheme in ("postgres","postgresql") and (u.hostname or "").lower()==os.environ["EXPECTED_HOST"].lower() and (u.port or 5432)==int(os.environ["EXPECTED_PORT"]) and urllib.parse.unquote(u.path.lstrip("/"))==os.environ["EXPECTED_DB"])
sys.exit(0 if ok else 1)' || { echo "STOP: DATABASE_URL does not match $INSTANCE."; exit 1; }

npm install --silent
DRY_RUN="$(npm run migrate:dry-run)"
printf '%s\n' "$DRY_RUN"
grep -q "009_scientific_reasoning_engine.sql $EXPECTED_009" <<<"$DRY_RUN" || { echo "STOP: migration 009 checksum mismatch."; exit 1; }
NODE_ENV=production npm run migrate

node -e 'const postgres=require("postgres");const sql=postgres(process.env.DATABASE_URL,{ssl:"require",max:1});(async()=>{const rows=await sql`select name,checksum from merchantflare_schema_migrations where name=${"009_scientific_reasoning_engine.sql"}`;if(rows.length!==1||rows[0].checksum!==process.env.EXPECTED_009)throw new Error("Migration checksum verification failed.");const indexes=await sql`select count(*)::int count from pg_indexes where indexname in (${"decision_belief_graph_case_idx"},${"decision_reasoning_case_time_idx"})`;if(indexes[0].count!==2)throw new Error("Reasoning indexes are missing.");console.log("Verified migration 009 checksum, tables, and indexes.");await sql.end()})().catch(async e=>{console.error(e.message);try{await sql.end()}catch{}process.exit(1)})'

echo "SUCCESS: snapshot $SNAPSHOT is available and migration 009 is verified on $INSTANCE."
