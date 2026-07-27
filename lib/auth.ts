import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "merchantflare_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 8;

export type AdminSession = {
  email: string;
  organizationId: string;
  role: "super_admin";
  expiresAt: number;
};

export function getAdminEmail() {
  return (process.env.ADMIN_EMAIL ?? "jmartin@merchantflare.com").toLowerCase();
}

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD ?? "MerchantFlare2026!";
}

export function getAdminOrganizationId() {
  return process.env.ADMIN_ORGANIZATION_ID ?? "org_merchantflare";
}

function getSessionSecret() {
  return process.env.SESSION_SECRET ?? "merchantflare-development-session-secret-change-me";
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
    email: getAdminEmail(),
    organizationId: getAdminOrganizationId(),
    role: "super_admin",
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
    if (
      session.role !== "super_admin" ||
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= Date.now() ||
      typeof session.email !== "string"
    ) {
      return null;
    }

    return {
      email: session.email,
      organizationId:
        typeof session.organizationId === "string"
          ? session.organizationId
          : getAdminOrganizationId(),
      role: session.role,
      expiresAt: session.expiresAt,
    };
  } catch {
    return null;
  }
}
