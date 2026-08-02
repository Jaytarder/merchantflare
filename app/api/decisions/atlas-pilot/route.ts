import { createAtlasTitlePilot } from "../../../../lib/decision/atlas-pilot";
import { decisionRequest } from "../../../../lib/decision/http";
import { requirePermission } from "../../../../lib/platform/authorization";

export async function POST(request: Request) {
  return decisionRequest(
    async (_repository, principal) => {
      requirePermission(principal, "decisions.write");
      return { pilot: createAtlasTitlePilot(await request.json()) };
    },
    { successStatus: 201, failureMessage: "Atlas pilot could not be prepared." },
  );
}
