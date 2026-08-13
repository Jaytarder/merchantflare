"use client";

import { useState, type FormEvent } from "react";
import type {
  ConversationPlan,
  ConversationPlanTask,
} from "../../lib/mercury/conversation-types";
import AtlasAssessmentCard from "../components/atlas/AtlasAssessmentCard";

type MercuryPlanCardProps = {
  plan: ConversationPlan;
  busy: boolean;
  canWrite: boolean;
  canApprove: boolean;
  onDecision: (
    planId: string,
    decision: "approved" | "rejected",
    note?: string,
  ) => Promise<void>;
  onRevise: (plan: ConversationPlan) => void;
};

function words(value: string) {
  return value.replaceAll("_", " ");
}

function routeLabel(task: ConversationPlanTask) {
  if (task.routeStatus === "blocked_by_approval") return "Approval required";
  if (task.routeStatus === "blocked_by_dependency") return "Waiting on dependency";
  return "Ready for review";
}

export default function MercuryPlanCard({
  plan,
  busy,
  canWrite,
  canApprove,
  onDecision,
  onRevise,
}: MercuryPlanCardProps) {
  const [decisionMode, setDecisionMode] = useState<
    "approved" | "rejected" | null
  >(null);
  const [decisionNote, setDecisionNote] = useState("");
  const pendingApproval = plan.approval?.status === "pending";
  const canRevise = !["running", "completed", "superseded"].includes(
    plan.status,
  );

  async function submitDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decisionMode || busy) return;
    if (decisionMode === "rejected" && decisionNote.trim().length < 5) {
      return;
    }

    try {
      await onDecision(
        plan.id,
        decisionMode,
        decisionNote.trim() || undefined,
      );
      setDecisionMode(null);
      setDecisionNote("");
    } catch {
      // The workspace renders the safe API error and preserves this form.
    }
  }

  return (
    <section className="mercury-plan" aria-label={`Mercury plan version ${plan.version}`}>
      <header className="mercury-plan-heading">
        <div>
          <span>Deterministic plan · v{plan.version}</span>
          <h3>{plan.tasks.length} coordinated tasks</h3>
        </div>
        <div className={`mercury-plan-status is-${plan.status}`}>
          {words(plan.status)}
        </div>
      </header>

      <div
        className={`mercury-evidence-notice is-${plan.evidence.status}`}
      >
        <strong>
          {plan.evidence.status === "unavailable"
            ? "Evidence unavailable"
            : `${plan.evidence.itemCount} evidence items`}
        </strong>
        <p>{plan.evidence.limitation}</p>
        {plan.evidence.items.length ? (
          <ul className="mercury-evidence-list">
            {plan.evidence.items.map((item) => (
              <li key={item.id}>
                <strong>{item.title}</strong>
                <span>
                  {item.sourceName} · {words(item.dataset)} ·{" "}
                  {words(item.freshness)}
                </span>
                <p>{item.summary}</p>
                {item.dateRangeStart && item.dateRangeEnd ? (
                  <small>
                    Source period{" "}
                    {new Date(item.dateRangeStart).toLocaleDateString()}–{" "}
                    {new Date(item.dateRangeEnd).toLocaleDateString()}
                  </small>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {plan.atlasAssessment ? (
        <div className="mercury-atlas-assessment">
          <AtlasAssessmentCard assessment={plan.atlasAssessment} />
        </div>
      ) : null}

      {plan.oracleAssessment ? (
        <div className={`mercury-evidence-notice is-${plan.oracleAssessment.status === "unavailable" ? "unavailable" : "available"}`}>
          <strong>Demand &amp; Availability reasoning</strong>
          {plan.oracleAssessment.decisions.length ? (
            <ul className="mercury-evidence-list">
              {plan.oracleAssessment.decisions.slice(0, 5).map((decision) => (
                <li key={`${decision.product.marketplace ?? ""}:${decision.product.sku}`}>
                  <strong>{decision.product.asin ?? decision.product.sku}</strong>
                  <span>{decision.recommendedOption.action.replaceAll("_", " ")} · {decision.recommendedOption.quantity.toLocaleString()} units · {Math.round(decision.recommendedOption.confidence * 100)}% confidence</span>
                  <p>MichaelModel {Math.round(decision.comparison.michael.baseForecast).toLocaleString()} vs OracleModel {Math.round(decision.comparison.oracle.baseForecast).toLocaleString()}. {decision.comparison.valueOfInformation.rationale}</p>
                </li>
              ))}
            </ul>
          ) : <p>{plan.oracleAssessment.limitations[0]}</p>}
        </div>
      ) : null}

      {plan.decisionContext?.length ? (
        <div className="mercury-evidence-notice is-available">
          <strong>Decision Case learning</strong>
          <ul className="mercury-evidence-list">
            {plan.decisionContext.map((decisionCase) => (
              <li key={decisionCase.decisionCaseId}>
                <strong>{decisionCase.title}</strong>
                <span>
                  {words(decisionCase.status)} · {decisionCase.evidenceCount} evidence ·{" "}
                  {decisionCase.hypothesisCount} hypotheses ·{" "}
                  {decisionCase.experimentCount} experiments
                </span>
                {decisionCase.currentBelief ? (
                  <p>
                    Current belief ({Math.round(decisionCase.currentBelief.confidence * 100)}%):{" "}
                    {decisionCase.currentBelief.statement}
                  </p>
                ) : (
                  <p>No current belief has been recorded.</p>
                )}
                <small>
                  {decisionCase.outcomeCount} outcomes · {decisionCase.lessonCount} reusable lessons
                </small>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mercury-plan-tasks">
        {plan.tasks.map((task, index) => (
          <article className="mercury-plan-task" key={task.id}>
            <span className="mercury-plan-task-number">{index + 1}</span>
            <div>
              <div className="mercury-plan-task-meta">
                <strong>{task.module}</strong>
                <span className={`is-${task.priority}`}>{task.priority}</span>
              </div>
              <h4>{task.title}</h4>
              <p>{task.description}</p>
              <small>{routeLabel(task)}</small>
            </div>
          </article>
        ))}
      </div>

      {pendingApproval ? (
        <div className="mercury-approval-notice">
          <div>
            <strong>Approval required before any future execution</strong>
            <p>
              Review the deterministic proposal and its evidence limitation.
              A decision records authority but does not execute commerce work.
            </p>
          </div>
          <span>{plan.approvalReasons.length} policy checks</span>
        </div>
      ) : plan.approval ? (
        <div className={`mercury-approval-result is-${plan.approval.status}`}>
          <strong>Approval {plan.approval.status}</strong>
          <span>Policy {plan.approval.policyVersion}</span>
          {plan.approval.decisionNote ? (
            <p>{plan.approval.decisionNote}</p>
          ) : null}
        </div>
      ) : (
        <div className="mercury-review-notice">
          Plan ready for review. Execution controls are not enabled in this
          milestone.
        </div>
      )}

      {decisionMode && canApprove ? (
        <form className="mercury-decision-form" onSubmit={submitDecision}>
          <strong>
            {decisionMode === "approved"
              ? "Confirm plan approval"
              : "Record plan rejection"}
          </strong>
          <p>
            {decisionMode === "approved"
              ? "Approval makes eligible tasks ready for a future execution workflow. Nothing will execute now."
              : "Rejection blocks this plan. Explain why so the decision remains auditable."}
          </p>
          <label htmlFor={`decision-note-${plan.id}`}>
            {decisionMode === "rejected" ? "Rejection note" : "Decision note (optional)"}
          </label>
          <textarea
            id={`decision-note-${plan.id}`}
            value={decisionNote}
            maxLength={500}
            rows={2}
            disabled={busy}
            onChange={(event) => setDecisionNote(event.target.value)}
          />
          <div>
            <button
              type="submit"
              disabled={
                busy ||
                (decisionMode === "rejected" &&
                  decisionNote.trim().length < 5)
              }
            >
              {busy
                ? "Recording…"
                : decisionMode === "approved"
                  ? "Confirm approval"
                  : "Confirm rejection"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setDecisionMode(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mercury-plan-actions">
          {pendingApproval && canApprove ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => setDecisionMode("approved")}
              >
                Review approval
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setDecisionMode("rejected")}
              >
                Reject
              </button>
            </>
          ) : null}
          {canRevise && canWrite ? (
            <button type="button" disabled={busy} onClick={() => onRevise(plan)}>
              Revise plan
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
