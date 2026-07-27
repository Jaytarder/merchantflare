import { NextResponse } from "next/server";
import { listMercuryPlans } from "../../../../lib/mercury/repository";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedLimit = Number(searchParams.get("limit") ?? "25");
    const limit = Number.isFinite(requestedLimit) ? requestedLimit : 25;

    const plans = await listMercuryPlans(limit);

    return NextResponse.json({
      plans,
      count: plans.length,
    });
  } catch (error) {
    console.error("Mercury history failed", error);
    return NextResponse.json(
      { error: "Mercury could not load plan history. Please try again." },
      { status: 500 },
    );
  }
}
