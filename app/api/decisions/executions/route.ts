import { decisionRequest } from "../../../../lib/decision/http";
import { executeDecisionIntervention } from "../../../../lib/decision/service";

export async function POST(request: Request) {
  return decisionRequest(
    async (repository, principal) => ({ execution: await executeDecisionIntervention(repository, principal, await request.json()) }),
    { successStatus: 201, failureMessage: "Intervention execution could not be recorded." },
  );
}
