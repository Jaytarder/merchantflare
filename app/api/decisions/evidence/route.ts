import { createDecisionEvidence } from "../../../../lib/decision/service";
import { decisionCaseCollection, decisionRequest } from "../../../../lib/decision/http";

export async function GET(request: Request) {
  return decisionRequest(
    async (repository, principal) => {
      const evidence = await decisionCaseCollection(request, repository, principal, "evidence");
      return { evidence, count: evidence.length };
    },
    { failureMessage: "Evidence could not be loaded." },
  );
}

export async function POST(request: Request) {
  return decisionRequest(
    async (repository, principal) => ({
      evidence: await createDecisionEvidence(repository, principal, await request.json()),
    }),
    { successStatus: 201, failureMessage: "Evidence could not be recorded." },
  );
}
