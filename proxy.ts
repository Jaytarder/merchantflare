import { NextRequest, NextResponse } from "next/server";
import { protectedRouteDecision } from "./lib/auth/protection";

const SESSION_COOKIE = "merchantflare_session";
const REFRESH_COOKIE = "merchantflare_refresh";

export function proxy(request: NextRequest) {
  const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  // Runtime secrets are intentionally injected only when the container starts.
  // The proxy bundle can be built before those secrets exist, so this gateway
  // performs presence-based routing only. Every protected server page and API
  // cryptographically verifies the session and re-resolves active organization
  // membership through getAuthenticatedPrincipal().
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
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
    "/oracle/:path*",
    "/vector/:path*",
    "/approvals/:path*",
    "/knowledge/:path*",
    "/experiments/:path*",
    "/evidence/:path*",
    "/workers/:path*",
    "/api/mercury/:path*",
    "/api/platform/:path*",
    "/api/atlas/:path*",
    "/api/oracle/:path*",
    "/api/vector/:path*",
    "/api/decisions/:path*",
  ],
};
