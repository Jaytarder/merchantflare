import type { OptimizationRecommendation } from "../../../lib/atlas";

export default function RecommendationCard({ recommendation }: { recommendation: OptimizationRecommendation }) {
  return (
    <article className="atlas-item-card">
      <div className="atlas-item-meta"><span>{recommendation.dimension}</span><strong>{recommendation.priority}</strong></div>
      <h3>{recommendation.title}</h3><p>{recommendation.description}</p>
      <p><b>Expected impact:</b> {recommendation.expectedImpact.description}</p>
      <details><summary>Evidence requirements</summary><ul>{recommendation.requiredEvidence.map((item) => <li key={item}>{item}</li>)}</ul></details>
    </article>
  );
}
