#!/usr/bin/env bash
set -euo pipefail

REGION="us-east-1"
REPOSITORY_FRAGMENT="jaytarder/merchantflare"
BRANCH="agent/scientific-decision-platform"
DISPLAY_NAME="scientific-decision-platform-preview"
VALIDATED_APP_COMMIT="706cb370056857667977269f4b37acbf2c252c87"
PRODUCTION_BRANCH="main"

for command_name in aws curl jq; do
  command -v "$command_name" >/dev/null || {
    echo "STOP: required command $command_name is unavailable."
    exit 1
  }
done

ACCOUNT_ARN="$(aws sts get-caller-identity --query Arn --output text)"
echo "Authenticated AWS identity: $ACCOUNT_ARN"

APPS_JSON="$(aws amplify list-apps --region "$REGION" --output json)"
mapfile -t APP_IDS < <(
  jq -r --arg repository "$REPOSITORY_FRAGMENT" \
    '.apps[] | select((.repository // "") | ascii_downcase | contains($repository)) | .appId' \
    <<<"$APPS_JSON"
)

test "${#APP_IDS[@]}" -eq 1 || {
  echo "STOP: expected exactly one Amplify app connected to Jaytarder/merchantflare; found ${#APP_IDS[@]}."
  exit 1
}

APP_ID="${APP_IDS[0]}"
APP_JSON="$(aws amplify get-app --region "$REGION" --app-id "$APP_ID" --output json)"
APP_NAME="$(jq -r '.app.name' <<<"$APP_JSON")"
DEFAULT_DOMAIN="$(jq -r '.app.defaultDomain' <<<"$APP_JSON")"
REPOSITORY_URL="$(jq -r '.app.repository' <<<"$APP_JSON")"
PREVIEW_URL="https://${DISPLAY_NAME}.${DEFAULT_DOMAIN}"

test "$APP_NAME" = "merchantflare" || {
  echo "STOP: discovered Amplify app is $APP_NAME, not merchantflare."
  exit 1
}

REMOTE_COMMIT="$(
  curl --fail --silent --show-error \
    "https://api.github.com/repos/Jaytarder/merchantflare/commits/${BRANCH}" |
    jq -er '.sha'
)"

COMPARE_JSON="$(
  curl --fail --silent --show-error \
    "https://api.github.com/repos/Jaytarder/merchantflare/compare/${VALIDATED_APP_COMMIT}...${REMOTE_COMMIT}"
)"
COMPARE_STATUS="$(jq -r '.status' <<<"$COMPARE_JSON")"
UNVALIDATED_FILES="$(
  jq -r '
    .files[]?.filename
    | select(
        . != "scripts/migrate-production-cloudshell.sh"
        and . != "scripts/migrate-production-cloudshell-v2.sh"
        and . != "scripts/deploy-scientific-preview-cloudshell.sh"
      )
  ' <<<"$COMPARE_JSON"
)"

test "$COMPARE_STATUS" = "ahead" || test "$COMPARE_STATUS" = "identical" || {
  echo "STOP: branch head is not a descendant of validated application commit $VALIDATED_APP_COMMIT."
  exit 1
}

test -z "$UNVALIDATED_FILES" || {
  echo "STOP: unvalidated application files changed after $VALIDATED_APP_COMMIT:"
  printf '%s\n' "$UNVALIDATED_FILES"
  exit 1
}

PRODUCTION_JOB_JSON="$(
  aws amplify list-jobs \
    --region "$REGION" \
    --app-id "$APP_ID" \
    --branch-name "$PRODUCTION_BRANCH" \
    --max-results 1 \
    --output json
)"
PRODUCTION_COMMIT="$(jq -r '.jobSummaries[0].commitId // "unknown"' <<<"$PRODUCTION_JOB_JSON")"
PRODUCTION_JOB_ID="$(jq -r '.jobSummaries[0].jobId // "unknown"' <<<"$PRODUCTION_JOB_JSON")"

echo "Amplify app: $APP_NAME ($APP_ID)"
echo "Repository: $REPOSITORY_URL"
echo "Production rollback job: $PRODUCTION_JOB_ID"
echo "Production rollback commit: $PRODUCTION_COMMIT"

if BRANCH_JSON="$(aws amplify get-branch --region "$REGION" --app-id "$APP_ID" --branch-name "$BRANCH" --output json 2>/dev/null)"; then
  BRANCH_STAGE="$(jq -r '.branch.stage' <<<"$BRANCH_JSON")"
  test "$BRANCH_STAGE" != "PRODUCTION" || {
    echo "STOP: the preview branch is unexpectedly marked PRODUCTION."
    exit 1
  }
else
  aws amplify create-branch \
    --region "$REGION" \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH" \
    --display-name "$DISPLAY_NAME" \
    --stage DEVELOPMENT \
    --no-enable-auto-build \
    --description "Scientific Decision Platform preview; production domain unchanged" \
    --output json >/dev/null
  BRANCH_JSON="$(aws amplify get-branch --region "$REGION" --app-id "$APP_ID" --branch-name "$BRANCH" --output json)"
fi

CURRENT_BRANCH_ENV="$(jq -c '.branch.environmentVariables // {}' <<<"$BRANCH_JSON")"
UPDATED_BRANCH_ENV="$(
  jq -cn \
    --argjson current "$CURRENT_BRANCH_ENV" \
    --arg applicationBaseUrl "$PREVIEW_URL" \
    '$current + {APPLICATION_BASE_URL: $applicationBaseUrl}'
)"

aws amplify update-branch \
  --region "$REGION" \
  --app-id "$APP_ID" \
  --branch-name "$BRANCH" \
  --display-name "$DISPLAY_NAME" \
  --stage DEVELOPMENT \
  --environment-variables "$UPDATED_BRANCH_ENV" \
  --no-enable-auto-build \
  --output json >/dev/null

APP_ENV="$(jq -c '.app.environmentVariables // {}' <<<"$APP_JSON")"
COGNITO_USER_POOL_ID="$(
  jq -rn \
    --argjson app "$APP_ENV" \
    --argjson branch "$UPDATED_BRANCH_ENV" \
    '$branch.COGNITO_USER_POOL_ID // $app.COGNITO_USER_POOL_ID // empty'
)"
COGNITO_APP_CLIENT_ID="$(
  jq -rn \
    --argjson app "$APP_ENV" \
    --argjson branch "$UPDATED_BRANCH_ENV" \
    '$branch.COGNITO_APP_CLIENT_ID // $app.COGNITO_APP_CLIENT_ID // empty'
)"

test -n "$COGNITO_USER_POOL_ID" && test -n "$COGNITO_APP_CLIENT_ID" || {
  echo "STOP: Cognito identifiers are not configured in the Amplify app or preview branch."
  exit 1
}

COGNITO_CLIENT_JSON="$(
  aws cognito-idp describe-user-pool-client \
    --region "$REGION" \
    --user-pool-id "$COGNITO_USER_POOL_ID" \
    --client-id "$COGNITO_APP_CLIENT_ID" \
    --output json
)"

test "$(jq -r '.UserPoolClient.ClientSecret // empty' <<<"$COGNITO_CLIENT_JSON")" = "" || {
  echo "STOP: Cognito browser client unexpectedly has a client secret."
  exit 1
}

CALLBACK_URL="${PREVIEW_URL}/api/auth/callback"
LOGOUT_URL="${PREVIEW_URL}/login"
ROLLBACK_FILE="merchantflare-cognito-before-scientific-preview.json"
UPDATE_FILE="$(mktemp)"

jq '
  .UserPoolClient
  | {
      UserPoolId,
      ClientId,
      ClientName,
      RefreshTokenValidity,
      AccessTokenValidity,
      IdTokenValidity,
      TokenValidityUnits,
      ReadAttributes,
      WriteAttributes,
      ExplicitAuthFlows,
      SupportedIdentityProviders,
      CallbackURLs,
      LogoutURLs,
      DefaultRedirectURI,
      AllowedOAuthFlows,
      AllowedOAuthScopes,
      AllowedOAuthFlowsUserPoolClient,
      AnalyticsConfiguration,
      PreventUserExistenceErrors,
      EnableTokenRevocation,
      EnablePropagateAdditionalUserContextData,
      AuthSessionValidity,
      RefreshTokenRotation
    }
  | with_entries(select(.value != null))
' <<<"$COGNITO_CLIENT_JSON" > "$ROLLBACK_FILE"
chmod 600 "$ROLLBACK_FILE"

jq --arg callback "$CALLBACK_URL" --arg logout "$LOGOUT_URL" '
  .UserPoolClient
  | .CallbackURLs = (((.CallbackURLs // []) + [$callback]) | unique)
  | .LogoutURLs = (((.LogoutURLs // []) + [$logout]) | unique)
  | {
      UserPoolId,
      ClientId,
      ClientName,
      RefreshTokenValidity,
      AccessTokenValidity,
      IdTokenValidity,
      TokenValidityUnits,
      ReadAttributes,
      WriteAttributes,
      ExplicitAuthFlows,
      SupportedIdentityProviders,
      CallbackURLs,
      LogoutURLs,
      DefaultRedirectURI,
      AllowedOAuthFlows,
      AllowedOAuthScopes,
      AllowedOAuthFlowsUserPoolClient,
      AnalyticsConfiguration,
      PreventUserExistenceErrors,
      EnableTokenRevocation,
      EnablePropagateAdditionalUserContextData,
      AuthSessionValidity,
      RefreshTokenRotation
    }
  | with_entries(select(.value != null))
' <<<"$COGNITO_CLIENT_JSON" > "$UPDATE_FILE"

aws cognito-idp update-user-pool-client \
  --region "$REGION" \
  --cli-input-json "file://${UPDATE_FILE}" \
  --output json >/dev/null
rm -f "$UPDATE_FILE"

JOB_ID="$(
  aws amplify start-job \
    --region "$REGION" \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH" \
    --job-type RELEASE \
    --job-reason "Scientific Decision Platform generated-domain QA" \
    --query 'jobSummary.jobId' \
    --output text
)"

echo "Started Amplify preview job $JOB_ID for $REMOTE_COMMIT."

for attempt in $(seq 1 80); do
  JOB_JSON="$(
    aws amplify get-job \
      --region "$REGION" \
      --app-id "$APP_ID" \
      --branch-name "$BRANCH" \
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
      echo "STOP: Amplify job $JOB_ID ended with status $JOB_STATUS."
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
test "$DEPLOYED_COMMIT" = "$REMOTE_COMMIT" || {
  echo "STOP: Amplify deployed $DEPLOYED_COMMIT instead of $REMOTE_COMMIT."
  exit 1
}

HTTP_STATUS="$(curl --silent --show-error --location --max-time 60 --output /dev/null --write-out '%{http_code}' "${PREVIEW_URL}/login")"
case "$HTTP_STATUS" in
  2??|3??) ;;
  *)
    echo "STOP: preview login returned HTTP $HTTP_STATUS."
    exit 1
    ;;
esac

echo "SUCCESS: generated Amplify preview deployed and reachable."
echo "Preview URL: $PREVIEW_URL"
echo "Deployed commit: $DEPLOYED_COMMIT"
echo "Cognito callback added: $CALLBACK_URL"
echo "Cognito logout added: $LOGOUT_URL"
echo "Production domain app.merchantflare.com was not changed."
echo "Cognito rollback: aws cognito-idp update-user-pool-client --region $REGION --cli-input-json file://$ROLLBACK_FILE"
echo "Preview detach: aws amplify delete-branch --region $REGION --app-id $APP_ID --branch-name '$BRANCH'"
