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

for target_value in "$DB_HOST" "$DB_PORT"; do
  test -n "$target_value" && test "$target_value" != "None" || {
    echo "STOP: RDS endpoint metadata is incomplete."
    exit 1
  }
done

database_url_matches_target() {
  CANDIDATE_DATABASE_URL="$1" TARGET_DB_HOST="$DB_HOST" TARGET_DB_PORT="$DB_PORT" \
    python3 -c 'import os,sys,urllib.parse; url=urllib.parse.urlparse(os.environ["CANDIDATE_DATABASE_URL"]); expected_host=os.environ["TARGET_DB_HOST"].lower(); expected_port=int(os.environ["TARGET_DB_PORT"]); actual_port=url.port or 5432; database=urllib.parse.unquote(url.path.lstrip("/")); sys.exit(0 if url.scheme in ("postgres", "postgresql") and (url.hostname or "").lower()==expected_host and actual_port==expected_port and database else 1)'
}

find_amplify_database_url() {
  local apps_json app_id app_json candidate branches_json branch_name branch_json
  apps_json="$(aws amplify list-apps --region "$REGION" --output json 2>/dev/null || true)"

  while IFS= read -r app_id; do
    test -n "$app_id" || continue
    app_json="$(aws amplify get-app --region "$REGION" --app-id "$app_id" --output json 2>/dev/null || true)"
    candidate="$(jq -r '.app.environmentVariables.DATABASE_URL // empty' <<<"$app_json")"
    if test -n "$candidate" && database_url_matches_target "$candidate"; then
      printf '%s' "$candidate"
      return 0
    fi

    branches_json="$(aws amplify list-branches --region "$REGION" --app-id "$app_id" --output json 2>/dev/null || true)"
    while IFS= read -r branch_name; do
      test -n "$branch_name" || continue
      branch_json="$(aws amplify get-branch --region "$REGION" --app-id "$app_id" --branch-name "$branch_name" --output json 2>/dev/null || true)"
      candidate="$(jq -r '.branch.environmentVariables.DATABASE_URL // empty' <<<"$branch_json")"
      if test -n "$candidate" && database_url_matches_target "$candidate"; then
        printf '%s' "$candidate"
        return 0
      fi
    done < <(jq -r '.branches[]?.branchName' <<<"$branches_json")
  done < <(jq -r '.apps[]?.appId' <<<"$apps_json")

  return 1
}

DATABASE_URL="$(find_amplify_database_url || true)"

if test -z "$DATABASE_URL" && test -n "$DB_NAME" && test "$DB_NAME" != "None" \
  && test -n "$DB_USER" && test "$DB_USER" != "None" \
  && test -n "$SECRET_ARN" && test "$SECRET_ARN" != "None"; then
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
  DATABASE_URL="postgresql://${ENCODED_USER}:${ENCODED_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"
fi

test -n "$DATABASE_URL" || {
  echo "STOP: no Amplify DATABASE_URL matching $INSTANCE was accessible, and RDS has no usable managed master secret."
  exit 1
}

database_url_matches_target "$DATABASE_URL" || {
  echo "STOP: resolved DATABASE_URL does not point to $INSTANCE."
  exit 1
}

DB_NAME="$(DATABASE_URL="$DATABASE_URL" python3 -c 'import os,urllib.parse; print(urllib.parse.unquote(urllib.parse.urlparse(os.environ["DATABASE_URL"]).path.lstrip("/")))')"
export DATABASE_URL
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
