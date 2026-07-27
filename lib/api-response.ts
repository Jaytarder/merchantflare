import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "authentication_required"
  | "invalid_request"
  | "not_found"
  | "persistence_unavailable"
  | "conflict"
  | "internal_error";

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
) {
  return NextResponse.json({ error: message, code }, { status });
}
