import { NextResponse } from "next/server";
import { assessOrganizationCatalog } from "../../../../lib/atlas";
import { getDatabase } from "../../../../lib/db";
import { platformApiError } from "../../../../lib/platform/api-errors";
import { getAuthenticatedPrincipal } from "../../../../lib/server-auth";

export async function GET() {
  try {
    const principal = await getAuthenticatedPrincipal();
    if (!principal) {
      return NextResponse.json(
        { error: { code: "unauthorized", message: "Authentication required." } },
        { status: 401 },
      );
    }
    const sql = getDatabase();
    if (!sql) {
      return NextResponse.json(
        {
          error: {
            code: "service_unavailable",
            message: "Catalog evidence storage is not configured.",
          },
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { assessment: await assessOrganizationCatalog(sql, principal) },
      { status: 200 },
    );
  } catch (error) {
    return (
      platformApiError(error) ??
      NextResponse.json(
        { error: { code: "internal_error", message: "Unable to assess catalog evidence." } },
        { status: 500 },
      )
    );
  }
}
