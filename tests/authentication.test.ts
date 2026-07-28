import test from "node:test";
import assert from "node:assert/strict";
import {
  generateKeyPairSync,
  sign,
  type KeyObject,
} from "node:crypto";
import {
  AuthenticationConfigurationError,
  getCognitoAuthConfig,
  signSession,
  verifySession,
} from "../lib/auth";
import { CognitoTokenError, verifyCognitoIdToken } from "../lib/auth/jwt";
import { resolvePrincipalWithMembership } from "../lib/auth/principal";
import { protectedRouteDecision } from "../lib/auth/protection";
import { safeRedirectPath } from "../lib/auth/redirects";

const issuer = "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_example";
const clientId = "client-123";
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test-key", use: "sig" };

function token(
  claims: Record<string, unknown>,
  key: KeyObject = privateKey,
) {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "test-key" }))
    .toString("base64url");
  const body = Buffer.from(JSON.stringify({
    sub: "subject-1",
    email: "owner@example.com",
    email_verified: true,
    iss: issuer,
    aud: clientId,
    token_use: "id",
    exp: 2_000_000_000,
    ...claims,
  })).toString("base64url");
  return `${header}.${body}.${sign("RSA-SHA256", Buffer.from(`${header}.${body}`), key).toString("base64url")}`;
}

const loadJwks = async () => ({ keys: [jwk] });

test("accepts a valid Cognito ID token", async () => {
  const result = await verifyCognitoIdToken({
    token: token({ nonce: "expected" }),
    issuer,
    clientId,
    nonce: "expected",
    nowSeconds: 1_900_000_000,
    loadJwks,
  });
  assert.equal(result.identity.subjectId, "subject-1");
  assert.equal(result.identity.emailVerified, true);
});

for (const scenario of [
  { name: "invalid issuer", claims: { iss: "https://invalid.example" }, code: "TOKEN_ISSUER_INVALID" },
  { name: "invalid audience", claims: { aud: "different-client" }, code: "TOKEN_AUDIENCE_INVALID" },
  { name: "expired token", claims: { exp: 1_800_000_000 }, code: "TOKEN_EXPIRED" },
] as const) {
  test(`rejects ${scenario.name}`, async () => {
    await assert.rejects(
      verifyCognitoIdToken({
        token: token(scenario.claims),
        issuer,
        clientId,
        nowSeconds: 1_900_000_000,
        loadJwks,
      }),
      (error) => error instanceof CognitoTokenError && error.code === scenario.code,
    );
  });
}

test("requires an active organization membership", async () => {
  const result = await resolvePrincipalWithMembership(
    { resolve: async () => null },
    {
      provider: "cognito",
      subjectId: "subject-1",
      email: "owner@example.com",
      emailVerified: true,
    },
    Date.now() + 60_000,
  );
  assert.deepEqual(result, { ok: false, reason: "membership_required" });
});

test("protected routes redirect safely and APIs return unauthorized", () => {
  assert.deepEqual(
    protectedRouteDecision({
      pathname: "/dashboard",
      returnTo: "/dashboard?thread=one",
      hasSession: false,
      hasRefreshToken: false,
    }),
    { action: "login", returnTo: "/dashboard?thread=one" },
  );
  assert.deepEqual(
    protectedRouteDecision({
      pathname: "/api/mercury/plan",
      returnTo: "/api/mercury/plan",
      hasSession: false,
      hasRefreshToken: true,
    }),
    { action: "unauthorized" },
  );
  assert.equal(safeRedirectPath("https://attacker.example"), "/dashboard");
  assert.equal(safeRedirectPath("//attacker.example"), "/dashboard");
  assert.equal(safeRedirectPath("/atlas?asin=1"), "/atlas?asin=1");
});

test("signed sessions reject tampering and expiry", () => {
  const secret = "a-secure-test-secret-that-is-long-enough";
  const value = signSession({
    subjectId: "subject-1",
    email: "owner@example.com",
    organizationId: "org-1",
    role: "viewer",
    authenticationMethod: "cognito",
    sessionExpiresAt: 2_000,
    issuedAt: 1_000,
  }, secret);
  assert.ok(verifySession(value, secret, 1_500));
  assert.equal(verifySession(`${value}x`, secret, 1_500), null);
  assert.equal(verifySession(value, secret, 2_001), null);
});

test("reports unavailable authentication configuration", () => {
  assert.throws(
    () => getCognitoAuthConfig({ NODE_ENV: "test" }),
    AuthenticationConfigurationError,
  );
});
