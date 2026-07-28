import { NextResponse } from "next/server";
import { apiError } from "../../../../lib/api-response";
import { platformApiError } from "../../../../lib/platform/api-errors";
import { PostgresNotificationService } from "../../../../lib/platform/notifications";
import { requirePlatformDatabase } from "../../../../lib/platform/server";
import { getAuthenticatedPrincipal } from "../../../../lib/server-auth";

export async function GET(request: Request) {
  const principal = await getAuthenticatedPrincipal();
  if (!principal) {
    return apiError(
      "authentication_required",
      "Sign in to access notifications.",
      401,
    );
  }
  try {
    const { searchParams } = new URL(request.url);
    const requestedLimit = Number(searchParams.get("limit") ?? "25");
    const limit = Number.isFinite(requestedLimit) ? requestedLimit : 25;
    const unreadOnly = searchParams.get("unread") === "true";
    const service = new PostgresNotificationService(
      requirePlatformDatabase(),
    );
    const notifications = await service.list(principal, {
      limit,
      unreadOnly,
    });
    return NextResponse.json({
      notifications,
      unreadCount: notifications.filter(
        (notification) => !notification.readAt,
      ).length,
    });
  } catch (error) {
    const response = platformApiError(error);
    if (response) return response;
    console.error("Notification listing failed", error);
    return apiError("internal_error", "Notifications could not be loaded.", 500);
  }
}
