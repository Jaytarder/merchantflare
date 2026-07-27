import { NextResponse } from "next/server";
import { orchestrate } from "../../../../lib/mercury/orchestrator";

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
    return NextResponse.json(result);
  } catch (error) {
    console.error("Mercury planning failed", error);
    return NextResponse.json(
      { error: "Mercury could not create a plan. Please try again." },
      { status: 500 },
    );
  }
}
