#!/usr/bin/env bash
set -euo pipefail

REGION="us-east-1"
APP_NAME="merchantflare"
PRODUCTION_BRANCH="main"
EXPECTED_MAIN_COMMIT="71da433c863393fa3b9564e9a8d64c613f0efaf1"
SNAPSHOT="merchantflare-pre-decision-platform-20260802"
CUSTOM_DOMAIN="https://app.merchantflare.com"

for command_name in aws curl jq; do
  command -v "$command_name" >/dev/null || {
    echo "STOP: required command $command_name is unavailable."
    exit 1
  }
done

ACCOUNT_ARN="$(aws sts get-caller-identity --query Arn --output text)"
echo "Authenticated AWS identity: $ACCOUNT_ARN"

SNAPSHOT_STATUS="$(
  aws rds describe-db-snapshots \
    --region "$REGION" \
    --db-snapshot-identifier "$SNAPSHOT" \
    --query 'DBSnapshots[0].Status' \
    --output text
)"
test "$SNAPSHOT_STATUS" = "available" || {
  echo "STOP: database snapshot $SNAPSHOT is $SNAPSHOT_STATUS."
  exit 1
}

APPS_JSON="$(aws amplify list-apps --region "$REGION" --output json)"
mapfile -t APP_IDS < <(
  jq -r --arg name "$APP_NAME" \
    '.apps[] | select(.name == $name and ((.repository // "") | ascii_downcase | contains("jaytarder/merchantflare"))) | .appId' \
    <<<"$APPS_JSON"
)
test "${#APP_IDS[@]}" -eq 1 || {
  echo "STOP: expected exactly one merchantflare Amplify app; found ${#APP_IDS[@]}."
  exit 1
}

APP_ID="${APP_IDS[0]}"
APP_JSON="$(aws amplify get-app --region "$REGION" --app-id "$APP_ID" --output json)"
DEFAULT_DOMAIN="$(jq -r '.app.defaultDomain' <<<"$APP_JSON")"
GENERATED_DOMAIN="https://${PRODUCTION_BRANCH}.${DEFAULT_DOMAIN}"

DOMAIN_JSON="$(aws amplify list-domain-associations --region "$REGION" --app-id "$APP_ID" --output json)"
APP_DOMAIN_BRANCH="$(
  jq -r '
    .domainAssociations[]
    | select(.domainName == "merchantflare.com")
    | .subDomains[]
    | select(.subDomainSetting.prefix == "app")
    | .subDomainSetting.branchName
  ' <<<"$DOMAIN_JSON"
)"
test "$APP_DOMAIN_BRANCH" = "$PRODUCTION_BRANCH" || {
  echo "STOP: app.merchantflare.com is not mapped to Amplify branch $PRODUCTION_BRANCH."
  exit 1
}

REMOTE_MAIN_COMMIT="$(
  curl --fail --silent --show-error \
    https://api.github.com/repos/Jaytarder/merchantflare/commits/main |
    jq -er '.sha'
)"
test "$REMOTE_MAIN_COMMIT" = "$EXPECTED_MAIN_COMMIT" || {
  echo "STOP: GitHub main is $REMOTE_MAIN_COMMIT, expected $EXPECTED_MAIN_COMMIT."
  exit 1
}

LATEST_JOB_JSON="$(
  aws amplify list-jobs \
    --region "$REGION" \
    --app-id "$APP_ID" \
    --branch-name "$PRODUCTION_BRANCH" \
    --max-results 1 \
    --output json
)"
PREVIOUS_JOB_ID="$(jq -r '.jobSummaries[0].jobId // "unknown"' <<<"$LATEST_JOB_JSON")"
PREVIOUS_COMMIT="$(jq -r '.jobSummaries[0].commitId // "unknown"' <<<"$LATEST_JOB_JSON")"
PREVIOUS_STATUS="$(jq -r '.jobSummaries[0].status // "unknown"' <<<"$LATEST_JOB_JSON")"

jq -n \
  --arg appId "$APP_ID" \
  --arg branch "$PRODUCTION_BRANCH" \
  --arg jobId "$PREVIOUS_JOB_ID" \
  --arg commit "$PREVIOUS_COMMIT" \
  --arg status "$PREVIOUS_STATUS" \
  --arg snapshot "$SNAPSHOT" \
  '{appId:$appId,branch:$branch,jobId:$jobId,commit:$commit,status:$status,databaseSnapshot:$snapshot}' \
  > merchantflare-before-scientific-production.json

echo "Current production job: $PREVIOUS_JOB_ID"
echo "Current production commit: $PREVIOUS_COMMIT"
echo "Current production status: $PREVIOUS_STATUS"

CURRENT_JOB_COMMIT="$(jq -r '.jobSummaries[0].commitId // empty' <<<"$LATEST_JOB_JSON")"
CURRENT_JOB_STATUS="$(jq -r '.jobSummaries[0].status // empty' <<<"$LATEST_JOB_JSON")"

if test "$CURRENT_JOB_COMMIT" = "$EXPECTED_MAIN_COMMIT" && test "$CURRENT_JOB_STATUS" = "SUCCEED"; then
  JOB_ID="$PREVIOUS_JOB_ID"
  echo "Amplify already completed the expected production release in job $JOB_ID."
elif test "$CURRENT_JOB_COMMIT" = "$EXPECTED_MAIN_COMMIT" \
  && { test "$CURRENT_JOB_STATUS" = "CREATED" \
    || test "$CURRENT_JOB_STATUS" = "PENDING" \
    || test "$CURRENT_JOB_STATUS" = "PROVISIONING" \
    || test "$CURRENT_JOB_STATUS" = "RUNNING"; }; then
  JOB_ID="$PREVIOUS_JOB_ID"
  echo "Monitoring existing Amplify production job $JOB_ID."
else
  JOB_ID="$(
    aws amplify start-job \
      --region "$REGION" \
      --app-id "$APP_ID" \
      --branch-name "$PRODUCTION_BRANCH" \
      --job-type RELEASE \
      --job-reason "Scientific Decision Platform production release" \
      --query 'jobSummary.jobId' \
      --output text
  )"
  echo "Started Amplify production job $JOB_ID."
fi

for attempt in $(seq 1 80); do
  JOB_JSON="$(
    aws amplify get-job \
      --region "$REGION" \
      --app-id "$APP_ID" \
      --branch-name "$PRODUCTION_BRANCH" \
      --job-id "$JOB_ID" \
      --output json
  )"
  JOB_STATUS="$(jq -r '.job.summary.status' <<<"$JOB_JSON")"
  echo "Build status: $JOB_STATUS"

  case "$JOB_STATUS" in
    SUCCEED)
      break
      ;;
    FAILED|CANCELLED)
      echo "STOP: Amplify job $JOB_ID ended with status $JOB_STATUS. app.merchantflare.com was not repointed."
      exit 1
      ;;
  esac

  test "$attempt" -lt 80 || {
    echo "STOP: Amplify job did not finish within 20 minutes."
    exit 1
  }
  sleep 15
done

DEPLOYED_COMMIT="$(jq -r '.job.summary.commitId' <<<"$JOB_JSON")"
test "$DEPLOYED_COMMIT" = "$EXPECTED_MAIN_COMMIT" || {
  echo "STOP: Amplify deployed $DEPLOYED_COMMIT instead of $EXPECTED_MAIN_COMMIT."
  exit 1
}

verify_public_surface() {
  local base_url="$1" health_status login_status decision_status decision_body
  decision_body="$(mktemp)"
  health_status="$(curl --silent --show-error --max-time 60 --output /dev/null --write-out '%{http_code}' "${base_url}/api/health")"
  login_status="$(curl --silent --show-error --location --max-time 60 --output /dev/null --write-out '%{http_code}' "${base_url}/login")"
  decision_status="$(curl --silent --show-error --max-time 60 --output "$decision_body" --write-out '%{http_code}' "${base_url}/api/decisions/cases")"

  test "$health_status" = "200" || {
    rm -f "$decision_body"
    echo "STOP: ${base_url}/api/health returned $health_status."
    exit 1
  }
  test "$login_status" = "200" || {
    rm -f "$decision_body"
    echo "STOP: ${base_url}/login returned $login_status."
    exit 1
  }
  test "$decision_status" = "401" && grep -q 'authentication_required\|Authentication is required' "$decision_body" || {
    rm -f "$decision_body"
    echo "STOP: Decision API marker failed on $base_url with HTTP $decision_status."
    exit 1
  }
  rm -f "$decision_body"
  echo "Verified HTTPS health, login, and protected Decision API on $base_url."
}

verify_public_surface "$GENERATED_DOMAIN"
verify_public_surface "$CUSTOM_DOMAIN"

echo "SUCCESS: Scientific Decision Platform is deployed to app.merchantflare.com."
echo "Amplify app: $APP_ID"
echo "Amplify job: $JOB_ID"
echo "Deployed commit: $DEPLOYED_COMMIT"
echo "Generated URL: $GENERATED_DOMAIN"
echo "Custom URL: $CUSTOM_DOMAIN"
echo "Database snapshot: $SNAPSHOT"
echo "Rollback metadata: merchantflare-before-scientific-production.json"
echo "Application rollback: revert merge commit $EXPECTED_MAIN_COMMIT on main, push, and start a new Amplify RELEASE job."
echo "Database rollback is not required for application rollback because migrations 007 and 008 are additive; snapshot restore remains the disaster-recovery path."
