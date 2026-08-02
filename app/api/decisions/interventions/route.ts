import { createDecisionIntervention } from "../../../../lib/decision/service";
import { decisionCaseCollection, decisionRequest } from "../../../../lib/decision/http";

export async function GET(request: Request) {
  return decisionRequest(
    async (repository, principal) => {
      const interventions = await decisionCaseCollection(request, repository, principal, "interventions");
      return { interventions, count: interventions.length };
    },
    { failureMessage: "Interventions could not be loaded." },
  );
}

export async function POST(request: Request) {
  return decisionRequest(
    async (repository, principal) => ({
      intervention: await createDecisionIntervention(repository, principal, await request.json()),
    }),
    { successStatus: 201, failureMessage: "Intervention could not be proposed." },
  );
}
