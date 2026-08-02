import { createDecisionExperiment } from "../../../../lib/decision/service";
import { decisionCaseCollection, decisionRequest } from "../../../../lib/decision/http";

export async function GET(request: Request) {
  return decisionRequest(
    async (repository, principal) => {
      const experiments = await decisionCaseCollection(request, repository, principal, "experiments");
      return { experiments, count: experiments.length };
    },
    { failureMessage: "Experiments could not be loaded." },
  );
}

export async function POST(request: Request) {
  return decisionRequest(
    async (repository, principal) => ({
      experiment: await createDecisionExperiment(repository, principal, await request.json()),
    }),
    { successStatus: 201, failureMessage: "Experiment could not be created." },
  );
}
