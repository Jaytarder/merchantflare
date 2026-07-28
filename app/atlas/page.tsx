import { redirect } from "next/navigation";
import AtlasAssessmentCard from "../components/atlas/AtlasAssessmentCard";
import { assessCatalog, assessOrganizationCatalog } from "../../lib/atlas";
import { getDatabase } from "../../lib/db";
import { evaluateApproval } from "../../lib/mercury/approvals";
import { requirePermission } from "../../lib/platform";
import { getAuthenticatedPrincipal } from "../../lib/server-auth";
import "./atlas.css";

export const metadata = {
  title: "Atlas | MerchantFlare",
  description: "Explainable catalog intelligence from normalized commerce evidence.",
};

export default async function AtlasPage() {
  const principal = await getAuthenticatedPrincipal();
  if (!principal) redirect("/login");
  requirePermission(principal, "atlas.read");

  const sql = getDatabase();
  const policy = evaluateApproval("catalog.optimize");
  const assessment = sql
    ? await assessOrganizationCatalog(sql, principal)
    : assessCatalog({
        organizationId: principal.organizationId,
        records: [],
        policy: {
          required: policy.required,
          version: policy.policyVersion,
          reason: policy.reason,
        },
      });

  return (
    <main className="atlas-page">
      <header className="atlas-page-header">
        <div><span>Atlas · Catalog Intelligence</span><h1>Evidence first. Every score explained.</h1></div>
        <p>Atlas evaluates normalized Commerce Evidence Layer records only. It never reads provider payloads or fills evidence gaps with assumptions.</p>
      </header>
      <AtlasAssessmentCard assessment={assessment} />
    </main>
  );
}
