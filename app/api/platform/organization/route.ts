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
      "Sign in to access organization settings.",
      401,
    );
  }
  try {
    const service = new PostgresOrganizationService(requirePlatformDatabase());
    const [organization, settings] = await Promise.all([
      service.getOrganization(principal),
      service.getSettings(principal),
    ]);
    return NextResponse.json({ organization, settings });
  } catch (error) {
    const response = platformApiError(error);
    if (response) return response;
    console.error("Organization settings loading failed", error);
    return apiError(
      "internal_error",
      "Organization settings could not be loaded.",
      500,
    );
  }
}

export async function PATCH(request: Request) {
  const principal = await getAuthenticatedPrincipal();
  if (!principal) {
    return apiError(
      "authentication_required",
      "Sign in to update organization settings.",
      401,
    );
  }
  try {
    const body = (await request.json()) as {
      name?: unknown;
      timezone?: unknown;
      currency?: unknown;
      locale?: unknown;
      preferences?: unknown;
    };
    if (
      body.preferences !== undefined &&
      (!body.preferences ||
        typeof body.preferences !== "object" ||
        Array.isArray(body.preferences))
    ) {
      return apiError(
        "invalid_request",
        "Organization preferences must be an object.",
        400,
      );
    }
    const service = new PostgresOrganizationService(requirePlatformDatabase());
    const settings = await service.updateSettings(principal, {
      name: typeof body.name === "string" ? body.name : undefined,
      timezone:
        typeof body.timezone === "string" ? body.timezone : undefined,
      currency:
        typeof body.currency === "string" ? body.currency : undefined,
      locale: typeof body.locale === "string" ? body.locale : undefined,
      preferences: body.preferences as
        | Record<string, string | number | boolean | null>
        | undefined,
    });
    return NextResponse.json({ settings });
  } catch (error) {
    const response = platformApiError(error);
    if (response) return response;
    console.error("Organization settings update failed", error);
    return apiError(
      "internal_error",
      "Organization settings could not be updated.",
      500,
    );
  }
}
