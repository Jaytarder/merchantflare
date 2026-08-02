import { decisionRequest } from "../../../../../../lib/decision/http";
import { getScientificReasoning } from "../../../../../../lib/decision/service";

export async function GET(request: Request, context: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await context.params;
  const persist = new URL(request.url).searchParams.get("persist") === "true";
  return decisionRequest(
    (repository, principal) => getScientificReasoning(repository, principal, caseId, persist),
    { failureMessage: "Scientific reasoning could not be calculated." },
  );
}
