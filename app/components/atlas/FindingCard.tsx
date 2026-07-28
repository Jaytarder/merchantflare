import type { CatalogFinding } from "../../../lib/atlas";

export default function FindingCard({ finding }: { finding: CatalogFinding }) {
  return (
    <article className="atlas-item-card">
      <div className="atlas-item-meta"><span>{finding.dimension}</span><strong>{finding.severity}</strong></div>
      <h3>{finding.title}</h3><p>{finding.description}</p>
      <small>{Math.round(finding.confidence.score * 100)}% confidence · {finding.evidenceReferences.length} evidence references</small>
    </article>
  );
}
