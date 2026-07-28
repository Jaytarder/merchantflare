import { NextRequest, NextResponse } from "next/server";
import { getCognitoAuthConfig } from "./lib/auth/config";
import { protectedRouteDecision } from "./lib/auth/protection";
import { verifySession } from "./lib/auth/session";

const SESSION_COOKIE = "merchantflare_session";
const REFRESH_COOKIE = "merchantflare_refresh";

export function proxy(request: NextRequest) {
  const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  let hasSession = false;
  try {
    const config = getCognitoAuthConfig();
    hasSession = Boolean(verifySession(
      request.cookies.get(SESSION_COOKIE)?.value,
      config.sessionSecret,
    ));
  } catch {
    hasSession = false;
  }
  const decision = protectedRouteDecision({
    pathname: request.nextUrl.pathname,
    returnTo,
    hasSession,
    hasRefreshToken: Boolean(request.cookies.get(REFRESH_COOKIE)?.value),
  });
  if (decision.action === "allow") return NextResponse.next();
  if (decision.action === "unauthorized") {
    return NextResponse.json(
      { error: "Authentication is required." },
      { status: 401 },
    );
  }
  const destination = request.nextUrl.clone();
  destination.pathname = decision.action === "refresh"
    ? "/api/auth/refresh"
    : "/login";
  destination.search = "";
  destination.searchParams.set("returnTo", decision.returnTo);
  return NextResponse.redirect(destination);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/atlas/:path*",
    "/workers/:path*",
    "/api/mercury/:path*",
    "/api/platform/:path*",
    "/api/atlas/:path*",
  ],
};
