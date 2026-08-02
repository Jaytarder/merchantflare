#!/usr/bin/env bash
set -euo pipefail

REGION="us-east-1"
INSTANCE="merchantflare-dev"
SNAPSHOT="merchantflare-pre-decision-platform-20260802"
EXPECTED_BRANCH="agent/scientific-decision-platform"
EXPECTED_COMMIT="706cb370056857667977269f4b37acbf2c252c87"
EXPECTED_007="aa2c96ad7e6ca86248fc34b588db238f7516a60f8aa20e3f3423e7ab78a995fd"
EXPECTED_008="eb72d6ff5819bab75120d692b9d4a46f3bb49f0af7b3ea98e85a873c054f1169"

for command_name in aws git jq node npm python3; do
  command -v "$command_name" >/dev/null || {
    echo "STOP: required command $command_name is unavailable."
    exit 1
  }
done

if test ! -f package.json || test ! -f db/migrations/007_scientific_decision_platform.sql; then
  WORKDIR="$(mktemp -d)"
  git clone --branch "$EXPECTED_BRANCH" --depth 10 \
    https://github.com/Jaytarder/merchantflare.git "$WORKDIR/merchantflare"
  cd "$WORKDIR/merchantflare"
  git checkout --detach "$EXPECTED_COMMIT"
fi

test "$(git rev-parse HEAD)" = "$EXPECTED_COMMIT" || {
  echo "STOP: repository commit does not match validated commit $EXPECTED_COMMIT."
  exit 1
}

SNAPSHOT_STATUS="$(
  aws rds describe-db-snapshots \
    --region "$REGION" \
    --db-snapshot-identifier "$SNAPSHOT" \
    --query 'DBSnapshots[0].Status' \
    --output text
)"

test "$SNAPSHOT_STATUS" = "available" || {
  echo "STOP: snapshot $SNAPSHOT status is $SNAPSHOT_STATUS."
  exit 1
}

IFS=$'\t' read -r DB_HOST DB_PORT DB_NAME DB_USER SECRET_ARN < <(
  aws rds describe-db-instances \
    --region "$REGION" \
    --db-instance-identifier "$INSTANCE" \
    --query 'DBInstances[0].[Endpoint.Address,Endpoint.Port,DBName,MasterUsername,MasterUserSecret.SecretArn]' \
    --output text
)

for target_value in "$DB_HOST" "$DB_PORT" "$DB_NAME" "$DB_USER" "$SECRET_ARN"; do
  test -n "$target_value" && test "$target_value" != "None" || {
    echo "STOP: RDS target or managed-secret metadata is incomplete."
    exit 1
  }
done

SECRET_JSON="$(
  aws secretsmanager get-secret-value \
    --region "$REGION" \
    --secret-id "$SECRET_ARN" \
    --query SecretString \
    --output text
)"

DB_PASSWORD="$(jq -er '.password' <<<"$SECRET_JSON")"
ENCODED_USER="$(python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$DB_USER")"
ENCODED_PASSWORD="$(python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$DB_PASSWORD")"

export DATABASE_URL="postgresql://${ENCODED_USER}:${ENCODED_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"
export DECISION_DB_EXPECTED_NAME="$DB_NAME"

cleanup() {
  unset SECRET_JSON DB_PASSWORD ENCODED_PASSWORD DATABASE_URL
}
trap cleanup EXIT

npm install

node -e 'const postgres=require("postgres"); const sql=postgres(process.env.DATABASE_URL,{ssl:"require",max:1}); (async()=>{const rows=await sql.unsafe("select current_database() as database_name, inet_server_addr()::text as server_address"); if(rows[0].database_name!==process.env.DECISION_DB_EXPECTED_NAME) throw new Error("Connected database name does not match RDS metadata."); console.log(`Verified database target ${rows[0].database_name} at ${rows[0].server_address}.`); await sql.end();})().catch(async error=>{console.error(error.message); try{await sql.end()}catch{} process.exit(1)})'

DRY_RUN_OUTPUT="$(npm run migrate:dry-run)"
printf '%s\n' "$DRY_RUN_OUTPUT"
grep -q "007_scientific_decision_platform.sql $EXPECTED_007" <<<"$DRY_RUN_OUTPUT"
grep -q "008_decision_learning_engine.sql $EXPECTED_008" <<<"$DRY_RUN_OUTPUT"

NODE_ENV=production npm run migrate

node -e 'const postgres=require("postgres"); const expected=new Map([["007_scientific_decision_platform.sql","aa2c96ad7e6ca86248fc34b588db238f7516a60f8aa20e3f3423e7ab78a995fd"],["008_decision_learning_engine.sql","eb72d6ff5819bab75120d692b9d4a46f3bb49f0af7b3ea98e85a873c054f1169"]]); const sql=postgres(process.env.DATABASE_URL,{ssl:"require",max:1}); (async()=>{const rows=await sql.unsafe("select name, checksum from merchantflare_schema_migrations where name in ('"'"'007_scientific_decision_platform.sql'"'"','"'"'008_decision_learning_engine.sql'"'"') order by name"); for(const [name,checksum] of expected){const row=rows.find(item=>item.name===name); if(!row||row.checksum!==checksum) throw new Error(`Applied checksum mismatch for ${name}.`)} const objects=await sql.unsafe("select count(*)::int as count from pg_indexes where schemaname=current_schema() and indexname in ('"'"'decision_cases_org_updated_idx'"'"','"'"'decision_predictions_org_time_idx'"'"','"'"'decision_executions_org_case_idx'"'"','"'"'decision_lesson_reuse_org_time_idx'"'"')"); if(objects[0].count!==4) throw new Error("Required Decision Platform indexes are missing."); console.log("Verified applied migration checksums and required indexes."); await sql.end();})().catch(async error=>{console.error(error.message); try{await sql.end()}catch{} process.exit(1)})'

echo "SUCCESS: migrations 001-008 and snapshot-protected checksum/index verification completed."
