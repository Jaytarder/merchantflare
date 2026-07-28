import type { CatalogOpportunity } from "../../../lib/atlas";

export default function OpportunityCard({ opportunity }: { opportunity: CatalogOpportunity }) {
  return (
    <article className="atlas-item-card">
      <div className="atlas-item-meta"><span>Opportunity</span><strong>{Math.round(opportunity.confidence.score * 100)}% confidence</strong></div>
      <h3>{opportunity.title}</h3><p>{opportunity.potentialImpact.description}</p>
      {opportunity.blockingFactors.length ? <p><b>Blocked by:</b> {opportunity.blockingFactors.join("; ")}</p> : null}
    </article>
  );
}
