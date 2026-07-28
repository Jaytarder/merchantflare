import { NextResponse } from "next/server";
import { apiError } from "../../../../lib/api-response";
import { isOrganizationRole } from "../../../../lib/platform/authorization";
import { platformApiError } from "../../../../lib/platform/api-errors";
import { PostgresOrganizationService } from "../../../../lib/platform/organizations";
import { requirePlatformDatabase } from "../../../../lib/platform/server";
import { getAuthenticatedPrincipal } from "../../../../lib/server-auth";

export async function GET() {
  const principal = await getAuthenticatedPrincipal();
  if (!principal) {
    return apiError(
      "authentication_required",
      "Sign in to access organization invitations.",
      401,
    );
  }
  try {
    const service = new PostgresOrganizationService(requirePlatformDatabase());
    const invitations = await service.listInvitations(principal);
    return NextResponse.json({ invitations, count: invitations.length });
  } catch (error) {
    const response = platformApiError(error);
    if (response) return response;
    console.error("Organization invitation listing failed", error);
    return apiError("internal_error", "Invitations could not be loaded.", 500);
  }
}

export async function POST(request: Request) {
  const principal = await getAuthenticatedPrincipal();
  if (!principal) {
    return apiError(
      "authentication_required",
      "Sign in to invite an organization member.",
      401,
    );
  }
  try {
    const body = (await request.json()) as {
      email?: unknown;
      role?: unknown;
    };
    if (
      typeof body.email !== "string" ||
      !isOrganizationRole(body.role) ||
      body.role === "owner"
    ) {
      return apiError(
        "invalid_request",
        "A valid email and non-owner organization role are required.",
        400,
      );
    }
    const service = new PostgresOrganizationService(requirePlatformDatabase());
    const issued = await service.inviteMember(principal, {
      email: body.email,
      role: body.role,
    });
    return NextResponse.json(issued, { status: 201 });
  } catch (error) {
    const response = platformApiError(error);
    if (response) return response;
    console.error("Organization invitation creation failed", error);
    return apiError("internal_error", "The invitation could not be created.", 500);
  }
}
