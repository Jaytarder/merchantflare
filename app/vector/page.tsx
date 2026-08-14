import { redirect } from "next/navigation";
import { getDatabase } from "../../lib/db";
import { requirePermission } from "../../lib/platform";
import { getAuthenticatedPrincipal } from "../../lib/server-auth";
import { assessOrganizationAdvertisingAndSupply } from "../../lib/vector";

export const metadata = { title: "Media & Demand Coordination | MerchantFlare", description: "Evidence-backed advertising and inventory decisions." };
const fmt = (value?: number, digits = 1) => value === undefined ? "Unavailable" : value.toLocaleString(undefined, { maximumFractionDigits: digits });

export default async function VectorPage() {
  const principal = await getAuthenticatedPrincipal();
  if (!principal) redirect("/login");
  requirePermission(principal, "vector.read");
  const sql = getDatabase();
  const assessment = sql ? await assessOrganizationAdvertisingAndSupply(sql, principal) : null;
  return <main className="oracle-page">
    <header className="oracle-header"><div><span>Media Diagnostics</span><h1>Coordinated demand decisions</h1></div><p>Vector and Oracle evaluate demand creation and supply constraints together. Human approval remains required.</p></header>
    {!assessment?.decisions.length ? <section className="oracle-empty"><h2>No evidence-backed joint decisions</h2><p>{assessment?.limitations[0] ?? "Evidence storage is not configured."}</p><small>No sample data was generated.</small></section> : <section className="oracle-list" aria-label="Coordinated decisions">
      {assessment.decisions.map((decision) => <article className="oracle-decision" key={`${decision.product.marketplace ?? ""}:${decision.product.sku}`}>
        <header><div><strong>{decision.product.asin ?? decision.product.sku}</strong><span>{decision.product.sku}</span></div><span className="oracle-risk">{Math.round(decision.vector.confidence * 100)}% confidence</span></header>
        <dl><div><dt>Baseline demand</dt><dd>{fmt(decision.baselineWeeklyDemand)}</dd></div><div><dt>Safe incremental units</dt><dd>{fmt(decision.safeDemandEnvelope.safeIncrementalUnits)}</dd></div><div><dt>Recommended</dt><dd>{decision.options.find((option) => option.recommended)?.kind.replaceAll("_", " ")}</dd></div><div><dt>Vector</dt><dd>{decision.vector.action.replaceAll("_", " ")}</dd></div></dl>
        <details><summary>Possible futures</summary><div className="oracle-comparison">{decision.options.map((option) => <p key={option.kind}><strong>{option.kind.replaceAll("_", " ")}{option.recommended ? " · Recommended" : ""}</strong><span>Units {fmt(option.expectedUnits)} · WOS {fmt(option.expectedWos)} · {Math.round(option.confidence * 100)}% confidence</span></p>)}</div></details>
        <details><summary>Why and where we may be wrong</summary><div className="oracle-comparison"><p><strong>Oracle view</strong><span>{fmt(decision.baselineWeeklyDemand)} baseline units/week</span></p><p><strong>Vector view</strong><span>{decision.vector.action.replaceAll("_", " ")}</span></p><p><strong>Disagreement</strong><span>{decision.disagreement.differingAssumptions.join(" ") || "No material disagreement recorded."}</span></p><p><strong>Evidence needed</strong><span>{decision.disagreement.evidenceToResolve.join(" ") || "No resolving evidence identified."}</span></p></div></details>
      </article>)}
    </section>}
  </main>;
}
