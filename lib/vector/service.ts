import type postgres from "postgres";
import { CachedEvidenceQueryService, PostgresEvidenceCache, PostgresEvidenceReader } from "../evidence";
import { assessDemandEvidence } from "../oracle";
import { requirePermission, type OrganizationPrincipal } from "../platform";
import { normalizedAdvertisingSignals } from "./evidence";
import { jointAssessment } from "./engine";

export async function assessOrganizationAdvertisingAndSupply(sql: postgres.Sql, principal: OrganizationPrincipal, asOf = new Date().toISOString()) {
  requirePermission(principal, "vector.read");
  requirePermission(principal, "joint.read");
  const evidence = await new CachedEvidenceQueryService(new PostgresEvidenceReader(sql), new PostgresEvidenceCache(sql, principal.organizationId)).query({ organizationId: principal.organizationId, datasets: ["advertising", "demand", "inventory"], limit: 500, asOf });
  return jointAssessment(principal.organizationId, normalizedAdvertisingSignals(principal.organizationId, evidence), assessDemandEvidence(principal.organizationId, evidence, asOf), asOf);
}
