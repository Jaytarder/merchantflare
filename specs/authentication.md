# Authentication Specification

**Status:** Scaffolded

The Cognito application flow, JWT verifier, organization-membership resolution, protected-route gateway, session refresh, infrastructure template, and owner-bootstrap tooling are implemented. A real Cognito authorization endpoint and the app-subdomain callback configuration were observed on 2026-08-01. The status remains scaffolded because callback completion, session lifecycle, recovery, production database membership, Owner bootstrap, and RBAC were not exercised with an authenticated user.

## Implemented contract

- Amazon Cognito is the identity provider; Platform Core remains the authorization and tenancy authority.
- Browser sign-in uses managed login, authorization code, PKCE, state, and nonce.
- The public browser application client has no client secret.
- ID tokens require a trusted RS256 signing key, exact issuer, configured audience, `token_use=id`, expiry, subject, email, verified email, and callback nonce where applicable.
- Cognito refresh tokens are encrypted in HttpOnly, Secure production cookies and are never exposed to browser JavaScript.
- MerchantFlare application sessions are integrity-protected, short-lived, HttpOnly cookies.
- Active database membership is resolved at callback, refresh, and authenticated server boundaries.
- Unknown, suspended, expired, and unverified identities are denied.
- Return paths accept only application-relative URLs.
- First-Owner access requires the explicit administrative process in [`docs/deployment-authentication.md`](../docs/deployment-authentication.md).

## Required completion evidence

Authentication becomes implemented only after a real development and production user pool have passed:

- login, logout, verification, forgot-password, and reset-password flows;
- token validation and refresh across expiry;
- local and Amplify callback/logout redirects;
- first-Owner bootstrap and unknown-user denial;
- membership suspension and all Platform Core role boundaries; and
- a log review confirming credentials and tokens are not recorded.

## Open gaps

- Credentialed Cognito callback/session/recovery/logout verification and AWS control-plane verification of the observed Amplify deployment.
- Multi-organization selection for a user with more than one active membership.
- Central session revocation before the Cognito refresh token expires.
- Invitation acceptance that atomically binds an invited email to a Cognito subject.
- Custom-domain and managed-login branding decisions.
