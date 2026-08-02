import { decisionRequest } from "../../../../lib/decision/http";
import { getDecisionMetrics } from "../../../../lib/decision/service";

export async function GET() {
  return decisionRequest(
    async (repository, principal) => getDecisionMetrics(repository, principal),
    { failureMessage: "Decision engineering metrics could not be loaded." },
  );
}
