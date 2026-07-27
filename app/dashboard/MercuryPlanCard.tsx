import type {
  ConversationPlan,
  ConversationPlanTask,
} from "../../lib/mercury/conversation-types";

function words(value: string) {
  return value.replaceAll("_", " ");
}

function routeLabel(task: ConversationPlanTask) {
  if (task.routeStatus === "blocked_by_approval") return "Approval required";
  if (task.routeStatus === "blocked_by_dependency") return "Waiting on dependency";
  return "Ready for review";
}

export default function MercuryPlanCard({ plan }: { plan: ConversationPlan }) {
  return (
    <section className="mercury-plan" aria-label="Mercury plan">
      <header className="mercury-plan-heading">
        <div>
          <span>Deterministic plan</span>
          <h3>{plan.tasks.length} coordinated tasks</h3>
        </div>
        <div className={`mercury-plan-status is-${plan.status}`}>
          {words(plan.status)}
        </div>
      </header>

      <div className="mercury-evidence-notice">
        <strong>Evidence unavailable</strong>
        <p>
          Live commerce sources are not connected to this plan. Task routing is
          based only on objective keywords and configured capability rules.
        </p>
      </div>

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

      {plan.requiresApproval ? (
        <div className="mercury-approval-notice">
          <div>
            <strong>Approval required before execution</strong>
            <p>
              This foundation provides plan review only. No commerce action has
              been executed.
            </p>
          </div>
          <span>{plan.approvalReasons.length} policy checks</span>
        </div>
      ) : (
        <div className="mercury-review-notice">
          Plan ready for review. Execution controls are not enabled in this
          milestone.
        </div>
      )}
    </section>
  );
}
