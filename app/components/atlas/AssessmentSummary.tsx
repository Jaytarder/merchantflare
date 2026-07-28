import type { AssessmentSummary as Summary } from "../../../lib/atlas";

export default function AssessmentSummary({ summary }: { summary: Summary }) {
  return (
    <section className="atlas-summary" aria-labelledby="atlas-summary-title">
      <div><span>Assessment</span><h1 id="atlas-summary-title">{summary.headline}</h1><p>{summary.detail}</p></div>
      <dl>
        <div><dt>Scored</dt><dd>{summary.scoredDimensions}</dd></div>
        <div><dt>Findings</dt><dd>{summary.findingCount}</dd></div>
        <div><dt>Recommendations</dt><dd>{summary.recommendationCount}</dd></div>
        <div><dt>Opportunities</dt><dd>{summary.opportunityCount}</dd></div>
      </dl>
    </section>
  );
}
