import { NextResponse } from "next/server";
import { apiError } from "../api-response";
import { platformApiError } from "../platform/api-errors";
import { requirePlatformDatabase } from "../platform/server";
import { getAuthenticatedPrincipal } from "../server-auth";
import { PostgresOracleRepository } from "./repository";
import type { OrganizationPrincipal } from "../platform";

export async function oracleRequest<T>(action: (repository: PostgresOracleRepository, principal: OrganizationPrincipal) => Promise<T>, options: { status?: number; failure: string }) {
  const principal = await getAuthenticatedPrincipal();
  if (!principal) return apiError("authentication_required", "Sign in to access Demand & Availability.", 401);
  try {
    const result = await action(new PostgresOracleRepository(requirePlatformDatabase()), principal);
    return NextResponse.json(result, { status: options.status ?? 200 });
  } catch (error) {
    const known = platformApiError(error);
    if (known) return known;
    console.error(options.failure, error instanceof Error ? error.name : "UnknownError");
    return apiError("internal_error", options.failure, 500);
  }
}
