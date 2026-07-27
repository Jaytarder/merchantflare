import { NextResponse } from "next/server";
import { apiError } from "../../../../lib/api-response";
import { orchestrate } from "../../../../lib/mercury/orchestrator";
import { saveOrchestrationResult } from "../../../../lib/mercury/repository";
import { getAuthenticatedAdmin } from "../../../../lib/server-auth";

export async function POST(request: Request) {
  const session = await getAuthenticatedAdmin();
  if (!session) {
    return apiError(
      "authentication_required",
      "Sign in to create a Mercury plan.",
      401,
    );
  }

  try {
    const body = (await request.json()) as { objective?: unknown };
    const objective = typeof body.objective === "string" ? body.objective.trim() : "";

    if (!objective) {
      return apiError(
        "invalid_request",
        "Objective is required.",
        400,
      );
    }

    if (objective.length > 500) {
      return apiError(
        "invalid_request",
        "Objective must be 500 characters or fewer.",
        400,
      );
    }

    const result = await orchestrate(objective);
    const persistence = await saveOrchestrationResult(result, {
      organizationId: session.organizationId,
    });

    return NextResponse.json({
      ...result,
      persistence,
    });
  } catch (error) {
    console.error("Mercury planning failed", error);
    return apiError(
      "internal_error",
      "Mercury could not create a plan. Please try again.",
      500,
    );
  }
}
