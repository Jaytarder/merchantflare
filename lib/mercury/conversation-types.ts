import type { TaskPriority, WorkerKey } from "../domain";
import type {
  MercuryCapability,
  OrchestrationStatus,
  RouteStatus,
} from "./types";
import type { MercuryEvidenceCoverage } from "./evidence";

export type ConversationStatus = "active" | "archived";
export type ConversationAuthor = "user" | "mercury" | "system";
export type IntelligenceModule = Exclude<WorkerKey, "mercury">;

export type MercuryConversationSummary = {
  id: string;
  title: string;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

export type ConversationPlanTask = {
  id: string;
  module: IntelligenceModule;
  capability: MercuryCapability;
  title: string;
  description: string;
  priority: TaskPriority;
  requiresApproval: boolean;
  dependencies: string[];
  routeStatus: RouteStatus;
};

export type ConversationPlan = {
  id: string;
  rootPlanId: string;
  supersedesPlanId?: string;
  version: number;
  summary: string;
  status: OrchestrationStatus;
  confidence: number;
  requiresApproval: boolean;
  approvalReasons: string[];
  tasks: ConversationPlanTask[];
  plannerMode: "deterministic";
  evidence: MercuryEvidenceCoverage;
  approval?: {
    id: string;
    status: "pending" | "approved" | "rejected" | "superseded";
    policyVersion: string;
    decidedBy?: string;
    decisionNote?: string;
    decidedAt?: string;
  };
  createdAt: string;
};

export type MercuryConversationMessage = {
  id: string;
  author: ConversationAuthor;
  content: string;
  createdAt: string;
  plan?: ConversationPlan;
};

export type MercuryConversation = MercuryConversationSummary & {
  messages: MercuryConversationMessage[];
};
