import { createPublicKey, verify as verifySignature } from "crypto";
import type { VerifiedIdentity } from "../platform/identity";

type JwtHeader = { alg?: string; kid?: string };
type JwtClaims = {
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  token_use?: string;
  nonce?: string;
};

export type CognitoTokenVerification = {
  identity: VerifiedIdentity;
  expiresAt: number;
};

export type JwksDocument = { keys: Array<JsonWebKey & { kid?: string }> };
export type JwksLoader = (issuer: string) => Promise<JwksDocument>;

export class CognitoTokenError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "CognitoTokenError";
  }
}

const jwksCache = new Map<string, { expiresAt: number; document: JwksDocument }>();

async function loadRemoteJwks(issuer: string): Promise<JwksDocument> {
  const cached = jwksCache.get(issuer);
  if (cached && cached.expiresAt > Date.now()) return cached.document;
  const response = await fetch(`${issuer}/.well-known/jwks.json`, {
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new CognitoTokenError("JWKS_UNAVAILABLE");
  const document = await response.json() as JwksDocument;
  if (!Array.isArray(document.keys)) throw new CognitoTokenError("JWKS_INVALID");
  jwksCache.set(issuer, { expiresAt: Date.now() + 60 * 60 * 1000, document });
  return document;
}

function decodeJson<T>(value: string): T {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    throw new CognitoTokenError("TOKEN_MALFORMED");
  }
}

function includesAudience(audience: string | string[] | undefined, clientId: string) {
  return typeof audience === "string"
    ? audience === clientId
    : Array.isArray(audience) && audience.includes(clientId);
}

export async function verifyCognitoIdToken(input: {
  token: string;
  issuer: string;
  clientId: string;
  nonce?: string;
  nowSeconds?: number;
  loadJwks?: JwksLoader;
}): Promise<CognitoTokenVerification> {
  const parts = input.token.split(".");
  if (parts.length !== 3) throw new CognitoTokenError("TOKEN_MALFORMED");
  const [encodedHeader, encodedClaims, encodedSignature] = parts;
  const header = decodeJson<JwtHeader>(encodedHeader);
  const claims = decodeJson<JwtClaims>(encodedClaims);
  if (header.alg !== "RS256" || !header.kid) {
    throw new CognitoTokenError("TOKEN_ALGORITHM_INVALID");
  }

  const loader = input.loadJwks ?? loadRemoteJwks;
  let jwks = await loader(input.issuer);
  let jwk = jwks.keys.find((candidate) => candidate.kid === header.kid);
  if (!jwk && !input.loadJwks) {
    jwksCache.delete(input.issuer);
    jwks = await loader(input.issuer);
    jwk = jwks.keys.find((candidate) => candidate.kid === header.kid);
  }
  if (!jwk) throw new CognitoTokenError("TOKEN_SIGNING_KEY_UNKNOWN");
  let signatureValid = false;
  try {
    signatureValid = verifySignature(
      "RSA-SHA256",
      Buffer.from(`${encodedHeader}.${encodedClaims}`),
      createPublicKey({ key: jwk, format: "jwk" }),
      Buffer.from(encodedSignature, "base64url"),
    );
  } catch {
    throw new CognitoTokenError("TOKEN_SIGNATURE_INVALID");
  }
  if (!signatureValid) throw new CognitoTokenError("TOKEN_SIGNATURE_INVALID");

  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (claims.iss !== input.issuer) throw new CognitoTokenError("TOKEN_ISSUER_INVALID");
  if (!includesAudience(claims.aud, input.clientId)) {
    throw new CognitoTokenError("TOKEN_AUDIENCE_INVALID");
  }
  if (claims.token_use !== "id") throw new CognitoTokenError("TOKEN_USE_INVALID");
  if (typeof claims.exp !== "number" || claims.exp <= now) {
    throw new CognitoTokenError("TOKEN_EXPIRED");
  }
  if (typeof claims.nbf === "number" && claims.nbf > now + 60) {
    throw new CognitoTokenError("TOKEN_NOT_ACTIVE");
  }
  if (input.nonce && claims.nonce !== input.nonce) {
    throw new CognitoTokenError("TOKEN_NONCE_INVALID");
  }
  if (typeof claims.sub !== "string" || typeof claims.email !== "string") {
    throw new CognitoTokenError("TOKEN_IDENTITY_INCOMPLETE");
  }

  return {
    identity: {
      provider: "cognito",
      subjectId: claims.sub,
      email: claims.email.trim().toLowerCase(),
      emailVerified:
        claims.email_verified === true || claims.email_verified === "true",
    },
    expiresAt: claims.exp * 1000,
  };
}
