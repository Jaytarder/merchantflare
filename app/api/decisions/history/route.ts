import { decisionRequest } from "../../../../lib/decision/http";
import { requirePermission } from "../../../../lib/platform/authorization";

export async function GET(request: Request) {
  return decisionRequest(
    async (repository, principal) => {
      requirePermission(principal, "decisions.read");
      const params = new URL(request.url).searchParams;
      const requested = Number(params.get("limit") ?? "100");
      const events = await repository.listHistory(
        principal.organizationId,
        params.get("caseId") ?? undefined,
        Number.isFinite(requested) ? requested : 100,
      );
      return { events, count: events.length };
    },
    { failureMessage: "Decision history could not be loaded." },
  );
}
