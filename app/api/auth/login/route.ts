import { NextResponse } from "next/server";
import {
  AUTH_REQUEST_COOKIE,
  AUTH_REQUEST_MAX_AGE,
  encryptCookie,
  getCognitoAuthConfig,
  safeRedirectPath,
} from "../../../../lib/auth";
import { authorizationUrl } from "../../../../lib/auth/cognito";
import { createPkcePair, randomUrlSafeValue } from "../../../../lib/auth/pkce";

export async function GET(request: Request) {
  try {
    const config = getCognitoAuthConfig();
    const requestUrl = new URL(request.url);
    const returnTo = safeRedirectPath(requestUrl.searchParams.get("returnTo"));
    const state = randomUrlSafeValue();
    const nonce = randomUrlSafeValue();
    const { verifier, challenge } = createPkcePair();
    const response = NextResponse.redirect(
      authorizationUrl(config, { state, nonce, challenge }),
      303,
    );
    response.cookies.set({
      name: AUTH_REQUEST_COOKIE,
      value: encryptCookie({
        state,
        nonce,
        verifier,
        returnTo,
        expiresAt: Date.now() + AUTH_REQUEST_MAX_AGE * 1000,
      }, config.sessionSecret, "auth-request"),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: AUTH_REQUEST_MAX_AGE,
    });
    return response;
  } catch (error) {
    console.error(
      "[auth] LOGIN_CONFIGURATION_FAILED",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.redirect(
      new URL("/login?error=configuration_unavailable", request.url),
      303,
    );
  }
}
