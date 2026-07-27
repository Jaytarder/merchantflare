"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import MetricCard from "../components/MetricCard";

type PlannedTask = {
  id: string;
  worker: string;
  capability: string;
  title: string;
  description: string;
  priority: string;
  requiresApproval: boolean;
  dependencies: string[];
};

type MercuryResult = {
  plan: {
    id: string;
    objective: string;
    summary: string;
    confidence: number;
    requiresApproval: boolean;
    tasks: PlannedTask[];
  };
  status: "ready" | "awaiting_approval" | "running" | "completed" | "failed";
  approvalReasons: string[];
  routes: Array<PlannedTask & { routeStatus: string }>;
};

type MercuryPlanSummary = {
  id: string;
  objective: string;
  summary: string;
  status: MercuryResult["status"];
  confidence: number;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
};

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
  { name: "Forge", task: "Drafting creative briefs", progress: 36, status: "Running" },
  { name: "Pulse", task: "Preparing executive report", progress: 84, status: "Running" },
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

const suggestions = [
  "Protect Q4 inventory",
  "Optimize Pokémon listings",
  "Improve ROAS without reducing revenue",
  "Prepare executive report",
];

function formatConfidence(confidence: number) {
  const normalized = confidence <= 1 ? confidence * 100 : confidence;
  return `${Math.round(normalized)}%`;
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatStatus(status: MercuryResult["status"]) {
  return status.replaceAll("_", " ");
}

export default function DashboardPage() {
  const [objective, setObjective] = useState("");
  const [result, setResult] = useState<MercuryResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [approved, setApproved] = useState(false);
  const [history, setHistory] = useState<MercuryPlanSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await fetch("/api/mercury/history?limit=8", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Mercury could not load plan history.");
      setHistory(Array.isArray(payload.plans) ? payload.plans : []);
    } catch (requestError) {
      setHistoryError(requestError instanceof Error ? requestError.message : "Mercury could not load plan history.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  async function runObjective() {
    const value = objective.trim();
    if (!value || running) return;

    setRunning(true);
    setError("");
    setApproved(false);

    try {
      const response = await fetch("/api/mercury/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objective: value }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Mercury could not create a plan.");
      setResult(payload as MercuryResult);
      setObjective("");
      await loadHistory();
    } catch (requestError) {
      setResult(null);
      setError(requestError instanceof Error ? requestError.message : "Mercury could not create a plan.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <AppShell active="dashboard">
      <header className="topbar command-header">
        <div>
          <div className="eyebrow">Mercury Command Center</div>
          <h1>Good morning, Justin.</h1>
          <p className="muted page-lead">One operating view for catalog, advertising, inventory, compliance, and executive action.</p>
        </div>
        <div className="status-pill"><span className="dot" />Planning API online</div>
      </header>

      <section className="mercury-command" aria-label="Mercury objective planner">
        <div className="mercury-orb" aria-hidden="true">M</div>
        <div className="command-copy">
          <span className="command-kicker">Ask Mercury</span>
          <h2>What should we accomplish today?</h2>
          <p>Describe the outcome. Mercury will create a worker plan, identify dependencies, and apply approval policies.</p>
        </div>
        <div className="command-form">
          <input
            aria-label="Command Mercury"
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") void runObjective(); }}
            placeholder="Example: Improve ROAS without reducing revenue"
            maxLength={500}
          />
          <button className="btn primary" type="button" onClick={() => void runObjective()} disabled={running || !objective.trim()}>
            {running ? "Mercury is planning…" : "Run objective"}
          </button>
        </div>
        <div className="command-suggestions">
          {suggestions.map((suggestion) => (
            <button key={suggestion} type="button" onClick={() => setObjective(suggestion)}>{suggestion}</button>
          ))}
        </div>
        {error && <p className="command-error" role="alert">{error}</p>}
      </section>

      {result && (
        <section className="plan-panel" aria-live="polite">
          <div className="plan-heading">
            <div>
              <div className="eyebrow">Execution plan · {formatConfidence(result.plan.confidence)} confidence</div>
              <h2>{result.plan.objective}</h2>
              <p className="muted">{result.plan.summary}</p>
            </div>
            <span className={`plan-state ${result.status === "awaiting_approval" ? "warning" : ""}`}>
              {approved ? "Approved for execution" : result.status === "awaiting_approval" ? "Awaiting approval" : "Ready"}
            </span>
          </div>

          <div className="plan-grid">
            {result.routes.map((task, index) => (
              <div className="plan-step" key={task.id}>
                <span className="step-number">{index + 1}</span>
                <div>
                  <strong>{task.worker}</strong>
                  <p>{task.title}</p>
                  <span className="route-state">{task.routeStatus.replaceAll("_", " ")}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="approval-bar">
            <div>
              <strong>{result.plan.requiresApproval ? "Material actions are approval-gated." : "No approval is required for this plan."}</strong>
              <span>{result.approvalReasons[0] || "Mercury can stage this plan without marketplace writes."}</span>
            </div>
            {result.plan.requiresApproval && !approved && (
              <button className="btn primary" type="button" onClick={() => setApproved(true)}>Approve plan</button>
            )}
            {approved && <span className="badge live">Approval recorded</span>}
          </div>
        </section>
      )}

      <section className="card" aria-labelledby="recent-objectives-title">
        <div className="section-title">
          <div><div className="eyebrow">Mercury memory</div><h2 id="recent-objectives-title">Recent objectives</h2></div>
          <button className="text-button" type="button" onClick={() => void loadHistory()} disabled={historyLoading}>
            {historyLoading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {historyError && <p className="command-error" role="alert">{historyError}</p>}
        {!historyError && !historyLoading && history.length === 0 && (
          <p className="muted">No persisted objectives yet. Configure DATABASE_URL and run an objective to populate Mercury history.</p>
        )}
        <div className="priority-list">
          {history.map((plan) => (
            <div className="priority-item" key={plan.id}>
              <span className={`priority ${plan.status === "failed" ? "critical" : plan.status === "awaiting_approval" ? "high" : ""}`}>
                {formatStatus(plan.status)}
              </span>
              <div className="priority-copy">
                <strong>{plan.objective}</strong>
                <p>{plan.summary}</p>
                <span>{formatConfidence(plan.confidence)} confidence · {formatCreatedAt(plan.createdAt)}</span>
              </div>
              <span className={`badge ${plan.requiresApproval ? "review" : "live"}`}>
                {plan.requiresApproval ? "Approval gated" : "Autonomous"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid metrics command-metrics" id="performance">
        {metrics.map((metric) => <MetricCard key={metric.title} {...metric} />)}
      </section>

      <section className="command-layout">
        <div className="command-primary">
          <article className="card priority-panel" id="priorities">
            <div className="section-title">
              <div><div className="eyebrow">Decision queue</div><h2>Highest-impact priorities</h2></div>
              <span className="muted">3 require attention</span>
            </div>
            <div className="priority-list">
              {priorities.map((item) => (
                <div className="priority-item" key={item.title}>
                  <span className={`priority ${item.severity.toLowerCase()}`}>{item.severity}</span>
                  <div className="priority-copy"><strong>{item.title}</strong><p>{item.detail}</p><span>{item.owner} · {item.impact}</span></div>
                  <button className="text-button" type="button">Review</button>
                </div>
              ))}
            </div>
          </article>

          <article className="card" id="workers">
            <div className="section-title">
              <div><div className="eyebrow">Live operations</div><h2>AI workforce activity</h2></div>
              <span className="muted">6 workers online</span>
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
              {signals.map(([label, value, tone]) => <div className="signal-row" key={label}><span>{label}</span><strong className={tone}>{value}</strong></div>)}
            </div>
          </article>

          <article className="card" id="activity">
            <div className="section-title"><h2>Recent actions</h2><span className="muted">Live</span></div>
            <div className="activity-list compact-activity">
              {activity.map(([text, time]) => <div className="activity" key={text}><div>{text}</div><div className="activity-time">{time}</div></div>)}
            </div>
          </article>

          <article className="card" id="settings">
            <div className="section-title"><h2>Environment</h2><span className="badge live">API connected</span></div>
            <p className="muted">Mercury planning is active. Marketplace writes remain disabled until account integrations and execution controls are configured.</p>
          </article>
        </aside>
      </section>
    </AppShell>
  );
}
