import { decisionRequest } from "../../../../../../lib/decision/http";
import { decideDecisionExperiment } from "../../../../../../lib/decision/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ experimentId: string }> },
) {
  return decisionRequest(
    async (repository, principal) => {
      const { experimentId } = await context.params;
      return {
        experiment: await decideDecisionExperiment(
          repository,
          principal,
          experimentId,
          await request.json(),
        ),
      };
    },
    { failureMessage: "Experiment approval could not be recorded." },
  );
}
