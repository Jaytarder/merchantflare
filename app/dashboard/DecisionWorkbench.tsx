"use client";

import { useEffect, useState, type FormEvent } from "react";

type Mode = "author" | "metrics";
type Metrics = Record<string, unknown> & { calibration?: Record<string, unknown> };

async function json<T>(response: Response): Promise<T> {
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Decision request failed.");
  return payload;
}

async function post<T>(path: string, body: unknown) {
  return json<T>(await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
}

function values(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
}

function list(value: string) {
  return value.split(";").map((item) => item.trim()).filter(Boolean);
}

export default function DecisionWorkbench({ mode, canWrite, canApprove, canAudit, onClose }: { mode: Mode; canWrite: boolean; canApprove: boolean; canAudit: boolean; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    if (mode !== "metrics" || !canAudit) return;
    setBusy(true);
    void fetch("/api/decisions/metrics", { cache: "no-store" })
      .then((response) => json<Metrics>(response))
      .then(setMetrics)
      .catch((error) => setMessage(error instanceof Error ? error.message : "Metrics unavailable."))
      .finally(() => setBusy(false));
  }, [mode, canAudit]);

  async function author(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const data = values(event.currentTarget);
      const created = await post<{ decisionCase: { id: string } }>("/api/decisions/cases", {
        title: data.title, problem: data.problem, objective: data.objective,
        risk: data.risk, reversibility: "easy", assumptions: list(data.assumptions), confounders: list(data.confounders),
        expectedOutcome: data.expectedOutcome,
      });
      const decisionCaseId = created.decisionCase.id;
      const evidence = await post<{ evidence: { id: string } }>("/api/decisions/evidence", {
        decisionCaseId, source: data.source, statement: data.evidence, observedAt: new Date().toISOString(),
        freshness: "current", confidence: Number(data.evidenceConfidence), evidenceGrade: "observed",
        relationships: [], supportingReferences: list(data.references), limitations: ["Author-entered evidence requires source verification."],
      });
      const counter = await post<{ evidence: { id: string } }>("/api/decisions/evidence", {
        decisionCaseId, source: data.source, statement: data.counterEvidence, observedAt: new Date().toISOString(),
        freshness: "current", confidence: Number(data.evidenceConfidence), evidenceGrade: "observed",
        relationships: [], supportingReferences: list(data.references), limitations: ["Author-entered counter-evidence requires source verification."],
      });
      const belief = await post<{ belief: { id: string } }>("/api/decisions/beliefs", {
        decisionCaseId, statement: data.belief, confidence: Number(data.beliefConfidence), missingEvidence: list(data.missingEvidence),
        assumptions: list(data.assumptions), whatWouldChange: data.whatWouldChange, changeReason: "Initial Decision Case authoring",
      });
      const hypothesisBodies = [data.hypothesisA, data.hypothesisB].map((statement, index) => ({
        decisionCaseId, statement, likelihood: index === 0 ? Number(data.beliefConfidence) : 1 - Number(data.beliefConfidence),
        confidence: Number(data.beliefConfidence), estimatedRisk: data.risk, suggestedExperiment: data.experiment,
      }));
      const hypotheses = [] as Array<{ id: string }>;
      for (const body of hypothesisBodies) {
        const response = await post<{ hypothesis: { id: string } }>("/api/decisions/hypotheses", body);
        hypotheses.push(response.hypothesis);
      }
      for (const link of [
        { evidenceId: evidence.evidence.id, relationship: "supports" },
        { evidenceId: counter.evidence.id, relationship: "counters" },
      ]) {
        await post("/api/decisions/evidence-links", { decisionCaseId, entityType: "belief", entityId: belief.belief.id, ...link });
      }
      const experiment = await post<{ experiment: { id: string } }>("/api/decisions/experiments", {
        decisionCaseId, hypothesisId: hypotheses[0].id, title: data.experiment,
        expectedLift: Number(data.expectedLift), expectedRisk: data.risk,
        observationWindow: { durationDays: Number(data.observationDays) }, rollbackPlan: data.rollbackPlan,
        successCriteria: [{ metric: data.metric, operator: "gte", value: Number(data.successValue) }],
      });
      await post("/api/decisions/interventions", {
        decisionCaseId, experimentId: experiment.experiment.id, description: data.intervention,
        exactIntent: { workflow: "manual", objective: data.objective }, reversibility: "easy", rollbackPlan: data.rollbackPlan,
      });
      setMessage(`Decision Case ${decisionCaseId} persisted with evidence, belief, two hypotheses, counter-evidence, a calibrated prediction, and an exact reversible intervention.`);
      event.currentTarget.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Decision Case authoring failed.");
    } finally {
      setBusy(false);
    }
  }

  async function continueLifecycle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const data = values(event.currentTarget);
      if (data.lifecycleAction === "approve") {
        if (!canApprove) throw new Error("Your role cannot approve experiments.");
        await post(`/api/decisions/experiments/${data.experimentId}/approval`, { decisionCaseId: data.decisionCaseId, decision: "approved" });
      } else if (data.lifecycleAction === "execute") {
        await post("/api/decisions/executions", { decisionCaseId: data.decisionCaseId, experimentId: data.experimentId, interventionId: data.interventionId, idempotencyKey: crypto.randomUUID(), executionMode: "manual", result: { note: data.result }, executedAt: new Date().toISOString() });
      } else if (data.lifecycleAction === "outcome") {
        await post("/api/decisions/outcomes", { decisionCaseId: data.decisionCaseId, experimentId: data.experimentId, observedResult: data.result, evidenceGrade: data.evidenceGrade, measuredImpact: { metric: data.metric, value: Number(data.measuredValue) }, unexpectedEffects: list(data.unexpectedEffects), posteriorConfidence: Number(data.posteriorConfidence), succeeded: data.succeeded === "true", observedAt: new Date().toISOString(), lesson: data.lesson, applicability: list(data.applicability), lessonLimitations: list(data.lessonLimitations) });
      } else {
        await post(`/api/decisions/cases/${data.decisionCaseId}/transition`, { status: data.targetStatus });
      }
      setMessage(`Lifecycle action ${data.lifecycleAction} persisted. Decision History updated automatically.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Lifecycle action failed.");
    } finally {
      setBusy(false);
    }
  }

  const metricEntries = metrics ? [
    ["Decision accuracy", metrics.calibration?.predictionAccuracy], ["Brier score", metrics.calibration?.brierScore],
    ["Calibration confidence", metrics.calibration?.meanConfidence], ["Confidence drift", metrics.calibration?.confidenceDrift],
    ["Evidence coverage", metrics.evidenceCoverage], ["Evidence freshness", metrics.evidenceFreshness],
    ["Experiment success", metrics.experimentSuccessRate], ["False positive rate", metrics.falsePositiveRate],
    ["False negative rate", metrics.falseNegativeRate], ["Decision latency (hours)", metrics.decisionLatencyHours],
    ["Throughput (30d)", metrics.decisionThroughput30d], ["Knowledge growth", metrics.knowledgeGrowth], ["Decision reuse", metrics.decisionReuse],
  ] : [];

  return <div className="decision-workbench" role="dialog" aria-modal="true" aria-label={mode === "author" ? "Decision Case authoring" : "Decision engineering metrics"}>
    <header><div><span>Scientific Decision Platform</span><h2>{mode === "author" ? "Author Decision Case" : "Internal decision metrics"}</h2></div><button type="button" onClick={onClose}>Close</button></header>
    {mode === "metrics" ? (
      !canAudit ? <p>Owner or Admin audit permission is required.</p> : busy ? <p>Calculating organization-scoped metrics…</p> : metrics ? <><div className="decision-metric-grid">{metricEntries.map(([label, value]) => <article key={String(label)}><span>{String(label)}</span><strong>{typeof value === "number" ? (String(label).includes("score") || String(label).includes("hours") || Number.isInteger(value) ? value.toFixed(String(label).includes("score") || String(label).includes("hours") ? 3 : 0) : `${(value * 100).toFixed(1)}%`) : "Not enough data"}</strong></article>)}</div><p className="decision-method-note">Metrics are calculated only from resolved, organization-scoped predictions. Empty values are not estimated.</p></> : <p>{message || "Metrics unavailable."}</p>
    ) : (
      <div className="decision-authoring">
      <form className="decision-author-form" onSubmit={author}>
        <label>Title<input name="title" required maxLength={200}/></label>
        <label>Problem<textarea name="problem" required/></label><label>Objective<textarea name="objective" required/></label>
        <label>Observed evidence<textarea name="evidence" required/></label><label>Counter-evidence<textarea name="counterEvidence" required/></label>
        <label>Source<input name="source" required/></label><label>Source references (semicolon separated)<input name="references"/></label>
        <label>Evidence confidence<input name="evidenceConfidence" type="number" min="0" max="1" step="0.01" defaultValue="0.7" required/></label>
        <label>Current belief<textarea name="belief" required/></label><label>Belief confidence<input name="beliefConfidence" type="number" min="0" max="1" step="0.01" defaultValue="0.5" required/></label>
        <label>Alternative hypothesis A<textarea name="hypothesisA" required/></label><label>Alternative hypothesis B<textarea name="hypothesisB" required/></label>
        <label>Assumptions (semicolon separated)<input name="assumptions"/></label><label>Confounders (semicolon separated)<input name="confounders"/></label>
        <label>Missing evidence (semicolon separated)<input name="missingEvidence"/></label><label>What would change this belief?<textarea name="whatWouldChange" required/></label>
        <label>Risk<select name="risk" defaultValue="low"><option>low</option><option>medium</option><option>high</option><option>critical</option></select></label>
        <label>Expected outcome<textarea name="expectedOutcome" required/></label><label>Experiment<textarea name="experiment" required/></label>
        <label>Exact intervention<textarea name="intervention" required/></label>
        <label>Metric<input name="metric" required/></label><label>Success threshold<input name="successValue" type="number" step="any" required/></label>
        <label>Expected lift<input name="expectedLift" type="number" step="any" required/></label><label>Observation days<input name="observationDays" type="number" min="1" defaultValue="14" required/></label>
        <label>Rollback plan<textarea name="rollbackPlan" required/></label>
        <button type="submit" disabled={!canWrite || busy}>{busy ? "Persisting lifecycle…" : "Create Decision Case"}</button>
      </form>
      <details className="decision-lifecycle-actions">
        <summary>Continue an existing Decision Case</summary>
        <form className="decision-author-form" onSubmit={continueLifecycle}>
          <label>Action<select name="lifecycleAction"><option value="transition">Transition state</option><option value="approve">Approve experiment</option><option value="execute">Record manual execution</option><option value="outcome">Record outcome, posterior belief, and lesson</option></select></label>
          <label>Decision Case ID<input name="decisionCaseId" required/></label><label>Experiment ID<input name="experimentId"/></label><label>Intervention ID<input name="interventionId"/></label>
          <label>Target state<select name="targetStatus"><option>investigating</option><option>proposed</option><option>approved</option><option>running</option><option>measuring</option><option>closed</option><option>archived</option></select></label>
          <label>Observed result / execution note<textarea name="result"/></label><label>Evidence grade<select name="evidenceGrade"><option value="observed">Observed</option><option value="correlated">Correlated</option><option value="controlled">Controlled</option><option value="quasi_causal">Quasi-Causal</option><option value="experimental">Experimental</option><option value="replicated">Replicated</option></select></label>
          <label>Metric<input name="metric"/></label><label>Measured value<input name="measuredValue" type="number" step="any"/></label>
          <label>Success criteria met?<select name="succeeded"><option value="true">Yes</option><option value="false">No</option></select></label><label>Posterior confidence<input name="posteriorConfidence" type="number" min="0" max="1" step="0.01" defaultValue="0.5"/></label>
          <label>Unexpected effects (semicolon separated)<input name="unexpectedEffects"/></label><label>Reusable lesson<textarea name="lesson"/></label>
          <label>Lesson applicability (semicolon separated)<input name="applicability"/></label><label>Lesson limitations (semicolon separated)<input name="lessonLimitations"/></label>
          <button type="submit" disabled={!canWrite || busy}>Persist lifecycle action</button>
        </form>
      </details>
      </div>
    )}
    {message ? <p className="decision-workbench-message" role="status">{message}</p> : null}
  </div>;
}
