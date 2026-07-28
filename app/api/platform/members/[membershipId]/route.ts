import { NextResponse } from "next/server";
import { apiError } from "../../../../../lib/api-response";
import { isOrganizationRole } from "../../../../../lib/platform/authorization";
import { platformApiError } from "../../../../../lib/platform/api-errors";
import { PostgresOrganizationService } from "../../../../../lib/platform/organizations";
import { requirePlatformDatabase } from "../../../../../lib/platform/server";
import { getAuthenticatedPrincipal } from "../../../../../lib/server-auth";

type MemberRouteContext = {
  params: Promise<{ membershipId: string }>;
};

export async function PATCH(
  request: Request,
  context: MemberRouteContext,
) {
  const principal = await getAuthenticatedPrincipal();
  if (!principal) {
    return apiError(
      "authentication_required",
      "Sign in to update an organization member.",
      401,
    );
  }
  try {
    const { membershipId } = await context.params;
    const body = (await request.json()) as { role?: unknown };
    if (!isOrganizationRole(body.role)) {
      return apiError(
        "invalid_request",
        "A valid organization role is required.",
        400,
      );
    }
    const service = new PostgresOrganizationService(requirePlatformDatabase());
    const member = await service.changeMemberRole(principal, {
      membershipId,
      role: body.role,
    });
    return NextResponse.json({ member });
  } catch (error) {
    const response = platformApiError(error);
    if (response) return response;
    console.error("Organization member update failed", error);
    return apiError("internal_error", "The member could not be updated.", 500);
  }
}

export async function DELETE(
  _request: Request,
  context: MemberRouteContext,
) {
  const principal = await getAuthenticatedPrincipal();
  if (!principal) {
    return apiError(
      "authentication_required",
      "Sign in to remove an organization member.",
      401,
    );
  }
  try {
    const { membershipId } = await context.params;
    const service = new PostgresOrganizationService(requirePlatformDatabase());
    await service.removeMember(principal, membershipId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const response = platformApiError(error);
    if (response) return response;
    console.error("Organization member removal failed", error);
    return apiError("internal_error", "The member could not be removed.", 500);
  }
}
