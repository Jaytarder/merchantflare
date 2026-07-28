import { NextResponse } from "next/server";
import { apiError } from "../../../../lib/api-response";
import {
  createMercuryConversationTurn,
  listMercuryConversations,
} from "../../../../lib/mercury/conversation-repository";
import { mercuryApiError } from "../../../../lib/mercury/api-errors";
import { requirePermission } from "../../../../lib/platform/authorization";
import { getAuthenticatedPrincipal } from "../../../../lib/server-auth";
import {
  isValidIdempotencyKey,
  readIdempotencyKey,
} from "../../../../lib/idempotency";

export async function GET(request: Request) {
  const session = await getAuthenticatedPrincipal();
  if (!session) {
    return apiError(
      "authentication_required",
      "Sign in to access Mercury conversations.",
      401,
    );
  }

  try {
    requirePermission(session, "mercury.read");
    const { searchParams } = new URL(request.url);
    const requestedLimit = Number(searchParams.get("limit") ?? "30");
    const limit = Number.isFinite(requestedLimit) ? requestedLimit : 30;
    const requestedStatus = searchParams.get("status");
    const status = requestedStatus === "archived" ? "archived" : "active";
    const conversations = await listMercuryConversations(
      session,
      limit,
      status,
    );

    return NextResponse.json({
      conversations,
      count: conversations.length,
    });
  } catch (error) {
    const response = mercuryApiError(error);
    if (response) return response;

    console.error("Mercury conversation listing failed", error);
    return apiError(
      "internal_error",
      "Mercury could not load conversations. Please try again.",
      500,
    );
  }
}

export async function POST(request: Request) {
  const session = await getAuthenticatedPrincipal();
  if (!session) {
    return apiError(
      "authentication_required",
      "Sign in to start a Mercury conversation.",
      401,
    );
  }

  try {
    requirePermission(session, "mercury.write");
    const requestKey = readIdempotencyKey(request);
    if (!isValidIdempotencyKey(requestKey)) {
      return apiError(
        "invalid_request",
        "Idempotency-Key must contain between 8 and 128 safe characters.",
        400,
      );
    }
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
      message,
      principal: session,
      requestKey,
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    const response = mercuryApiError(error);
    if (response) return response;

    console.error("Mercury conversation creation failed", error);
    return apiError(
      "internal_error",
      "Mercury could not start the conversation. Please try again.",
      500,
    );
  }
}
