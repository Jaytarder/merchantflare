import { requirePermission } from "../../../../lib/platform/authorization";
import { createDecisionCase } from "../../../../lib/decision/service";
import { decisionRequest } from "../../../../lib/decision/http";

export async function GET(request: Request) {
  return decisionRequest(
    async (repository, principal) => {
      requirePermission(principal, "decisions.read");
      const requested = Number(new URL(request.url).searchParams.get("limit") ?? "50");
      const cases = await repository.listCases(
        principal.organizationId,
        Number.isFinite(requested) ? requested : 50,
      );
      return { cases, count: cases.length };
    },
    { failureMessage: "Decision Cases could not be loaded." },
  );
}

export async function POST(request: Request) {
  return decisionRequest(
    async (repository, principal) => ({
      decisionCase: await createDecisionCase(
        repository,
        principal,
        await request.json(),
      ),
    }),
    { successStatus: 201, failureMessage: "Decision Case could not be created." },
  );
}
