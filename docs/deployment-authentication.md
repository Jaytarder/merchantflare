# Cognito Authentication Deployment

MerchantFlare implements Amazon Cognito managed login with the OAuth 2.0 authorization-code flow and PKCE. The application client is public and has no client secret. Cognito authenticates users; MerchantFlare resolves the Cognito `sub` to an active Platform Core organization membership before it creates an application session.

The canonical authenticated application origin is `https://app.merchantflare.com`. The public marketing origin remains `https://merchantflare.com`; do not attach the authenticated Amplify application to the apex record.

The repository implementation is deployment-ready but is not considered operationally verified until the steps below have been completed against a real user pool in each environment.

## 1. Deploy the Cognito stack

Deploy [`infra/cognito.yaml`](../infra/cognito.yaml) in the same AWS Region used for the application:

```sh
aws cloudformation deploy \
  --template-file infra/cognito.yaml \
  --stack-name merchantflare-auth-production \
  --parameter-overrides \
    EnvironmentName=production \
    ProductionBaseUrl=https://app.merchantflare.com \
    CognitoDomainPrefix=merchantflare-production-unique \
  --no-fail-on-empty-changeset
```

The prefix must be globally unique. The stack creates:

- one Cognito User Pool with email sign-in and email verification;
- one public web application client without a client secret;
- authorization-code OAuth with PKCE, 60-minute ID/access tokens, and a 30-day refresh token;
- localhost and production callback/logout allowlists; and
- one Cognito hosted domain using the classic managed-login experience.

CloudFormation retains the user pool if the stack or resource is deleted. Deliberate user-pool deletion is a separate administrative operation.

Read the `UserPoolId`, `AppClientId`, `IssuerUrl`, and `CognitoDomain` stack outputs after deployment. Do not substitute the hosted domain for the issuer: Cognito publishes signing keys under the regional issuer URL.

## 2. Configure AWS Amplify

In the Amplify app, add these server runtime variables for the production branch:

| Variable | Production value |
| --- | --- |
| `COGNITO_AWS_REGION` | Region containing the user pool, for example `us-east-1` |
| `COGNITO_USER_POOL_ID` | CloudFormation `UserPoolId` output |
| `COGNITO_APP_CLIENT_ID` | CloudFormation `AppClientId` output |
| `COGNITO_ISSUER_URL` | CloudFormation `IssuerUrl` output |
| `COGNITO_DOMAIN` | CloudFormation `CognitoDomain` output |
| `APPLICATION_BASE_URL` | `https://app.merchantflare.com` |
| `AUTH_SESSION_SECRET` | A cryptographically random value of at least 32 bytes |
| `DATABASE_URL` | The migrated Platform Core PostgreSQL database connection |

Generate `AUTH_SESSION_SECRET` in a secure administrative environment. Changing it invalidates every MerchantFlare application session. Never expose it through a `NEXT_PUBLIC_` variable. Amplify reserves names beginning with `AWS`, so the application uses `COGNITO_AWS_REGION` rather than a custom `AWS_REGION` variable.

The committed [`amplify.yml`](../amplify.yml) explicitly copies only the required variables into `.env.production` so Next.js SSR compute can read them. AWS warns that deployment artifacts can be read by users with artifact access; restrict that access and use the account’s approved secret-management controls for `AUTH_SESSION_SECRET` and `DATABASE_URL`.

The production app client callback URL must be exactly:

```text
https://app.merchantflare.com/api/auth/callback
```

The production logout URL must be exactly:

```text
https://app.merchantflare.com/login
```

Before attaching the custom domain, verify the generated Amplify branch URL for build completion, public rendering, health, protected-route behavior, and absence of browser errors. If authentication itself must be exercised on that generated hostname, temporarily add its exact callback and logout URLs to the Cognito allowlists and set `APPLICATION_BASE_URL` to that generated origin for the preview deployment. Restore the canonical app origin before custom-domain QA; PKCE cookies are host-scoped, so a login started on the generated hostname cannot safely complete on `app.merchantflare.com`.

After generated-domain QA passes, attach only the `app` subdomain to the Amplify branch. Do not create, replace, or delete apex or unrelated DNS records. Set `APPLICATION_BASE_URL=https://app.merchantflare.com`, update the Cognito stack with that same origin, and verify the exact callback and logout URLs above.

Run `npm run migrate` against the production database before enabling sign-in. Amplify must use a supported Node.js runtime and must not expose Cognito tokens in build logs.

Before running migrations against a database that contains data, create a recoverable provider-level snapshot or approved `pg_dump`, record its identifier and retention, and verify that restoration is possible. `npm run migrate` validates the committed migration checksum for every already-applied migration and refuses changed or missing files.

## 3. Configure local development

Copy [`.env.example`](../.env.example) to `.env.local`, use the CloudFormation outputs, set `APPLICATION_BASE_URL=http://localhost:3000`, and provide a separate random local `AUTH_SESSION_SECRET`. The template already allows:

```text
http://localhost:3000/api/auth/callback
http://localhost:3000/login
```

Do not commit `.env.local`.

## 4. Create and bootstrap the first Owner

This is an explicit two-system administrative operation. Creating a Cognito user does not grant MerchantFlare access, and creating only a database membership does not create an identity.

1. Apply all database migrations with `npm run migrate`.
2. In Cognito, create the first user from **User pools → Users → Create user**, using their email address. Send the temporary password email or set a temporary password according to the organization’s access policy.
3. Confirm the email is verified. If an administrator marks `email_verified=true`, they must first verify ownership through an approved out-of-band process.
4. Copy the immutable Cognito `sub` attribute, not the username.
5. In a secure administrative shell with database access, set:

```text
DATABASE_URL
COGNITO_BOOTSTRAP_SUBJECT
COGNITO_BOOTSTRAP_EMAIL
COGNITO_BOOTSTRAP_ORGANIZATION_ID
COGNITO_BOOTSTRAP_ORGANIZATION_NAME
COGNITO_BOOTSTRAP_ORGANIZATION_SLUG
```

6. Run:

```sh
npm run auth:bootstrap
```

The command is idempotent for the same subject and organization. It refuses to add a different Cognito Owner when that organization already has one. It does not accept a role argument and cannot bootstrap a lower or higher privilege.
7. Complete the Cognito temporary-password challenge, sign in through `/login`, and verify the organization and Owner-only capabilities.

Subsequent users must be created through an approved team invitation/provisioning workflow and must have an active `platform_organization_memberships` record. Unknown Cognito identities receive a membership-required error and are never silently granted access.

## 5. Operational verification

Before calling authentication operational, verify in both localhost and Amplify:

- successful sign-in and sign-out;
- first-login temporary-password handling;
- email verification enforcement;
- forgot-password code delivery and password reset;
- access-token and ID-token expiry followed by refresh;
- refresh-token expiry followed by a new sign-in;
- rejection of a Cognito user without a membership;
- immediate rejection after membership suspension;
- Owner, Admin, Manager, Analyst, and Viewer permission boundaries;
- safe return to an internal route after sign-in; and
- no token, password, authorization code, or session-cookie content in application logs.

## Troubleshooting

`configuration_unavailable` means one or more required server variables are missing or `AUTH_SESSION_SECRET` is too short. `callback_invalid` indicates missing or expired PKCE state. `email_unverified` means Cognito did not issue a verified email claim. `membership_required` means the Cognito `sub` has no active organization membership. Server logs contain only stable diagnostic labels and error class names; they must never include tokens or credentials.

## 6. Rollback

Record the Amplify branch, deployed commit, prior successful Amplify job, Cognito callback/logout allowlists, database migration rows, backup identifier, and DNS values before release.

To roll back safely:

1. keep `app.merchantflare.com` on the last verified Amplify job until the replacement passes generated-domain QA;
2. redeploy the previous successful Amplify revision from Amplify job history;
3. restore the previous branch environment configuration without printing secret values;
4. revert the Cognito stack parameter to the previously recorded application origin and confirm its callback/logout allowlists;
5. if a migration changed data incompatibly, stop application writes and restore the recorded database snapshot according to the documented recovery impact; and
6. detach only the `app` subdomain mapping when necessary. Preserve the apex and unrelated subdomains. If Amplify manages a multi-subdomain domain association, update the association to remove only `app` instead of deleting the whole association.

Removing DNS is the last resort, not the primary rollback. Never point `app.merchantflare.com` at a failed build.

## 7. Deployment state labels

Use these labels in status documents and release reports:

- **Deployed and verified:** HTTPS, Cognito callback, authenticated session, database access, Owner organization, logout, recovery, RBAC, responsive layouts, and browser logs were exercised successfully.
- **Configured but unverified:** infrastructure or environment configuration exists, but one or more credentialed or data-backed checks were not run.
- **Planned:** no deployed configuration was observed.
