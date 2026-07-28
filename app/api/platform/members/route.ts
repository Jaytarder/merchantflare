import { NextResponse } from "next/server";
import { apiError } from "../../../../lib/api-response";
import { platformApiError } from "../../../../lib/platform/api-errors";
import { PostgresOrganizationService } from "../../../../lib/platform/organizations";
import { requirePlatformDatabase } from "../../../../lib/platform/server";
import { getAuthenticatedPrincipal } from "../../../../lib/server-auth";

export async function GET() {
  const principal = await getAuthenticatedPrincipal();
  if (!principal) {
    return apiError(
      "authentication_required",
      "Sign in to access organization members.",
      401,
    );
  }
  try {
    const service = new PostgresOrganizationService(requirePlatformDatabase());
    const members = await service.listMembers(principal);
    return NextResponse.json({ members, count: members.length });
  } catch (error) {
    const response = platformApiError(error);
    if (response) return response;
    console.error("Organization member listing failed", error);
    return apiError("internal_error", "Members could not be loaded.", 500);
  }
}
