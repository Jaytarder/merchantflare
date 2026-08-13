import { redirect } from "next/navigation";
import { getDatabase } from "../../lib/db";
import { assessOrganizationDemand } from "../../lib/oracle/service";
import { requirePermission } from "../../lib/platform";
import { getAuthenticatedPrincipal } from "../../lib/server-auth";

export const metadata = { title: "Demand & Availability | MerchantFlare", description: "Evidence-backed demand, inventory, and replenishment decisions." };

function number(value?: number, digits = 1) { return value === undefined ? "Unavailable" : value.toLocaleString(undefined, { maximumFractionDigits: digits }); }

export default async function OraclePage() {
  const principal = await getAuthenticatedPrincipal();
  if (!principal) redirect("/login");
  requirePermission(principal, "oracle.read");
  const sql = getDatabase();
  const assessment = sql ? await assessOrganizationDemand(sql, principal) : { organizationId: principal.organizationId, status: "unavailable" as const, assessedAt: new Date().toISOString(), decisions: [], evidenceCount: 0, limitations: ["Demand evidence storage is not configured."] };
  return <main className="oracle-page">
    <header className="oracle-header"><div><span>Demand &amp; Availability</span><h1>Inventory decisions needing attention</h1></div><p>Human planning, Oracle forecasts, and observed outcomes remain separate so their performance can be measured.</p></header>
    {assessment.decisions.length === 0 ? <section className="oracle-empty"><h2>No evidence-backed inventory decisions</h2><p>{assessment.limitations[0]}</p><small>{assessment.evidenceCount} normalized demand or inventory records were available. No sample data was generated.</small></section> : <section className="oracle-list" aria-label="Inventory decisions">
      {assessment.decisions.map((decision) => <article className="oracle-decision" key={`${decision.product.marketplace ?? ""}:${decision.product.sku}`}>
        <header><div><strong>{decision.product.asin ?? decision.product.sku}</strong><span>{decision.product.sku}</span></div><span className={`oracle-risk oracle-risk-${decision.recommendedOption.risk}`}>{decision.recommendedOption.risk} risk</span></header>
        <dl><div><dt>Current WOS</dt><dd>{number(decision.inventory.currentWos)}</dd></div><div><dt>Projected stockout</dt><dd>{decision.inventory.projectedStockoutDate ? new Date(decision.inventory.projectedStockoutDate).toLocaleDateString() : "Unavailable"}</dd></div><div><dt>Action</dt><dd>{decision.recommendedOption.action.replaceAll("_", " ")}</dd></div><div><dt>Quantity</dt><dd>{number(decision.recommendedOption.quantity, 0)}</dd></div><div><dt>Confidence</dt><dd>{Math.round(decision.recommendedOption.confidence * 100)}%</dd></div></dl>
        <details><summary>Compare planning models</summary><div className="oracle-comparison"><p><strong>Michael model</strong><span>{number(decision.comparison.michael.baseForecast, 0)} units</span></p><p><strong>Oracle model</strong><span>{number(decision.comparison.oracle.baseForecast, 0)} units</span></p><p><strong>Why they differ</strong><span>{decision.comparison.disagreementDrivers.join(" ")}</span></p><p><strong>Value of information</strong><span>{decision.comparison.valueOfInformation.rationale}</span></p></div></details>
        <details><summary>Inventory, evidence, and assumptions</summary><div className="oracle-comparison"><p><strong>Amazon OH / OO</strong><span>{number(decision.inventory.buckets.amazonOnHand, 0)} / {number(decision.inventory.buckets.amazonOnOrder, 0)}</span></p><p><strong>AWC / DF</strong><span>{number(decision.inventory.buckets.awcOnHand, 0)} / {number(decision.inventory.buckets.dfAvailable, 0)}</span></p><p><strong>Reasons this may be wrong</strong><span>{decision.recommendedOption.whatCouldMakeItWrong.join(" ")}</span></p></div></details>
      </article>)}
    </section>}
  </main>;
}
