import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "crypto";
import type { AuthenticatedPrincipal } from "../platform/identity";

export const SESSION_COOKIE = "merchantflare_session";
export const REFRESH_COOKIE = "merchantflare_refresh";
export const AUTH_REQUEST_COOKIE = "merchantflare_auth_request";
export const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
export const AUTH_REQUEST_MAX_AGE = 60 * 10;

export type AuthenticationSession = AuthenticatedPrincipal & {
  issuedAt: number;
};

export type AuthenticationRequest = {
  state: string;
  nonce: string;
  verifier: string;
  returnTo: string;
  expiresAt: number;
};

function key(secret: string, purpose: string) {
  return createHash("sha256").update(`${purpose}\0${secret}`).digest();
}

function equal(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signSession(session: AuthenticationSession, secret: string) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createHmac("sha256", key(secret, "session"))
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySession(
  value: string | null | undefined,
  secret: string,
  now = Date.now(),
): AuthenticationSession | null {
  if (!value) return null;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) return null;
  const expected = createHmac("sha256", key(secret, "session"))
    .update(payload)
    .digest("base64url");
  if (!equal(signature, expected)) return null;
  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<AuthenticationSession>;
    if (
      session.authenticationMethod !== "cognito" ||
      typeof session.subjectId !== "string" ||
      typeof session.email !== "string" ||
      typeof session.organizationId !== "string" ||
      typeof session.role !== "string" ||
      typeof session.sessionExpiresAt !== "number" ||
      session.sessionExpiresAt <= now ||
      typeof session.issuedAt !== "number"
    ) return null;
    return session as AuthenticationSession;
  } catch {
    return null;
  }
}

export function encryptCookie(value: unknown, secret: string, purpose: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret, purpose), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return `${iv.toString("base64url")}.${ciphertext.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`;
}

export function decryptCookie<T>(
  value: string | null | undefined,
  secret: string,
  purpose: string,
): T | null {
  if (!value) return null;
  const [iv, ciphertext, tag, extra] = value.split(".");
  if (!iv || !ciphertext || !tag || extra) return null;
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key(secret, purpose),
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return JSON.parse(Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8")) as T;
  } catch {
    return null;
  }
}
