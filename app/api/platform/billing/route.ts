import { NextResponse } from "next/server";
import { apiError } from "../../../../lib/api-response";
import { platformApiError } from "../../../../lib/platform/api-errors";
import { PostgresSubscriptionService } from "../../../../lib/platform/billing";
import { requirePlatformDatabase } from "../../../../lib/platform/server";
import { getAuthenticatedPrincipal } from "../../../../lib/server-auth";

export async function GET() {
  const principal = await getAuthenticatedPrincipal();
  if (!principal) {
    return apiError(
      "authentication_required",
      "Sign in to access subscription information.",
      401,
    );
  }
  try {
    const service = new PostgresSubscriptionService(
      requirePlatformDatabase(),
    );
    const subscription = await service.get(principal);
    return NextResponse.json({ subscription });
  } catch (error) {
    const response = platformApiError(error);
    if (response) return response;
    console.error("Subscription loading failed", error);
    return apiError(
      "internal_error",
      "Subscription information could not be loaded.",
      500,
    );
  }
}
