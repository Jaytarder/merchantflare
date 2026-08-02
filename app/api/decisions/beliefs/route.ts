import { createDecisionBelief } from "../../../../lib/decision/service";
import { decisionCaseCollection, decisionRequest } from "../../../../lib/decision/http";

export async function GET(request: Request) {
  return decisionRequest(
    async (repository, principal) => {
      const beliefs = await decisionCaseCollection(request, repository, principal, "beliefs");
      return { beliefs, count: beliefs.length };
    },
    { failureMessage: "Beliefs could not be loaded." },
  );
}

export async function POST(request: Request) {
  return decisionRequest(
    async (repository, principal) => ({
      belief: await createDecisionBelief(repository, principal, await request.json()),
    }),
    { successStatus: 201, failureMessage: "Belief could not be recorded." },
  );
}
