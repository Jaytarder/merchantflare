import { NextResponse } from "next/server";
import {
  AUTH_REQUEST_COOKIE,
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE,
  SESSION_COOKIE,
  decryptCookie,
  encryptCookie,
  getCognitoAuthConfig,
  signSession,
  type AuthenticationRequest,
} from "../../../../lib/auth";
import { exchangeAuthorizationCode } from "../../../../lib/auth/cognito";
import { verifyCognitoIdToken } from "../../../../lib/auth/jwt";
import { resolveCognitoPrincipal } from "../../../../lib/auth/principal";
import { getDatabase } from "../../../../lib/db";

function loginError(request: Request, code: string) {
  return NextResponse.redirect(new URL(`/login?error=${code}`, request.url), 303);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  if (requestUrl.searchParams.has("error")) {
    return loginError(request, "authorization_cancelled");
  }
  try {
    const config = getCognitoAuthConfig();
    const authRequest = decryptCookie<AuthenticationRequest>(
      request.headers.get("cookie")
        ?.split(";")
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith(`${AUTH_REQUEST_COOKIE}=`))
        ?.slice(AUTH_REQUEST_COOKIE.length + 1),
      config.sessionSecret,
      "auth-request",
    );
    const state = requestUrl.searchParams.get("state");
    const code = requestUrl.searchParams.get("code");
    if (
      !authRequest ||
      authRequest.expiresAt <= Date.now() ||
      !state ||
      state !== authRequest.state ||
      !code
    ) return loginError(request, "callback_invalid");

    const tokens = await exchangeAuthorizationCode(config, code, authRequest.verifier);
    const verified = await verifyCognitoIdToken({
      token: tokens.id_token,
      issuer: config.issuer,
      clientId: config.clientId,
      nonce: authRequest.nonce,
    });
    const sql = getDatabase();
    if (!sql) {
      console.error("[auth] CALLBACK_DATABASE_UNAVAILABLE");
      return loginError(request, "service_unavailable");
    }
    const resolution = await resolveCognitoPrincipal(
      sql,
      verified.identity,
      verified.expiresAt,
    );
    if (!resolution.ok) return loginError(request, resolution.reason);

    const response = NextResponse.redirect(
      new URL(authRequest.returnTo, config.applicationBaseUrl),
      303,
    );
    response.cookies.set({
      name: SESSION_COOKIE,
      value: signSession({
        ...resolution.principal,
        issuedAt: Date.now(),
      }, config.sessionSecret),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(0, Math.floor((verified.expiresAt - Date.now()) / 1000)),
    });
    if (tokens.refresh_token) {
      response.cookies.set({
        name: REFRESH_COOKIE,
        value: encryptCookie(
          { token: tokens.refresh_token },
          config.sessionSecret,
          "refresh-token",
        ),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: REFRESH_COOKIE_MAX_AGE,
      });
    }
    response.cookies.set({
      name: AUTH_REQUEST_COOKIE,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error(
      "[auth] CALLBACK_FAILED",
      error instanceof Error ? error.name : "UnknownError",
    );
    return loginError(request, "callback_failed");
  }
}
