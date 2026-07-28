import { NextResponse } from "next/server";
import {
  AUTH_REQUEST_COOKIE,
  REFRESH_COOKIE,
  SESSION_COOKIE,
  getCognitoAuthConfig,
} from "../../../../lib/auth";
import { logoutUrl } from "../../../../lib/auth/cognito";

export async function POST(request: Request) {
  let destination = new URL("/login", request.url);
  try {
    destination = logoutUrl(getCognitoAuthConfig());
  } catch (error) {
    console.error(
      "[auth] LOGOUT_CONFIGURATION_FAILED",
      error instanceof Error ? error.name : "UnknownError",
    );
  }
  const response = NextResponse.redirect(destination, 303);
  for (const name of [SESSION_COOKIE, REFRESH_COOKIE, AUTH_REQUEST_COOKIE]) {
    response.cookies.set({
      name,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}
