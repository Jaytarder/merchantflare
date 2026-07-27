import type { TaskPriority } from "../domain";
import { getWorkerForCapability } from "./workers";
import type { ExecutionPlan, MercuryCapability, PlannedTask } from "./types";

const capabilityRules: Array<{
  capability: MercuryCapability;
  keywords: string[];
  title: string;
  description: string;
  priority: TaskPriority;
}> = [
  {
    capability: "advertising.audit",
    keywords: ["advertising", "ads", "acos", "tacos", "roas", "campaign", "cpc", "profit"],
    title: "Audit advertising performance",
    description: "Identify inefficient spend, profitable targets, budget constraints, and campaign-level opportunities.",
    priority: "high",
  },
  {
    capability: "advertising.optimize",
    keywords: ["optimize ads", "improve roas", "lower acos", "reduce spend", "increase profit", "profitability"],
    title: "Optimize advertising allocation",
    description: "Recommend bid, budget, targeting, and negative-keyword changes while protecting revenue.",
    priority: "high",
  },
  {
    capability: "catalog.audit",
    keywords: ["listing", "catalog", "conversion", "title", "bullet", "keyword", "seo", "asin"],
    title: "Audit catalog conversion",
    description: "Review product detail pages for discoverability, clarity, conversion friction, and missing content.",
    priority: "high",
  },
  {
    capability: "catalog.optimize",
    keywords: ["optimize listing", "rewrite", "improve conversion", "launch", "content"],
    title: "Prepare catalog improvements",
    description: "Generate prioritized listing recommendations and production-ready content changes.",
    priority: "medium",
  },
  {
    capability: "inventory.forecast",
    keywords: ["inventory", "stock", "forecast", "demand", "sell through", "weeks of supply"],
    title: "Forecast inventory risk",
    description: "Project demand, stockout exposure, excess inventory, and replenishment timing.",
    priority: "high",
  },
  {
    capability: "inventory.protect",
    keywords: ["protect inventory", "prevent stockout", "q4", "prime day", "seasonal"],
    title: "Build inventory protection plan",
    description: "Prioritize replenishment and advertising controls for revenue-critical ASINs.",
    priority: "critical",
  },
  {
    capability: "compliance.audit",
    keywords: ["compliance", "suppressed", "document", "reese", "pars", "safety"],
    title: "Audit compliance exposure",
    description: "Identify documentation gaps, suppressed products, deadlines, and revenue at risk.",
    priority: "critical",
  },
  {
    capability: "compliance.resolve",
    keywords: ["resolve compliance", "restore asin", "reinstate", "appeal"],
    title: "Prepare compliance resolution workflow",
    description: "Create a remediation sequence, required evidence checklist, and escalation plan.",
    priority: "critical",
  },
  {
    capability: "creative.brief",
    keywords: ["creative", "image", "video", "a+", "design", "photography"],
    title: "Create conversion-focused creative brief",
    description: "Define asset requirements, messaging hierarchy, and production priorities.",
    priority: "medium",
  },
];

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function normalizeObjective(objective: string): string {
  return objective.trim().replace(/\s+/g, " ");
}

function matchesRule(objective: string, keywords: string[]): boolean {
  const normalized = objective.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function buildTask(
  planId: string,
  rule: (typeof capabilityRules)[number],
  index: number,
): PlannedTask {
  const worker = getWorkerForCapability(rule.capability);

  return {
    id: `${planId}_task_${index + 1}`,
    worker: worker.key,
    capability: rule.capability,
    title: rule.title,
    description: rule.description,
    priority: rule.priority,
    requiresApproval: rule.capability.endsWith(".optimize") || rule.capability.endsWith(".resolve") || rule.capability === "inventory.protect",
    dependencies: [],
  };
}

function addDependencies(tasks: PlannedTask[]): PlannedTask[] {
  const auditByArea = new Map<string, string>();

  for (const task of tasks) {
    if (task.capability.endsWith(".audit") || task.capability.endsWith(".forecast")) {
      auditByArea.set(task.capability.split(".")[0], task.id);
    }
  }

  return tasks.map((task) => {
    const area = task.capability.split(".")[0];
    const prerequisite = auditByArea.get(area);
    const isExecutionTask = task.capability.endsWith(".optimize") || task.capability.endsWith(".resolve") || task.capability.endsWith(".protect");

    return prerequisite && prerequisite !== task.id && isExecutionTask
      ? { ...task, dependencies: [prerequisite] }
      : task;
  });
}

export function planObjective(rawObjective: string): ExecutionPlan {
  const objective = normalizeObjective(rawObjective);

  if (objective.length < 5) {
    throw new Error("Objective must contain at least 5 characters.");
  }

  const planId = createId("plan");
  const matchedRules = capabilityRules.filter((rule) => matchesRule(objective, rule.keywords));
  const selectedRules = matchedRules.length > 0
    ? matchedRules
    : capabilityRules.filter((rule) => ["advertising.audit", "catalog.audit", "inventory.forecast"].includes(rule.capability));

  const operationalTasks = addDependencies(
    selectedRules.map((rule, index) => buildTask(planId, rule, index)),
  );

  const reportingTask: PlannedTask = {
    id: `${planId}_task_${operationalTasks.length + 1}`,
    worker: "pulse",
    capability: "reporting.generate",
    title: "Generate executive outcome report",
    description: "Summarize findings, actions, financial impact, risks, and next decisions.",
    priority: "medium",
    requiresApproval: false,
    dependencies: operationalTasks.map((task) => task.id),
  };

  const tasks = [...operationalTasks, reportingTask];

  return {
    id: planId,
    objective,
    summary: `Mercury created a ${tasks.length}-task execution plan across ${new Set(tasks.map((task) => task.worker)).size} intelligence modules.`,
    createdAt: new Date().toISOString(),
    confidence: matchedRules.length > 0 ? 0.86 : 0.62,
    tasks,
    requiresApproval: tasks.some((task) => task.requiresApproval),
  };
}
