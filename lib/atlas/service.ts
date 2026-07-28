import type postgres from "postgres";
import {
  CachedEvidenceQueryService,
  PostgresEvidenceCache,
  PostgresEvidenceReader,
} from "../evidence";
import {
  requirePermission,
  type OrganizationPrincipal,
} from "../platform";
import { evaluateApproval } from "../mercury/approvals";
import { assessCatalog } from "./assessment";

export async function assessOrganizationCatalog(
  sql: postgres.Sql,
  principal: OrganizationPrincipal,
  asOf = new Date().toISOString(),
) {
  requirePermission(principal, "atlas.read");
  const evidence = await new CachedEvidenceQueryService(
    new PostgresEvidenceReader(sql),
    new PostgresEvidenceCache(sql, principal.organizationId),
  ).query({
    organizationId: principal.organizationId,
    datasets: ["catalog", "compliance"],
    asOf,
    limit: 250,
  });
  const approval = evaluateApproval("catalog.optimize");
  return assessCatalog({
    organizationId: principal.organizationId,
    records: evidence,
    assessedAt: asOf,
    policy: {
      required: approval.required,
      version: approval.policyVersion,
      reason: approval.reason,
    },
  });
}
