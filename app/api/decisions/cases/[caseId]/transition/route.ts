import { decisionRequest } from "../../../../../../lib/decision/http";
import { transitionDecisionCase } from "../../../../../../lib/decision/service";

export async function POST(request: Request, context: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await context.params;
  return decisionRequest(
    async (repository, principal) => ({ decisionCase: await transitionDecisionCase(repository, principal, caseId, await request.json()) }),
    { failureMessage: "Decision Case could not transition." },
  );
}
