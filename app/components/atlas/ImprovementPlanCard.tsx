import type { ImprovementPlan } from "../../../lib/atlas";

export default function ImprovementPlanCard({ plan }: { plan: ImprovementPlan }) {
  return (
    <section className="atlas-card" aria-labelledby="atlas-plan-title">
      <header><div><span>Governed output</span><h2 id="atlas-plan-title">Improvement plan</h2></div><strong>{plan.status.replaceAll("_", " ")}</strong></header>
      <p>{plan.summary}</p>
      {plan.actions.length ? <ol className="atlas-plan-actions">{plan.actions.map((action) => <li key={action.id}><strong>{action.title}</strong><span>{action.priority} · {action.requiresApproval ? "approval required" : "review required"}</span></li>)}</ol> : null}
      {plan.approvalReason ? <small>Policy {plan.approvalPolicyVersion}: {plan.approvalReason}</small> : null}
    </section>
  );
}
