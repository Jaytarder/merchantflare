import type { CatalogAssessment } from "../../../lib/atlas";
import AssessmentSummary from "./AssessmentSummary";
import EvidenceSummary from "./EvidenceSummary";
import FindingCard from "./FindingCard";
import HealthScoreCard from "./HealthScoreCard";
import ImprovementPlanCard from "./ImprovementPlanCard";
import OpportunityCard from "./OpportunityCard";
import RecommendationCard from "./RecommendationCard";

export default function AtlasAssessmentCard({ assessment }: { assessment: CatalogAssessment }) {
  return (
    <>
      <AssessmentSummary summary={assessment.summary} />
      <div className="atlas-two-column"><HealthScoreCard health={assessment.health} /><EvidenceSummary assessment={assessment} /></div>
      <section className="atlas-section"><header><span>Explainable analysis</span><h2>Findings</h2></header><div className="atlas-item-grid">{assessment.findings.map((finding) => <FindingCard key={finding.id} finding={finding} />)}</div></section>
      <section className="atlas-section"><header><span>Evidence-backed proposals</span><h2>Recommendations</h2></header>{assessment.recommendations.length ? <div className="atlas-item-grid">{assessment.recommendations.map((recommendation) => <RecommendationCard key={recommendation.id} recommendation={recommendation} />)}</div> : <p className="atlas-empty">No recommendation was generated without an evidenced quality gap.</p>}</section>
      <section className="atlas-section"><header><span>Qualified potential</span><h2>Opportunities</h2></header>{assessment.opportunities.length ? <div className="atlas-item-grid">{assessment.opportunities.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} />)}</div> : <p className="atlas-empty">No opportunity estimate is available from current evidence.</p>}</section>
      <ImprovementPlanCard plan={assessment.improvementPlan} />
    </>
  );
}
