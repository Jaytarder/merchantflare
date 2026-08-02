import { createDecisionOutcome } from "../../../../lib/decision/service";
import { decisionCaseCollection, decisionRequest } from "../../../../lib/decision/http";

export async function GET(request: Request) {
  return decisionRequest(
    async (repository, principal) => {
      const outcomes = await decisionCaseCollection(request, repository, principal, "outcomes");
      return { outcomes, count: outcomes.length };
    },
    { failureMessage: "Outcomes could not be loaded." },
  );
}

export async function POST(request: Request) {
  return decisionRequest(
    async (repository, principal) => ({
      outcome: await createDecisionOutcome(repository, principal, await request.json()),
    }),
    { successStatus: 201, failureMessage: "Outcome could not be recorded." },
  );
}
