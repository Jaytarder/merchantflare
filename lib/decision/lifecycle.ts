import { PlatformValidationError } from "../platform/errors";
import type { DecisionCaseDetail, DecisionCaseStatus } from "./types";

const transitions: Record<DecisionCaseStatus, readonly DecisionCaseStatus[]> = {
  draft: ["investigating", "archived"],
  investigating: ["proposed", "archived"],
  proposed: ["approved", "investigating", "archived"],
  approved: ["running", "proposed", "archived"],
  running: ["measuring", "archived"],
  measuring: ["closed", "running", "archived"],
  closed: ["archived"],
  archived: [],
};

export function assertLifecycleTransition(from: DecisionCaseStatus, to: DecisionCaseStatus) {
  if (!transitions[from].includes(to)) {
    throw new PlatformValidationError(`Decision Case cannot transition from ${from} to ${to}.`);
  }
}

export function lifecycleReadiness(detail: DecisionCaseDetail, target: DecisionCaseStatus) {
  const missing: string[] = [];
  if (target === "investigating" && detail.evidence.length === 0) missing.push("evidence");
  if (target === "proposed") {
    if (detail.beliefs.length === 0) missing.push("belief");
    if (detail.hypotheses.length < 2) missing.push("two competing hypotheses");
  }
  if (target === "approved" && !detail.experiments.some((item) => item.approvalStatus === "approved" || item.approvalStatus === "not_required")) missing.push("approved experiment");
  if (target === "running" && !detail.interventions.some((item) => item.status === "approved" || item.status === "executed")) missing.push("approved intervention");
  if (target === "measuring" && !detail.interventions.some((item) => item.status === "executed")) missing.push("executed intervention");
  if (target === "closed") {
    if (detail.outcomes.length === 0) missing.push("outcome");
    if (detail.lessons.length === 0) missing.push("lesson");
  }
  return { ready: missing.length === 0, missing };
}

export function assertLifecycleReady(detail: DecisionCaseDetail, target: DecisionCaseStatus) {
  assertLifecycleTransition(detail.status, target);
  const readiness = lifecycleReadiness(detail, target);
  if (!readiness.ready) {
    throw new PlatformValidationError(`Decision Case is missing ${readiness.missing.join(", ")} for ${target}.`);
  }
}
