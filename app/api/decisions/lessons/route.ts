import { createDecisionLesson } from "../../../../lib/decision/service";
import { decisionCaseCollection, decisionRequest } from "../../../../lib/decision/http";

export async function GET(request: Request) {
  return decisionRequest(
    async (repository, principal) => {
      const lessons = await decisionCaseCollection(request, repository, principal, "lessons");
      return { lessons, count: lessons.length };
    },
    { failureMessage: "Lessons could not be loaded." },
  );
}

export async function POST(request: Request) {
  return decisionRequest(
    async (repository, principal) => ({
      lesson: await createDecisionLesson(repository, principal, await request.json()),
    }),
    { successStatus: 201, failureMessage: "Lesson could not be recorded." },
  );
}
