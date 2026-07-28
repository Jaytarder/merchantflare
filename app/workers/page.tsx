import AuthenticatedAppShell from "../components/layout/AuthenticatedAppShell";

const workers = [
  {
    name: "Atlas",
    role: "Listing Intelligence",
    summary: "Audits titles, bullets, images, attributes, and search coverage across the catalog.",
    status: "Running",
    statusClass: "live",
    accent: "A",
    tasks: 38,
    impact: "$84.2K",
    signal: "92% confidence",
    current: "Reviewing 684 ASINs for title and keyword gaps",
  },
  {
    name: "Vector",
    role: "Advertising Optimization",
    summary: "Optimizes bids, budgets, search terms, and product targets against profitability goals.",
    status: "Running",
    statusClass: "live",
    accent: "V",
    tasks: 126,
    impact: "$31.6K",
    signal: "89% confidence",
    current: "Rebalancing spend across 47 active campaigns",
  },
  {
    name: "Sentinel",
    role: "Compliance & Account Health",
    summary: "Monitors document requests, suppressed listings, policy risk, and account health signals.",
    status: "Needs review",
    statusClass: "review",
    accent: "S",
    tasks: 17,
    impact: "$225.6K",
    signal: "5 critical alerts",
    current: "Escalating missing compliance documents on 5 ASINs",
  },
  {
    name: "Oracle",
    role: "Forecasting & Inventory",
    summary: "Forecasts demand, identifies stock risk, and recommends replenishment by channel.",
    status: "Running",
    statusClass: "live",
    accent: "O",
    tasks: 22,
    impact: "$142.8K",
    signal: "94% confidence",
    current: "Updating 8-week demand and weeks-of-supply models",
  },
  {
    name: "Forge",
    role: "Creative Production",
    summary: "Produces image briefs, creative concepts, and conversion-focused PDP content plans.",
    status: "Idle",
    statusClass: "idle",
    accent: "F",
    tasks: 9,
    impact: "$18.4K",
    signal: "Ready for work",
    current: "Waiting for the next creative production queue",
  },
  {
    name: "Pulse",
    role: "Executive Reporting",
    summary: "Turns operational and financial data into concise reports, alerts, and action plans.",
    status: "Scheduled",
    statusClass: "scheduled",
    accent: "P",
    tasks: 12,
    impact: "$56.9K",
    signal: "Next run 8:00 AM",
    current: "Preparing weekly executive performance brief",
  },
];

const queue = [
  { priority: "Critical", task: "Resolve compliance document gaps", owner: "Sentinel", due: "Today" },
  { priority: "High", task: "Reallocate spend from inefficient campaigns", owner: "Vector", due: "Today" },
  { priority: "High", task: "Prevent stockout on top 12 ASINs", owner: "Oracle", due: "2 days" },
  { priority: "Medium", task: "Rewrite low-converting product titles", owner: "Atlas", due: "3 days" },
];

export default function WorkersPage() {
  return (
    <AuthenticatedAppShell>
      <header className="topbar workers-header">
        <div>
          <div className="eyebrow">Mercury AI Workforce</div>
          <h1>AI workers built for commerce operations.</h1>
          <p className="muted page-lead">
            Each worker owns a specific operational function, surfaces decisions, and executes approved work.
          </p>
        </div>
        <button className="btn primary" type="button">Assign a task</button>
      </header>

      <section className="workers-summary">
        <article className="summary-stat">
          <span>Workers online</span>
          <strong>4 of 6</strong>
        </article>
        <article className="summary-stat">
          <span>Tasks completed</span>
          <strong>224</strong>
        </article>
        <article className="summary-stat">
          <span>Estimated impact</span>
          <strong>$559.5K</strong>
        </article>
        <article className="summary-stat">
          <span>Requires approval</span>
          <strong>11</strong>
        </article>
      </section>

      <section className="worker-grid" aria-label="Mercury AI workers">
        {workers.map((worker) => (
          <article className="worker-card" key={worker.name}>
            <div className="worker-card-top">
              <div className="worker-identity">
                <div className="worker-avatar">{worker.accent}</div>
                <div>
                  <h2>{worker.name}</h2>
                  <div className="worker-role">{worker.role}</div>
                </div>
              </div>
              <span className={`badge ${worker.statusClass}`}>{worker.status}</span>
            </div>

            <p className="worker-summary">{worker.summary}</p>

            <div className="worker-current">
              <span>Current activity</span>
              <strong>{worker.current}</strong>
            </div>

            <div className="worker-metrics">
              <div>
                <span>Open tasks</span>
                <strong>{worker.tasks}</strong>
              </div>
              <div>
                <span>Impact</span>
                <strong>{worker.impact}</strong>
              </div>
              <div>
                <span>Signal</span>
                <strong>{worker.signal}</strong>
              </div>
            </div>

            <div className="worker-actions">
              <button className="btn secondary compact" type="button">View worker</button>
              <button className="text-button" type="button">Assign task</button>
            </div>
          </article>
        ))}
      </section>

      <section className="card task-queue">
        <div className="section-title">
          <div>
            <div className="eyebrow">Priority queue</div>
            <h2>Work requiring attention</h2>
          </div>
          <span className="muted">4 priority actions</span>
        </div>

        <div className="queue-table" role="table" aria-label="Priority task queue">
          <div className="queue-row queue-head" role="row">
            <span>Priority</span>
            <span>Task</span>
            <span>Owner</span>
            <span>Due</span>
          </div>
          {queue.map((item) => (
            <div className="queue-row" role="row" key={item.task}>
              <span><span className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</span></span>
              <strong>{item.task}</strong>
              <span className="muted">{item.owner}</span>
              <span>{item.due}</span>
            </div>
          ))}
        </div>
      </section>
    </AuthenticatedAppShell>
  );
}
