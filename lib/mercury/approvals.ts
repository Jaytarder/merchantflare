import type { MercuryCapability, PlannedTask } from "./types";

export const APPROVAL_POLICY_VERSION = "2026-07-27.v1";

export type ApprovalPolicy = {
  capability: MercuryCapability;
  reason: string;
};

const approvalPolicies: ApprovalPolicy[] = [
  {
    capability: "advertising.optimize",
    reason: "Changes may modify bids, budgets, targeting, or campaign state.",
  },
  {
    capability: "catalog.optimize",
    reason: "Changes may update customer-facing product content.",
  },
  {
    capability: "inventory.protect",
    reason: "Changes may alter replenishment priorities or advertising constraints.",
  },
  {
    capability: "compliance.resolve",
    reason: "Changes may submit evidence, appeals, or escalations to a marketplace.",
  },
];

export type ApprovalDecision = {
  required: boolean;
  reason?: string;
  policyVersion: string;
};

export function evaluateApproval(capability: MercuryCapability): ApprovalDecision {
  const policy = approvalPolicies.find((candidate) => candidate.capability === capability);

  return policy
    ? {
        required: true,
        reason: policy.reason,
        policyVersion: APPROVAL_POLICY_VERSION,
      }
    : { required: false, policyVersion: APPROVAL_POLICY_VERSION };
}

export function applyApprovalPolicies(tasks: PlannedTask[]): PlannedTask[] {
  return tasks.map((task) => ({
    ...task,
    requiresApproval: evaluateApproval(task.capability).required,
  }));
}

export function getApprovalReasons(tasks: PlannedTask[]): string[] {
  return tasks.flatMap((task) => {
    const decision = evaluateApproval(task.capability);
    return decision.required && decision.reason
      ? [`${task.title}: ${decision.reason}`]
      : [];
  });
}
