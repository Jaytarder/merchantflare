import { decisionRequest } from "../../../../../lib/decision/http";
import { reviseDecisionBelief } from "../../../../../lib/decision/service";

export async function PUT(
  request: Request,
  context: { params: Promise<{ beliefId: string }> },
) {
  return decisionRequest(
    async (repository, principal) => {
      const { beliefId } = await context.params;
      return {
        belief: await reviseDecisionBelief(
          repository,
          principal,
          beliefId,
          await request.json(),
        ),
      };
    },
    { failureMessage: "Belief could not be revised." },
  );
}
