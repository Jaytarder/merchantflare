import { NextResponse } from "next/server";
import { apiError } from "../../../../../../lib/api-response";
import {
  isValidIdempotencyKey,
  readIdempotencyKey,
} from "../../../../../../lib/idempotency";
import { mercuryApiError } from "../../../../../../lib/mercury/api-errors";
import { getMercuryConversation } from "../../../../../../lib/mercury/conversation-repository";
import { decideMercuryApproval } from "../../../../../../lib/mercury/repository";
import { requirePermission } from "../../../../../../lib/platform/authorization";
import { getAuthenticatedPrincipal } from "../../../../../../lib/server-auth";

type ApprovalRouteContext = {
  params: Promise<{ planId: string }>;
};

export async function POST(
  request: Request,
  context: ApprovalRouteContext,
) {
  const session = await getAuthenticatedPrincipal();
  if (!session) {
    return apiError(
      "authentication_required",
      "Sign in to decide this Mercury approval.",
      401,
    );
  }

  try {
    requirePermission(session, "mercury.approve");
    const requestKey = readIdempotencyKey(request);
    if (!requestKey || !isValidIdempotencyKey(requestKey)) {
      return apiError(
        "invalid_request",
        "A valid Idempotency-Key is required for approval decisions.",
        400,
      );
    }

    const { planId } = await context.params;
    const body = (await request.json()) as {
      decision?: unknown;
      note?: unknown;
    };
    const decision =
      body.decision === "approved" || body.decision === "rejected"
        ? body.decision
        : undefined;
    const note = typeof body.note === "string" ? body.note.trim() : undefined;

    if (!decision) {
      return apiError(
        "invalid_request",
        "Decision must be approved or rejected.",
        400,
      );
    }
    if (decision === "rejected" && (!note || note.length < 5)) {
      return apiError(
        "invalid_request",
        "A rejection note of at least 5 characters is required.",
        400,
      );
    }
    if (note && note.length > 500) {
      return apiError(
        "invalid_request",
        "Approval notes must be 500 characters or fewer.",
        400,
      );
    }

    const result = await decideMercuryApproval({
      planId,
      decision,
      organizationId: session.organizationId,
      actorSubjectId: session.subjectId,
      decidedBy: session.email,
      decisionKey: requestKey,
      note,
    });
    const conversation = result.conversationId
      ? await getMercuryConversation(result.conversationId, session)
      : null;

    return NextResponse.json({
      approval: result,
      conversation,
    });
  } catch (error) {
    const response = mercuryApiError(error);
    if (response) return response;

    console.error("Mercury approval decision failed", error);
    return apiError(
      "internal_error",
      "Mercury could not record the approval decision. Please try again.",
      500,
    );
  }
}
