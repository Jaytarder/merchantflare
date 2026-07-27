const metrics = [
  { label: "Ordered revenue", value: "$1.42M", delta: "+18.6% vs prior period" },
  { label: "Advertising spend", value: "$126.8K", delta: "8.9% TACoS" },
  { label: "Active ASINs", value: "684", delta: "+23 launched this month" },
  { label: "Open alerts", value: "17", delta: "5 require review" },
];

const workers = [
  { name: "Atlas", role: "Listing optimization", status: "Live", className: "live" },
  { name: "Vector", role: "Advertising optimization", status: "Live", className: "live" },
  { name: "Sentinel", role: "Compliance monitoring", status: "Review", className: "review" },
  { name: "Oracle", role: "Inventory forecasting", status: "Live", className: "live" },
];

const activities = [
  ["Vector lowered bids across 14 inefficient targets", "8 min ago"],
  ["Atlas identified 32 listing copy opportunities", "24 min ago"],
  ["Sentinel flagged 5 compliance document gaps", "41 min ago"],
  ["Oracle updated the 8-week demand forecast", "1 hr ago"],
];

export default function DashboardPage() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">M</span>MerchantFlare</div>
        <nav className="nav">
          <a className="active" href="/dashboard">Command Center</a>
          <a href="#workers">AI Workers</a>
          <a href="#performance">Performance</a>
          <a href="#catalog">Catalog</a>
          <a href="#advertising">Advertising</a>
          <a href="#settings">Settings</a>
        </nav>
        <div className="sidebar-footer">
          <strong>Mercury OS</strong><br />
          <small>Commerce intelligence online</small>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">Mercury Command Center</div>
            <h1>Good morning, Justin.</h1>
            <p className="muted">Here is what requires attention across your commerce operation.</p>
          </div>
          <div className="status-pill"><span className="dot" />All systems operational</div>
        </header>

        <section className="grid metrics" id="performance">
          {metrics.map((metric) => (
            <article className="card" key={metric.label}>
              <div className="card-label">{metric.label}</div>
              <div className="card-value">{metric.value}</div>
              <div className="delta">{metric.delta}</div>
            </article>
          ))}
        </section>

        <section className="grid two-col">
          <article className="card" id="workers">
            <div className="section-title">
              <h2>Mercury AI workforce</h2>
              <span className="muted">4 active workers</span>
            </div>
            <div className="worker-list">
              {workers.map((worker) => (
                <div className="worker" key={worker.name}>
                  <div>
                    <div className="worker-name">{worker.name}</div>
                    <div className="worker-role">{worker.role}</div>
                  </div>
                  <span className={`badge ${worker.className}`}>{worker.status}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="card">
            <div className="section-title">
              <h2>Recent actions</h2>
              <span className="muted">Live feed</span>
            </div>
            <div className="activity-list">
              {activities.map(([text, time]) => (
                <div className="activity" key={text}>
                  <div>{text}</div>
                  <div className="activity-time">{time}</div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
