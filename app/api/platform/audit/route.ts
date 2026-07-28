import { NextResponse } from "next/server";
import { apiError } from "../../../../lib/api-response";
import { PostgresAuditEventRepository } from "../../../../lib/platform/audit";
import { platformApiError } from "../../../../lib/platform/api-errors";
import { requirePermission } from "../../../../lib/platform/authorization";
import { requirePlatformDatabase } from "../../../../lib/platform/server";
import { getAuthenticatedPrincipal } from "../../../../lib/server-auth";

export async function GET(request: Request) {
  const principal = await getAuthenticatedPrincipal();
  if (!principal) {
    return apiError(
      "authentication_required",
      "Sign in to access organization audit history.",
      401,
    );
  }
  try {
    requirePermission(principal, "audit.read");
    const { searchParams } = new URL(request.url);
    const requestedLimit = Number(searchParams.get("limit") ?? "100");
    const limit = Number.isFinite(requestedLimit) ? requestedLimit : 100;
    const before = searchParams.get("before") ?? undefined;
    const repository = new PostgresAuditEventRepository(
      requirePlatformDatabase(),
    );
    const events = await repository.list({
      organizationId: principal.organizationId,
      limit,
      before,
    });
    return NextResponse.json({ events, count: events.length });
  } catch (error) {
    const response = platformApiError(error);
    if (response) return response;
    console.error("Audit history loading failed", error);
    return apiError("internal_error", "Audit history could not be loaded.", 500);
  }
}
