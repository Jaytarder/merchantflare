import { NextResponse } from "next/server";
import { apiError } from "../../../../../../lib/api-response";
import { mercuryApiError } from "../../../../../../lib/mercury/api-errors";
import { createMercuryConversationTurn } from "../../../../../../lib/mercury/conversation-repository";
import { getAuthenticatedAdmin } from "../../../../../../lib/server-auth";

type ConversationMessageRouteContext = {
  params: Promise<{ conversationId: string }>;
};

export async function POST(
  request: Request,
  context: ConversationMessageRouteContext,
) {
  const session = await getAuthenticatedAdmin();
  if (!session) {
    return apiError(
      "authentication_required",
      "Sign in to continue this Mercury conversation.",
      401,
    );
  }

  try {
    const { conversationId } = await context.params;
    const body = (await request.json()) as { message?: unknown };
    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    if (message.length < 5 || message.length > 500) {
      return apiError(
        "invalid_request",
        "Your message must contain between 5 and 500 characters.",
        400,
      );
    }

    const conversation = await createMercuryConversationTurn({
      conversationId,
      message,
      principal: session,
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    const response = mercuryApiError(error);
    if (response) return response;

    console.error("Mercury message submission failed", error);
    return apiError(
      "internal_error",
      "Mercury could not process the message. Please try again.",
      500,
    );
  }
}
