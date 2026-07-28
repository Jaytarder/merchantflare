import { NextResponse } from "next/server";
import { apiError } from "../../../../../lib/api-response";
import {
  getMercuryConversation,
  updateMercuryConversation,
} from "../../../../../lib/mercury/conversation-repository";
import type { ConversationStatus } from "../../../../../lib/mercury/conversation-types";
import { mercuryApiError } from "../../../../../lib/mercury/api-errors";
import { requirePermission } from "../../../../../lib/platform/authorization";
import { getAuthenticatedPrincipal } from "../../../../../lib/server-auth";

type ConversationRouteContext = {
  params: Promise<{ conversationId: string }>;
};

export async function GET(
  _request: Request,
  context: ConversationRouteContext,
) {
  const session = await getAuthenticatedPrincipal();
  if (!session) {
    return apiError(
      "authentication_required",
      "Sign in to access this Mercury conversation.",
      401,
    );
  }

  try {
    requirePermission(session, "mercury.read");
    const { conversationId } = await context.params;
    const conversation = await getMercuryConversation(
      conversationId,
      session,
    );

    if (!conversation) {
      return apiError("not_found", "Mercury conversation was not found.", 404);
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    const response = mercuryApiError(error);
    if (response) return response;

    console.error("Mercury conversation loading failed", error);
    return apiError(
      "internal_error",
      "Mercury could not load the conversation. Please try again.",
      500,
    );
  }
}

export async function PATCH(
  request: Request,
  context: ConversationRouteContext,
) {
  const session = await getAuthenticatedPrincipal();
  if (!session) {
    return apiError(
      "authentication_required",
      "Sign in to update this Mercury conversation.",
      401,
    );
  }

  try {
    requirePermission(session, "mercury.write");
    const { conversationId } = await context.params;
    const body = (await request.json()) as {
      title?: unknown;
      status?: unknown;
    };
    const title =
      typeof body.title === "string" ? body.title.trim() : undefined;
    const status =
      body.status === "active" || body.status === "archived"
        ? (body.status as ConversationStatus)
        : undefined;

    if (body.title !== undefined && (!title || title.length > 100)) {
      return apiError(
        "invalid_request",
        "Conversation titles must contain between 1 and 100 characters.",
        400,
      );
    }

    if (body.status !== undefined && status === undefined) {
      return apiError(
        "invalid_request",
        "Conversation status must be active or archived.",
        400,
      );
    }

    if (title === undefined && status === undefined) {
      return apiError(
        "invalid_request",
        "Provide a title or status to update.",
        400,
      );
    }

    const conversation = await updateMercuryConversation({
      conversationId,
      principal: session,
      title,
      status,
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    const response = mercuryApiError(error);
    if (response) return response;

    console.error("Mercury conversation update failed", error);
    return apiError(
      "internal_error",
      "Mercury could not update the conversation. Please try again.",
      500,
    );
  }
}
