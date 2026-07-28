import { createHmac, timingSafeEqual } from "crypto";
import type { AuthenticatedPrincipal } from "./platform/identity";

export const ADMIN_COOKIE = "merchantflare_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 8;

export type AdminSession = AuthenticatedPrincipal & {
  expiresAt: number;
};

function environmentValue(
  key: string,
  developmentFallback: string,
) {
  const value = process.env[key]?.trim();
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${key} must be configured in production.`);
  }
  return developmentFallback;
}

export function getAdminEmail() {
  return environmentValue(
    "ADMIN_EMAIL",
    "jmartin@merchantflare.com",
  ).toLowerCase();
}

export function getAdminPassword() {
  return environmentValue("ADMIN_PASSWORD", "MerchantFlare2026!");
}

export function getAdminOrganizationId() {
  return environmentValue(
    "ADMIN_ORGANIZATION_ID",
    "org_merchantflare",
  );
}

function getSessionSecret() {
  return environmentValue(
    "SESSION_SECRET",
    "merchantflare-development-session-secret-change-me",
  );
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function validateAdminCredentials(email: string, password: string) {
  const expectedEmail = getAdminEmail();
  const expectedPassword = getAdminPassword();
  return safeEqual(email.trim().toLowerCase(), expectedEmail) && safeEqual(password, expectedPassword);
}

export function createAdminSession() {
  const session: AdminSession = {
    subjectId: `legacy:${getAdminEmail()}`,
    email: getAdminEmail(),
    organizationId: getAdminOrganizationId(),
    role: "owner",
    authenticationMethod: "legacy-cookie",
    sessionExpiresAt: Date.now() + ADMIN_COOKIE_MAX_AGE * 1000,
    expiresAt: Date.now() + ADMIN_COOKIE_MAX_AGE * 1000,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSession(value?: string | null): AdminSession | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<AdminSession>;
    const legacyRole = (session as { role?: string }).role;
    if (
      legacyRole !== "super_admin" &&
      legacyRole !== "owner"
    ) {
      return null;
    }
    if (
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= Date.now() ||
      typeof session.email !== "string"
    ) {
      return null;
    }

    return {
      subjectId:
        typeof session.subjectId === "string"
          ? session.subjectId
          : `legacy:${session.email.toLowerCase()}`,
      email: session.email,
      organizationId:
        typeof session.organizationId === "string"
          ? session.organizationId
          : getAdminOrganizationId(),
      role: "owner",
      authenticationMethod: "legacy-cookie",
      sessionExpiresAt: session.expiresAt,
      expiresAt: session.expiresAt,
    };
  } catch {
    return null;
  }
}
