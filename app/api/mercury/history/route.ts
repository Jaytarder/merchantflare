import { NextResponse } from "next/server";
import { apiError } from "../../../../lib/api-response";
import { listMercuryPlans } from "../../../../lib/mercury/repository";
import { requirePermission } from "../../../../lib/platform/authorization";
import { getAuthenticatedPrincipal } from "../../../../lib/server-auth";

export async function GET(request: Request) {
  const session = await getAuthenticatedPrincipal();
  if (!session) {
    return apiError(
      "authentication_required",
      "Sign in to access Mercury history.",
      401,
    );
  }

  try {
    requirePermission(session, "mercury.read");
    const { searchParams } = new URL(request.url);
    const requestedLimit = Number(searchParams.get("limit") ?? "25");
    const limit = Number.isFinite(requestedLimit) ? requestedLimit : 25;

    const plans = await listMercuryPlans(session.organizationId, limit);

    return NextResponse.json({
      plans,
      count: plans.length,
    });
  } catch (error) {
    console.error("Mercury history failed", error);
    return apiError(
      "internal_error",
      "Mercury could not load plan history. Please try again.",
      500,
    );
  }
}
