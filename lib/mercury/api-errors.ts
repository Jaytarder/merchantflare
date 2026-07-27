import { apiError } from "../api-response";
import {
  MercuryConversationConflictError,
  MercuryConversationNotFoundError,
} from "./conversation-repository";
import {
  MercuryPersistenceUnavailableError,
  MercuryPlanNotFoundError,
  MercuryWorkflowConflictError,
} from "./workflow-errors";

export function mercuryApiError(error: unknown) {
  if (error instanceof MercuryPersistenceUnavailableError) {
    return apiError(
      "persistence_unavailable",
      "Mercury conversations are unavailable until PostgreSQL is configured.",
      503,
    );
  }

  if (error instanceof MercuryConversationNotFoundError) {
    return apiError("not_found", error.message, 404);
  }

  if (error instanceof MercuryConversationConflictError) {
    return apiError("conflict", error.message, 409);
  }

  if (error instanceof MercuryPlanNotFoundError) {
    return apiError("not_found", error.message, 404);
  }

  if (error instanceof MercuryWorkflowConflictError) {
    return apiError("conflict", error.message, 409);
  }

  return null;
}
