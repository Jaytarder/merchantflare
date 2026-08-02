import { decisionRequest } from "../../../../../../lib/decision/http";
import { getDecisionChallenge } from "../../../../../../lib/decision/service";

export async function GET(_request: Request, context: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await context.params;
  return decisionRequest(
    async (repository, principal) => ({ challenge: await getDecisionChallenge(repository, principal, caseId) }),
    { failureMessage: "Decision self-challenge could not be loaded." },
  );
}
