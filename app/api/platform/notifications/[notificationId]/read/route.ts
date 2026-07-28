import { NextResponse } from "next/server";
import { apiError } from "../../../../../../lib/api-response";
import { platformApiError } from "../../../../../../lib/platform/api-errors";
import { PostgresNotificationService } from "../../../../../../lib/platform/notifications";
import { requirePlatformDatabase } from "../../../../../../lib/platform/server";
import { getAuthenticatedPrincipal } from "../../../../../../lib/server-auth";

type NotificationRouteContext = {
  params: Promise<{ notificationId: string }>;
};

export async function POST(
  _request: Request,
  context: NotificationRouteContext,
) {
  const principal = await getAuthenticatedPrincipal();
  if (!principal) {
    return apiError(
      "authentication_required",
      "Sign in to update notifications.",
      401,
    );
  }
  try {
    const { notificationId } = await context.params;
    const service = new PostgresNotificationService(
      requirePlatformDatabase(),
    );
    const notification = await service.markRead(principal, notificationId);
    return NextResponse.json({ notification });
  } catch (error) {
    const response = platformApiError(error);
    if (response) return response;
    console.error("Notification read update failed", error);
    return apiError("internal_error", "The notification could not be updated.", 500);
  }
}
