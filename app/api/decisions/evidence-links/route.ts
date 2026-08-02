import { decisionCaseCollection, decisionRequest } from "../../../../lib/decision/http";
import { linkDecisionEvidence } from "../../../../lib/decision/service";

export async function GET(request: Request) {
  return decisionRequest(
    async (repository, principal) => {
      const links = await decisionCaseCollection(request, repository, principal, "evidenceLinks");
      return { links, count: links.length };
    },
    { failureMessage: "Evidence relationships could not be loaded." },
  );
}

export async function POST(request: Request) {
  return decisionRequest(
    async (repository, principal) => ({
      link: await linkDecisionEvidence(repository, principal, await request.json()),
    }),
    { successStatus: 201, failureMessage: "Evidence relationship could not be recorded." },
  );
}
