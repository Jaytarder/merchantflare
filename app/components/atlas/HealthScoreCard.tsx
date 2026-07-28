import type { CatalogHealthScore } from "../../../lib/atlas";

function label(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (text) => text.toUpperCase());
}

export default function HealthScoreCard({ health }: { health: CatalogHealthScore }) {
  return (
    <section className="atlas-card atlas-health" aria-labelledby="atlas-health-title">
      <header>
        <div><span>Explainable health</span><h2 id="atlas-health-title">Catalog health</h2></div>
        <strong aria-label={health.overallScore === null ? "Score unavailable" : `Overall score ${health.overallScore} out of 100`}>
          {health.overallScore ?? "—"}<small>/100</small>
        </strong>
      </header>
      <p>{health.explanation}</p>
      <div className="atlas-score-grid">
        {Object.values(health.components).map((component) => (
          <article key={component.dimension}>
            <div><strong>{label(component.dimension)}</strong><span>{component.score ?? "Unavailable"}</span></div>
            <p>{component.explanation}</p>
            <small>{Math.round(component.confidence.score * 100)}% confidence</small>
          </article>
        ))}
      </div>
    </section>
  );
}
