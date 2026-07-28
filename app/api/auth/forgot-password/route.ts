import { NextResponse } from "next/server";
import { getCognitoAuthConfig } from "../../../../lib/auth";
import { callbackUrl } from "../../../../lib/auth/cognito";

export async function GET(request: Request) {
  try {
    const config = getCognitoAuthConfig();
    const url = new URL("/forgotPassword", config.domain);
    url.search = new URLSearchParams({
      client_id: config.clientId,
      response_type: "code",
      redirect_uri: callbackUrl(config),
    }).toString();
    return NextResponse.redirect(url, 303);
  } catch (error) {
    console.error(
      "[auth] PASSWORD_RESET_CONFIGURATION_FAILED",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.redirect(
      new URL("/login?error=configuration_unavailable", request.url),
      303,
    );
  }
}
