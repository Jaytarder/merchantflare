import { NextResponse } from "next/server";
import { apiError } from "../api-response";
import { platformApiError } from "../platform/api-errors";
import { requirePlatformDatabase } from "../platform/server";
import { getAuthenticatedPrincipal } from "../server-auth";
import { PostgresDecisionRepository } from "./repository";
import type { OrganizationPrincipal } from "../platform/authorization";
import { requirePermission } from "../platform/authorization";
import { PlatformNotFoundError, PlatformValidationError } from "../platform/errors";
import type { DecisionCaseDetail } from "./types";

export async function decisionRequest<T>(
  action: (
    repository: PostgresDecisionRepository,
    principal: OrganizationPrincipal,
  ) => Promise<T>,
  options: { successStatus?: number; failureMessage: string },
) {
  const principal = await getAuthenticatedPrincipal();
  if (!principal) {
    return apiError(
      "authentication_required",
      "Sign in to access Decision Cases.",
      401,
    );
  }
  try {
    const repository = new PostgresDecisionRepository(requirePlatformDatabase());
    const result = await action(repository, principal);
    return NextResponse.json(result, { status: options.successStatus ?? 200 });
  } catch (error) {
    const response = platformApiError(error);
    if (response) return response;
    console.error(options.failureMessage, error);
    return apiError("internal_error", options.failureMessage, 500);
  }
}

export async function decisionCaseCollection<K extends keyof Pick<
  DecisionCaseDetail,
  "evidence" | "evidenceLinks" | "beliefs" | "hypotheses" | "experiments" | "interventions" | "outcomes" | "lessons"
>>(
  request: Request,
  repository: PostgresDecisionRepository,
  principal: OrganizationPrincipal,
  key: K,
) {
  requirePermission(principal, "decisions.read");
  const caseId = new URL(request.url).searchParams.get("caseId");
  if (!caseId) {
    throw new PlatformValidationError("caseId is required.");
  }
  const detail = await repository.getCaseDetail(principal.organizationId, caseId);
  if (!detail) throw new PlatformNotFoundError("Decision Case");
  return detail[key];
}
