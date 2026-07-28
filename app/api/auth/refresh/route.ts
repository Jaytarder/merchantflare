import { NextResponse } from "next/server";
import {
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE,
  SESSION_COOKIE,
  decryptCookie,
  encryptCookie,
  getCognitoAuthConfig,
  safeRedirectPath,
  signSession,
} from "../../../../lib/auth";
import { refreshCognitoTokens } from "../../../../lib/auth/cognito";
import { verifyCognitoIdToken } from "../../../../lib/auth/jwt";
import { resolveCognitoPrincipal } from "../../../../lib/auth/principal";
import { getDatabase } from "../../../../lib/db";

async function refresh(request: Request) {
  const config = getCognitoAuthConfig();
  const cookieHeader = request.headers.get("cookie") ?? "";
  const encrypted = cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${REFRESH_COOKIE}=`))
    ?.slice(REFRESH_COOKIE.length + 1);
  const refreshValue = decryptCookie<{ token: string }>(
    encrypted,
    config.sessionSecret,
    "refresh-token",
  );
  if (!refreshValue?.token) throw new Error("REFRESH_COOKIE_INVALID");

  const tokens = await refreshCognitoTokens(config, refreshValue.token);
  const verified = await verifyCognitoIdToken({
    token: tokens.id_token,
    issuer: config.issuer,
    clientId: config.clientId,
  });
  const sql = getDatabase();
  if (!sql) throw new Error("DATABASE_UNAVAILABLE");
  const resolution = await resolveCognitoPrincipal(
    sql,
    verified.identity,
    verified.expiresAt,
  );
  if (!resolution.ok) throw new Error(resolution.reason.toUpperCase());
  return { config, tokens, verified, principal: resolution.principal, refreshValue };
}

function setCookies(
  response: NextResponse,
  result: Awaited<ReturnType<typeof refresh>>,
) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: signSession({
      ...result.principal,
      issuedAt: Date.now(),
    }, result.config.sessionSecret),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(0, Math.floor((result.verified.expiresAt - Date.now()) / 1000)),
  });
  response.cookies.set({
    name: REFRESH_COOKIE,
    value: requestRefreshCookie(result),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

function requestRefreshCookie(result: Awaited<ReturnType<typeof refresh>>) {
  const token = result.tokens.refresh_token ?? result.refreshValue.token;
  return encryptCookie({ token }, result.config.sessionSecret, "refresh-token");
}

export async function GET(request: Request) {
  const returnTo = safeRedirectPath(new URL(request.url).searchParams.get("returnTo"));
  try {
    const result = await refresh(request);
    const response = NextResponse.redirect(
      new URL(returnTo, result.config.applicationBaseUrl),
      303,
    );
    setCookies(response, result);
    return response;
  } catch (error) {
    console.error("[auth] REFRESH_FAILED", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.redirect(
      new URL(`/login?error=session_expired&returnTo=${encodeURIComponent(returnTo)}`, request.url),
      303,
    );
  }
}

export async function POST(request: Request) {
  try {
    const result = await refresh(request);
    const response = NextResponse.json({ ok: true });
    setCookies(response, result);
    return response;
  } catch (error) {
    console.error("[auth] REFRESH_FAILED", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });
  }
}
