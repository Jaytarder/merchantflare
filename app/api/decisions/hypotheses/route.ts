import { createDecisionHypothesis } from "../../../../lib/decision/service";
import { decisionCaseCollection, decisionRequest } from "../../../../lib/decision/http";

export async function GET(request: Request) {
  return decisionRequest(
    async (repository, principal) => {
      const hypotheses = await decisionCaseCollection(request, repository, principal, "hypotheses");
      return { hypotheses, count: hypotheses.length };
    },
    { failureMessage: "Hypotheses could not be loaded." },
  );
}

export async function POST(request: Request) {
  return decisionRequest(
    async (repository, principal) => ({
      hypothesis: await createDecisionHypothesis(repository, principal, await request.json()),
    }),
    { successStatus: 201, failureMessage: "Hypothesis could not be recorded." },
  );
}
