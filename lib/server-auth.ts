import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  type AdminSession,
  verifyAdminSession,
} from "./auth";
import { getDatabase } from "./db";
import { ensureLegacyPrincipalProvisioned } from "./platform/legacy-bootstrap";

export async function getAuthenticatedPrincipal(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const principal = verifyAdminSession(cookieStore.get(ADMIN_COOKIE)?.value);
  const sql = getDatabase();
  if (principal && sql) {
    await ensureLegacyPrincipalProvisioned(sql, principal);
  }
  return principal;
}

export const getAuthenticatedAdmin = getAuthenticatedPrincipal;
