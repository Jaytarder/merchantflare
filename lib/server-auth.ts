import { cookies } from "next/headers";
import {
  getCognitoAuthConfig,
  SESSION_COOKIE,
  verifySession,
} from "./auth";
import { getDatabase } from "./db";
import {
  PostgresMembershipResolver,
  principalFromVerifiedIdentity,
  type AuthenticatedPrincipal,
} from "./platform/identity";

export async function getAuthenticatedPrincipal(): Promise<AuthenticatedPrincipal | null> {
  try {
    const config = getCognitoAuthConfig();
    const cookieStore = await cookies();
    const session = verifySession(
      cookieStore.get(SESSION_COOKIE)?.value,
      config.sessionSecret,
    );
    if (!session) return null;

    const sql = getDatabase();
    if (!sql) {
      console.error("[auth] DATABASE_UNAVAILABLE");
      return null;
    }
    const membership = await new PostgresMembershipResolver(sql).resolve(
      {
        provider: "cognito",
        subjectId: session.subjectId,
        email: session.email,
        emailVerified: true,
      },
      session.organizationId,
    );
    if (!membership) return null;
    return principalFromVerifiedIdentity({
      identity: {
        provider: "cognito",
        subjectId: session.subjectId,
        email: session.email,
        emailVerified: true,
      },
      membership,
      sessionExpiresAt: session.sessionExpiresAt,
    });
  } catch (error) {
    console.error(
      "[auth] SESSION_VALIDATION_FAILED",
      error instanceof Error ? error.name : "UnknownError",
    );
    return null;
  }
}

export const getAuthenticatedAdmin = getAuthenticatedPrincipal;
