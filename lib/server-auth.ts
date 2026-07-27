import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  type AdminSession,
  verifyAdminSession,
} from "./auth";

export async function getAuthenticatedAdmin(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  return verifyAdminSession(cookieStore.get(ADMIN_COOKIE)?.value);
}
