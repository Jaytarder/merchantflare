import { NextResponse } from "next/server";
import { getDatabase } from "../../../../lib/db";
import { platformApiError } from "../../../../lib/platform/api-errors";
import { getAuthenticatedPrincipal } from "../../../../lib/server-auth";
import { assessOrganizationAdvertisingAndSupply } from "../../../../lib/vector";
export async function GET() { try { const principal=await getAuthenticatedPrincipal(); if(!principal) return NextResponse.json({error:{code:"unauthorized",message:"Authentication required."}},{status:401}); const sql=getDatabase(); if(!sql) return NextResponse.json({error:{code:"service_unavailable",message:"Evidence storage is not configured."}},{status:503}); return NextResponse.json({assessment:await assessOrganizationAdvertisingAndSupply(sql,principal)}); } catch(error) { return platformApiError(error) ?? NextResponse.json({error:{code:"internal_error",message:"Unable to coordinate advertising and supply evidence."}},{status:500}); } }
