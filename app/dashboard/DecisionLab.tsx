"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DecisionCase, DecisionCaseDetail, DecisionHistoryEvent } from "../../lib/decision";
import { ApprovalBanner, ConfidenceIndicator, ScientificCard, UncertaintyMeter } from "../components/decision/DecisionCards";

type Reasoning = {
  engineVersion: string;
  calculatedAt: string;
  metrics: Record<"confidence" | "uncertainty" | "evidenceCoverage" | "evidenceFreshness" | "knowledgeCompleteness" | "contradictionScore" | "experimentPriority", number>;
  supportingEvidence: Array<{ id: string; statement: string }>;
  contradictoryEvidence: Array<{ id: string; statement: string }>;
  staleEvidence: Array<{ id: string; statement: string }>;
  missingEvidence: string[];
  generatedHypotheses: Array<{ statement: string; expectedProbability: number; estimatedInformationGain: number; provenance: string }>;
  experimentPriorities: Array<{ experimentId: string; score: number; formula: string }>;
  recommendedExperimentId: string | null;
  assumptions: string[];
  selfCritique: { whereCouldBeWrong: string[]; whatWouldChangeConclusion: string; weakestEvidenceId: string | null };
  formulas: Record<string, string>;
};
type GraphEdge = { id: string; source_type: string; source_id: string; target_type: string; target_id: string; relationship: string; rationale: string };

async function payload<T>(response: Response) {
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Decision Platform request failed.");
  return body;
}

export default function DecisionLab({ canWrite, canAudit }: { canWrite: boolean; canAudit: boolean }) {
  const [cases, setCases] = useState<DecisionCase[]>([]);
  const [history, setHistory] = useState<DecisionHistoryEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DecisionCaseDetail | null>(null);
  const [reasoning, setReasoning] = useState<Reasoning | null>(null);
  const [graph, setGraph] = useState<GraphEdge[]>([]);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const [caseData, historyData] = await Promise.all([
        fetch("/api/decisions/cases?limit=50", { cache: "no-store" }).then((r) => payload<{ cases: DecisionCase[] }>(r)),
        fetch("/api/decisions/history?limit=40", { cache: "no-store" }).then((r) => payload<{ events: DecisionHistoryEvent[] }>(r)),
      ]);
      setCases(caseData.cases); setHistory(historyData.events);
      setSelectedId((current) => current ?? caseData.cases[0]?.id ?? null);
      if (canAudit) {
        setMetrics(await fetch("/api/decisions/metrics", { cache: "no-store" }).then((r) => payload<Record<string, unknown>>(r)));
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Decision Lab could not load."); }
    finally { setBusy(false); }
  }, [canAudit]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!selectedId) { setDetail(null); setReasoning(null); setGraph([]); return; }
    const controller = new AbortController(); setError("");
    void Promise.all([
      fetch(`/api/decisions/cases/${selectedId}`, { cache: "no-store", signal: controller.signal }).then((r) => payload<{ decisionCase: DecisionCaseDetail }>(r)),
      fetch(`/api/decisions/cases/${selectedId}/reasoning`, { cache: "no-store", signal: controller.signal }).then((r) => payload<{ reasoning: Reasoning; graph: GraphEdge[] }>(r)),
    ]).then(([caseData, reasoningData]) => { setDetail(caseData.decisionCase); setReasoning(reasoningData.reasoning); setGraph(reasoningData.graph); })
      .catch((reason) => { if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : "Decision Case could not load."); });
    return () => controller.abort();
  }, [selectedId]);

  async function recalculate() {
    if (!selectedId || !canWrite) return;
    setBusy(true); setError("");
    try {
      const data = await fetch(`/api/decisions/cases/${selectedId}/reasoning?persist=true`, { cache: "no-store" }).then((r) => payload<{ reasoning: Reasoning; graph: GraphEdge[] }>(r));
      setReasoning(data.reasoning); setGraph(data.graph); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Reasoning could not be recalculated."); }
    finally { setBusy(false); }
  }

  const openCases = cases.filter((item) => !["closed", "archived"].includes(item.status));
  const runningCases = cases.filter((item) => ["running", "measuring"].includes(item.status));
  const pending = cases.filter((item) => item.approvalStatus === "pending");
  const evidenceUpdates = history.filter((item) => item.entityType === "evidence").slice(0, 5);
  const confidenceChanges = history.filter((item) => item.eventType.includes("belief") || item.eventType.includes("outcome")).slice(0, 5);
  const knowledgeGrowth = typeof metrics?.knowledgeGrowth === "number" ? metrics.knowledgeGrowth : null;
  const currentBelief = detail?.beliefs.find((item) => item.id === detail.currentBeliefId) ?? detail?.beliefs[0];
  const recommendedExperiment = detail?.experiments.find((item) => item.id === reasoning?.recommendedExperimentId);
  const graphNodes = useMemo(() => new Set(graph.flatMap((edge) => [`${edge.source_type}:${edge.source_id}`, `${edge.target_type}:${edge.target_id}`])).size, [graph]);

  return <main className="decision-lab">
    <header className="decision-lab-header"><div><span>Scientific Decision Platform</span><h1>Decision Lab</h1><p>Reduce uncertainty through evidence, falsifiable beliefs, reversible experiments, and durable learning.</p></div><div className="decision-lab-actions"><Link href="/dashboard/mercury">Open Mercury</Link>{canWrite && selectedId ? <button type="button" onClick={() => void recalculate()} disabled={busy}>Recalculate reasoning</button> : null}</div></header>
    {error ? <div className="decision-lab-error" role="alert">{error}</div> : null}
    <section className="decision-work-index" aria-label="Decision work summary">
      <ScientificCard label="Open" title={`${openCases.length} Decision Cases`}><p>Active investigations, proposals, and measurement work.</p></ScientificCard>
      <ScientificCard label="Experiments" title={`${runningCases.length} Running`}><p>Cases currently executing or measuring an intervention.</p></ScientificCard>
      <ScientificCard label="Governance" title={`${pending.length} Pending Approvals`}><p>Human decisions required before material work proceeds.</p></ScientificCard>
      <ScientificCard label="Knowledge" title={knowledgeGrowth === null ? "Permission required" : `${knowledgeGrowth} Lessons`}><p>Organization-scoped reusable learning; never estimated.</p></ScientificCard>
    </section>
    <div className="decision-lab-layout">
      <aside id="decision-cases" className="decision-case-list" aria-label="Open Decision Cases"><h2>Open Decision Cases</h2>{busy && !cases.length ? <p>Loading real decision work…</p> : cases.length ? cases.map((item) => <button className={item.id === selectedId ? "is-selected" : ""} type="button" key={item.id} onClick={() => setSelectedId(item.id)}><strong>{item.title}</strong><span>{item.status} · {item.risk} risk</span></button>) : <p>No Decision Cases exist yet. Mercury can author the first evidence-backed case.</p>}</aside>
      <section className="decision-case-experience" aria-live="polite">
        {!detail ? <div className="decision-empty"><h2>Select a Decision Case</h2><p>The scientific record will appear here without invented data.</p></div> : <>
          <header><div><span>{detail.status}</span><h2>{detail.title}</h2></div><ApprovalBanner status={detail.approvalStatus} /></header>
          <div className="decision-case-flow">
            <ScientificCard label="01 · Problem" title="What must be decided?"><p>{detail.problem}</p><small>Objective: {detail.objective}</small></ScientificCard>
            <ScientificCard label="02 · Evidence" title={`${detail.evidence.length} observations`}><ul>{detail.evidence.slice(0, 4).map((item) => <li key={item.id}>{item.statement}<small>{item.grade} · {item.freshness} · {Math.round(item.confidence * 100)}%</small></li>)}</ul>{!detail.evidence.length ? <p>No evidence recorded.</p> : null}</ScientificCard>
            <ScientificCard label="03 · Current belief" title={currentBelief?.statement ?? "No belief recorded"}><ConfidenceIndicator value={reasoning?.metrics.confidence ?? currentBelief?.confidence ?? null} /><p>{currentBelief?.whatWouldChange ? `Would change if: ${currentBelief.whatWouldChange}` : "A falsification condition is required."}</p></ScientificCard>
            <ScientificCard label="04 · Alternatives" title={`${detail.hypotheses.length} competing hypotheses`}><ul>{detail.hypotheses.map((item) => <li key={item.id}>{item.statement}<small>{Math.round(item.likelihood * 100)}% expected probability</small></li>)}{reasoning?.generatedHypotheses.map((item) => <li key={item.statement}>{item.statement}<small>Proposed gap hypothesis · review required</small></li>)}</ul></ScientificCard>
            <ScientificCard label="05 · Counter evidence" title={`${reasoning?.contradictoryEvidence.length ?? 0} contradictions`}><ul>{reasoning?.contradictoryEvidence.map((item) => <li key={item.id}>{item.statement}</li>)}</ul>{!reasoning?.contradictoryEvidence.length ? <p>No contradictory evidence is linked. That absence increases uncertainty.</p> : null}</ScientificCard>
            <ScientificCard label="06 · Assumptions" title={`${reasoning?.assumptions.length ?? detail.assumptions.length} explicit`}><ul>{(reasoning?.assumptions ?? detail.assumptions).map((item) => <li key={item}>{item}</li>)}</ul></ScientificCard>
            <ScientificCard label="07 · Uncertainty" title="What remains unknown?"><UncertaintyMeter value={reasoning?.metrics.uncertainty ?? null} /><ul>{reasoning?.missingEvidence.map((item) => <li key={item}>{item}</li>)}</ul></ScientificCard>
            <ScientificCard label="08 · Recommended experiment" title={recommendedExperiment?.title ?? "No experiment ranked"}><p>{recommendedExperiment ? `Priority ${Math.round((reasoning?.metrics.experimentPriority ?? 0) * 100)}% · ${recommendedExperiment.observationWindow.durationDays ?? "Defined"} day window` : "Record a reversible experiment with success criteria."}</p><small>{reasoning?.experimentPriorities[0]?.formula}</small></ScientificCard>
            <ScientificCard label="09 · Outcome" title={detail.outcomes[0]?.observedResult ?? "Awaiting an observed result"}><p>{detail.outcomes[0] ? `${detail.outcomes[0].evidenceGrade} evidence · posterior ${Math.round(detail.outcomes[0].posteriorConfidence * 100)}%` : "Execution and observation remain distinct from recommendation."}</p></ScientificCard>
            <ScientificCard label="10 · Lessons learned" title={`${detail.lessons.length} retained`}><ul>{detail.lessons.map((item) => <li key={item.id}>{item.statement}</li>)}</ul>{!detail.lessons.length ? <p>No lesson exists until an outcome is measured.</p> : null}</ScientificCard>
          </div>
          <section className="reasoning-panel"><header><div><span>Explainability</span><h2>Scientific reasoning</h2></div><small>{reasoning?.engineVersion ?? "Unavailable"}</small></header><div className="reasoning-metrics"><ConfidenceIndicator value={reasoning?.metrics.evidenceCoverage ?? null} label="Evidence coverage"/><ConfidenceIndicator value={reasoning?.metrics.evidenceFreshness ?? null} label="Evidence freshness"/><ConfidenceIndicator value={reasoning?.metrics.knowledgeCompleteness ?? null} label="Knowledge completeness"/><ConfidenceIndicator value={reasoning?.metrics.contradictionScore ?? null} label="Contradiction score"/></div><details><summary>Reasoning formulas</summary>{Object.entries(reasoning?.formulas ?? {}).map(([name, formula]) => <p key={name}><strong>{name}</strong>: {formula}</p>)}</details><details><summary>Self critique</summary><p>What would change the conclusion: {reasoning?.selfCritique.whatWouldChangeConclusion}</p><ul>{reasoning?.selfCritique.whereCouldBeWrong.map((item) => <li key={item}>{item}</li>)}</ul></details></section>
          <section className="belief-graph"><header><div><span>Persistent knowledge graph</span><h2>Belief Graph</h2></div><small>{graphNodes} nodes · {graph.length} relationships</small></header>{graph.length ? <div className="belief-graph-edges">{graph.map((edge) => <article key={edge.id}><span>{edge.source_type}</span><strong>{edge.relationship.replaceAll("_", " ")}</strong><span>{edge.target_type}</span><p>{edge.rationale}</p></article>)}</div> : <p>No persisted relationships yet. Recalculate reasoning to materialize explicit graph edges from the Decision Case.</p>}</section>
        </>}
      </section>
      <aside className="decision-activity"><section><h2>Recent decisions</h2>{history.slice(0, 5).map((item) => <p key={item.id}>{item.summary}<time>{new Date(item.occurredAt).toLocaleDateString()}</time></p>)}</section><section><h2>Evidence updates</h2>{evidenceUpdates.length ? evidenceUpdates.map((item) => <p key={item.id}>{item.summary}</p>) : <p>No recent evidence events.</p>}</section><section><h2>Confidence changes</h2>{confidenceChanges.length ? confidenceChanges.map((item) => <p key={item.id}>{item.summary}</p>) : <p>No recent confidence revisions.</p>}</section></aside>
    </div>
  </main>;
}
