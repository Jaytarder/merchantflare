import type { CatalogAssessment } from "../../../lib/atlas";

export default function EvidenceSummary({ assessment }: { assessment: CatalogAssessment }) {
  return (
    <section className="atlas-card" aria-labelledby="atlas-evidence-title">
      <header><div><span>Provenance</span><h2 id="atlas-evidence-title">Evidence</h2></div><strong>{assessment.freshness}</strong></header>
      <p>{assessment.evidenceReferences.length} normalized catalog or compliance records · {Math.round(assessment.confidence.score * 100)}% confidence.</p>
      {assessment.evidenceReferences.length ? <ul className="atlas-evidence-list">{assessment.evidenceReferences.map((evidence) => <li key={evidence.id}><strong>{evidence.title}</strong><span>{evidence.sourceName} · {evidence.dataset} · {evidence.freshness}</span><small>Observed {new Date(evidence.observedAt).toLocaleString()}</small></li>)}</ul> : <p className="atlas-unavailable">No normalized evidence is available. Atlas has not inferred catalog condition.</p>}
    </section>
  );
}
