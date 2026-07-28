const protectedPagePrefixes = ["/dashboard", "/atlas", "/workers"] as const;
const protectedApiPrefixes = ["/api/mercury", "/api/platform", "/api/atlas"] as const;

export type ProtectedRouteDecision =
  | { action: "allow" }
  | { action: "login"; returnTo: string }
  | { action: "refresh"; returnTo: string }
  | { action: "unauthorized" };

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function protectedRouteDecision(input: {
  pathname: string;
  returnTo: string;
  hasSession: boolean;
  hasRefreshToken: boolean;
}): ProtectedRouteDecision {
  const api = protectedApiPrefixes.some((prefix) => matches(input.pathname, prefix));
  const page = protectedPagePrefixes.some((prefix) => matches(input.pathname, prefix));
  if (!api && !page) return { action: "allow" };
  if (input.hasSession) return { action: "allow" };
  if (api) return { action: "unauthorized" };
  if (input.hasRefreshToken) return { action: "refresh", returnTo: input.returnTo };
  return { action: "login", returnTo: input.returnTo };
}
