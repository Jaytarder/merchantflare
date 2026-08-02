import { requirePermission } from "../../../../../lib/platform/authorization";
import { PlatformNotFoundError } from "../../../../../lib/platform/errors";
import { decisionRequest } from "../../../../../lib/decision/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  return decisionRequest(
    async (repository, principal) => {
      requirePermission(principal, "decisions.read");
      const { caseId } = await context.params;
      const decisionCase = await repository.getCaseDetail(
        principal.organizationId,
        caseId,
      );
      if (!decisionCase) throw new PlatformNotFoundError("Decision Case");
      return { decisionCase };
    },
    { failureMessage: "Decision Case could not be loaded." },
  );
}
