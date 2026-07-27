import { NextResponse } from "next/server";
import { orchestrate } from "../../../../lib/mercury/orchestrator";
import { saveOrchestrationResult } from "../../../../lib/mercury/repository";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { objective?: unknown };
    const objective = typeof body.objective === "string" ? body.objective.trim() : "";

    if (!objective) {
      return NextResponse.json(
        { error: "Objective is required." },
        { status: 400 },
      );
    }

    if (objective.length > 500) {
      return NextResponse.json(
        { error: "Objective must be 500 characters or fewer." },
        { status: 400 },
      );
    }

    const result = await orchestrate(objective);
    const persistence = await saveOrchestrationResult(result);

    return NextResponse.json({
      ...result,
      persistence,
    });
  } catch (error) {
    console.error("Mercury planning failed", error);
    return NextResponse.json(
      { error: "Mercury could not create a plan. Please try again." },
      { status: 500 },
    );
  }
}
