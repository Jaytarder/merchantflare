import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "merchantflare_admin";

export function getAdminEmail() {
  return process.env.ADMIN_EMAIL ?? "admin@merchantflare.ai";
}

function getAdminPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  if (process.env.NODE_ENV === "production") return null;
  return "MerchantFlare2026!";
}

function getSessionSecret