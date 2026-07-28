import { apiError } from "../api-response";
import {
  OrganizationScopeError,
  PlatformAuthorizationError,
} from "./authorization";
import {
  PlatformConflictError,
  PlatformNotFoundError,
  PlatformPersistenceUnavailableError,
  PlatformValidationError,
} from "./errors";

export function platformApiError(error: unknown) {
  if (
    error instanceof PlatformAuthorizationError ||
    error instanceof OrganizationScopeError
  ) {
    return apiError("permission_denied", error.message, 403);
  }
  if (error instanceof PlatformValidationError) {
    return apiError("invalid_request", error.message, 400);
  }
  if (error instanceof PlatformNotFoundError) {
    return apiError("not_found", error.message, 404);
  }
  if (error instanceof PlatformConflictError) {
    return apiError("conflict", error.message, 409);
  }
  if (error instanceof PlatformPersistenceUnavailableError) {
    return apiError("persistence_unavailable", error.message, 503);
  }
  return null;
}
