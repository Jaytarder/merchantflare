import AppShell from "../components/AppShell";
import MetricCard from "../components/MetricCard";

const metrics = [
  { title: "Ordered revenue", value: "$1.42M", change: "+18.6% vs prior period" },
  { title: "Contribution profit", value: "$312.4K", change: "+11.2% vs prior period" },
  { title: "TACoS", value: "8.9%", change: "0.7 pts below target" },
  { title: "Commerce health", value: "86 / 100", change: "+4 points this week" },
];

const priorities = [
  { severity: "Critical", title: "Compliance exposure", detail: "5 ASINs are missing required documentation.", owner: "Sentinel", impact: "$225.6K at risk" },
  { severity: "High", title: "Inventory risk", detail: "12 top-selling ASINs are projected to stock out within 21 days.", owner: "Oracle", impact: "$142.8K protected" },
  { severity: "High", title: "Advertising inefficiency", detail: "47 campaigns are spending above their profitability threshold.", owner: "Vector", impact: "$31.6K opportunity" },
];

const workers = [
  { name: "Atlas", task: "Auditing 684 listings", progress: 78, status: "Running" },
  { name: "Vector", task: "Rebalancing 47 campaigns", progress: 62, status: "Running" },
  { name: "Sentinel", task: "Escalating 5 compliance gaps", progress: 44, status: "Review" },
  { name: "Oracle", task: "Updating 8-week forecast", progress: 91, status: "Running" },
];

const signals = [
  ["Revenue velocity", "+18.6%", "positive"],
  ["Organic sales share", "55.1%", "positive"],
  ["Return rate", "4.7%", "warning"],
  ["In-stock rate", "93.4%", "warning"],
  ["Advertising ROAS", "5.2x", "positive"],
];

const activity = [
  ["Vector reduced bids on 14 inefficient targets", "8 min ago"],
  ["Atlas found 32 high-value listing opportunities", "24 min ago"],
  ["Sentinel opened 5 compliance escalations", "41 min ago"],
  ["Oracle refreshed demand forecasts", "1 hr ago"],
];

export default function DashboardPage() {
  return (
    <AppShell active="dashboard">
      <header className="topbar command-header">
        <div>
          <div className="eyebrow">Mercury Command Center</div>
          <h1>Good morning, Justin.</h1>
          <p className="muted page-lead">Mercury has reviewed your commerce operation and prioritized the highest-impact actions.</p>
        </div>
        <div className="status-pill"><span className="dot" />All systems operational</div>
      </header>

      <section className="mercury-command">
        <div className="mercury-orb" aria-hidden="true">M</div>
        <div className="command-copy">
          <span className="command-kicker">Ask Mercury</span>
          <h2>What should we accomplish today?</h2>
          <p>Assign an objective and Mercury will coordinate the right workers, show the plan, and request approval before taking material action.</p>
        </div>
        <form className="command-form">
          <input aria-label="Command Mercury" placeholder="Example: Improve ROAS without reducing revenue" />
          <button className="btn primary" type="button">Run objective</button>
        </form>
        <div className="command-suggestions">
          <button type="button">Protect Q4 inventory</button>
          <button type="button">Optimize Pokémon listings</button>
          <button type="button">Prepare executive report</button>
        </div>
      </section>

      <section className="grid metrics command-metrics" id="performance">
        {metrics.map((metric) => <MetricCard key={metric.title} {...metric} />)}
      </section>

      <section className="command-layout">
        <div className="command-primary">
          <article className="card priority-panel">
            <div className="section-title">
              <div>
                <div className="eyebrow">Decision queue</div>
                <h2>Highest-impact priorities</h2>
              </div>
              <span className="muted">3 require attention</span>
            </div>
            <div className="priority-list">
              {priorities.map((item) => (
                <div className="priority-item" key={item.title}>
                  <span className={`priority ${item.severity.toLowerCase()}`}>{item.severity}</span>
                  <div className="priority-copy">
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                    <span>{item.owner} · {item.impact}</span>
                  </div>
                  <button className="text-button" type="button">Review</button>
                </div>
              ))}
            </div>
          </article>

          <article className="card" id="workers">
            <div className="section-title">
              <div>
                <div className="eyebrow">Live operations</div>
                <h2>AI workforce activity</h2>
              </div>
              <a className="text-link" href="/workers">View all workers</a>
            </div>
            <div className="worker-operations">
              {workers.map((worker) => (
                <div className="operation-row" key={worker.name}>
                  <div className="operation-avatar">{worker.name.charAt(0)}</div>
                  <div className="operation-copy">
                    <div className="operation-title"><strong>{worker.name}</strong><span>{worker.task}</span></div>
                    <div className="progress-track"><span style={{ width: `${worker.progress}%` }} /></div>
                  </div>
                  <span className={`badge ${worker.status === "Review" ? "review" : "live"}`}>{worker.status}</span>
                </div>
              ))}
            </div>
          </article>
        </div>

        <aside className="command-secondary">
          <article className="card health-card">
            <div className="section-title"><h2>Commerce health</h2><span className="health-score">86</span></div>
            <div className="health-ring"><div><strong>86</strong><span>Healthy</span></div></div>
            <p className="muted">Strong revenue and advertising efficiency are offset by inventory and compliance risk.</p>
          </article>

          <article className="card">
            <div className="section-title"><h2>Live signals</h2><span className="muted">Last 30 days</span></div>
            <div className="signal-list">
              {signals.map(([label, value, tone]) => (
                <div className="signal-row" key={label}>
                  <span>{label}</span>
                  <strong className={tone}>{value}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="card">
            <div className="section-title"><h2>Recent actions</h2><span className="muted">Live</span></div>
            <div className="activity-list compact-activity">
              {activity.map(([text, time]) => (
                <div className="activity" key={text}><div>{text}</div><div className="activity-time">{time}</div></div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </AppShell>
  );
}
