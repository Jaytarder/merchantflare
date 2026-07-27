"use client";

import { useState } from "react";
import AppShell from "../components/AppShell";

const metrics = [
  ["Ordered Revenue", "$2.48M", "+12.4%", "up"],
  ["Shipped Revenue", "$2.31M", "+9.7%", "up"],
  ["Ad Sales", "$603K", "+15.2%", "up"],
  ["Ad Spend", "$118K", "+8.3%", "up"],
  ["ACoS", "19.6%", "+1.8pp", "down"],
  ["TACoS", "8.8%", "+0.6pp", "down"],
];

const recommendations = [
  ["Increase budget for Minecraft Interactive Watch", "Campaign is hitting its budget limit with 16.8% ACoS", "High", "+$2K–$3K weekly sales", "Vector"],
  ["Restock Spider-Man Kids Watch", "Stockout risk in 9 days", "High", "Avoid $45K+ lost sales", "Oracle"],
  ["Optimize Bluey Watch Listing", "Low conversion rate vs. category benchmark", "Medium", "+8%–12% conversion", "Atlas"],
  ["Add exact match for ‘minecraft camera watch’", "Top converting search term not fully covered", "Medium", "+10%–15% ad sales", "Vector"],
  ["Renew GCC certificate for AC-MINE-01", "Expires in 21 days", "Medium", "Avoid suppression", "Sentinel"],
];

const workers = [
  ["Atlas", "Listing Manager", "Running", "3m ago"],
  ["Vector", "Advertising Manager", "Running", "Just now"],
  ["Oracle", "Inventory Planner", "Completed", "1h ago"],
  ["Sentinel", "Compliance Manager", "Completed", "2h ago"],
  ["Forge", "Creative Director", "Queued", "15m ago"],
  ["Pulse", "Executive Analyst", "Completed", "2h ago"],
];

export default function DashboardPage() {
  const [objective, setObjective] = useState("");
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");

  async function runObjective() {
    if (!objective.trim() || running) return;
    setRunning(true);
    setMessage("");
    try {
      const response = await fetch("/api/mercury/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objective: objective.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Mercury could not create a plan.");
      setMessage(`Plan created with ${payload.plan?.tasks?.length ?? 0} worker tasks.`);
      setObjective("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Mercury could not create a plan.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <AppShell active="dashboard">
      <div className="terminal-page">
        <header className="terminal-header">
          <div><h1>Mercury Command Center</h1><p>Executive intelligence for Accutime&apos;s Amazon Vendor business.</p></div>
          <div className="terminal-filters"><button>Jul 20 – Jul 27, 2026⌄</button><button>All Brands⌄</button><button aria-label="Notifications">●</button></div>
        </header>

        <section className="terminal-metrics">
          {metrics.map(([label, value, change, direction]) => (
            <article className="terminal-card metric-tile" key={label}>
              <span>{label}</span><strong>{value}</strong><em className={direction}>{change}</em><small>vs prior 7 days</small><div className="sparkline" />
            </article>
          ))}
        </section>

        <section className="mercury-console terminal-card">
          <div className="mercury-symbol">M</div>
          <div className="mercury-console-copy"><span>MERCURY</span><h2>What should we accomplish today?</h2><p>Set the outcome. Mercury will coordinate the right workers and stage approval-gated actions.</p></div>
          <div className="mercury-console-form"><input value={objective} onChange={(event) => setObjective(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void runObjective(); }} placeholder="Improve TACoS without reducing revenue" /><button onClick={() => void runObjective()} disabled={running || !objective.trim()}>{running ? "Planning…" : "Run objective"}</button></div>
          {message && <p className="console-message">{message}</p>}
        </section>

        <section className="terminal-grid-main">
          <article className="terminal-card revenue-panel">
            <div className="panel-head"><div><h2>Revenue Trend</h2><span><b /> Shipped Revenue　· · Prior Period</span></div><button>Daily⌄</button></div>
            <svg className="revenue-chart" viewBox="0 0 760 250" role="img" aria-label="Revenue trend chart"><path className="grid-line" d="M50 30H740M50 85H740M50 140H740M50 195H740"/><polyline className="prior-line" points="50,185 155,130 260,175 365,112 470,86 575,126 730,62"/><polyline className="current-line" points="50,150 155,100 260,128 365,72 470,55 575,76 730,25"/>{["May 4","May 5","May 6","May 7","May 8","May 9","May 10"].map((label,index)=><text key={label} x={50+index*113} y="235">{label}</text>)}</svg>
          </article>

          <article className="terminal-card signals-panel"><div className="panel-head"><h2>Top Signals</h2><button>View all</button></div>{[["Revenue Decline","6"],["ACoS Above Target","4"],["Stockout Risk","7"],["Suppressed ASINs","3"],["Compliance Risk","2"],["Opportunity Detected","8"]].map(([label,count],i)=><div className="signal-row" key={label}><span className={i===5?"positive":"negative"}>{i===5?"↑":"↓"}</span><b>{label}</b><em>{count}</em></div>)}</article>

          <article className="terminal-card brief-panel"><div className="brief-title"><span>✦</span><div><h2>Mercury Morning Brief</h2><p>July 27, 2026 · 7:30 AM</p></div></div><strong>What happened</strong><p>Shipped revenue increased 9.7%, driven by stronger performance in Minecraft and Spider-Man watches. Ad sales grew 15.2%.</p><strong>What matters</strong><p>ACoS increased to 19.6% due to higher spend on low-converting terms. Seven ASINs are at risk of stockout within 14 days.</p><strong>What to do next</strong><p>Adjust ad spend, address stockout risks, and optimize underperforming listings to protect momentum.</p><button className="outline-button">View Full Brief</button></article>
        </section>

        <section className="terminal-grid-bottom">
          <article className="terminal-card recommendations-panel"><div className="panel-head"><h2>Top Recommendations</h2><button>View all (18)</button></div><div className="recommendation-head"><span>Recommendation</span><span>Priority</span><span>Impact</span><span>Owner</span><span>Status</span></div>{recommendations.map(([title,detail,priority,impact,owner])=><div className="recommendation-row" key={title}><div><strong>{title}</strong><small>{detail}</small></div><span className={`priority-chip ${priority.toLowerCase()}`}>{priority}</span><em>{impact}</em><span>{owner}</span><button>Pending</button></div>)}</article>

          <div className="terminal-side-stack">
            <article className="terminal-card inventory-panel"><div className="panel-head"><h2>Inventory Risk</h2><button>View all</button></div><div className="inventory-content"><div className="donut"><strong>62</strong><span>ASINs</span></div><div><p><i className="red"/> At Risk (≤14 days) <b>7</b></p><p><i className="orange"/> Low (15–28 days) <b>15</b></p><p><i className="green"/> Healthy (&gt;28 days) <b>40</b></p></div></div></article>
            <article className="terminal-card workers-panel"><div className="panel-head"><h2>Worker Activity</h2><button>View all</button></div>{workers.map(([name,role,status,time])=><div className="worker-row" key={name}><span className="worker-avatar">{name[0]}</span><div><strong>{name}</strong><small>{role}</small></div><em className={status.toLowerCase()}>{status}</em><time>{time}</time></div>)}</article>
          </div>
        </section>

        <footer className="terminal-status"><span><i /> All systems operational</span><span>Last Data Refresh: July 27, 2026 9:42 AM</span><span>Amazon Vendor · Ads · Catalog</span></footer>
      </div>
    </AppShell>
  );
}
