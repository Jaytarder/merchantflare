import type { WorkerKey } from "../domain";
import type { MercuryCapability, RoutedTask } from "./types";

export type WorkerArtifact = {
  type: "report" | "brief" | "action-plan" | "forecast";
  name: string;
  data: Record<string, unknown>;
};

export type WorkerOutput = {
  summary: string;
  findings: string[];
  recommendations: string[];
  artifacts: WorkerArtifact[];
};

export type WorkerContext = {
  planId: string;
  objective: string;
  task: RoutedTask;
};

export type WorkerDefinition = {
  key: WorkerKey;
  name: string;
  responsibility: string;
  capabilities: MercuryCapability[];
  execute?: (context: WorkerContext) => Promise<WorkerOutput>;
};

function buildOutput(context: WorkerContext): WorkerOutput {
  const common = {
    planId: context.planId,
    taskId: context.task.id,
    objective: context.objective,
    worker: context.task.worker,
    capability: context.task.capability,
    generatedAt: new Date().toISOString(),
  };

  switch (context.task.worker) {
    case "atlas":
      return {
        summary: "Atlas completed the catalog assessment and produced a listing optimization plan.",
        findings: [
          "Catalog structure and discoverability should be validated against the stated objective.",
          "Listing content should be evaluated for clarity, relevance, and conversion coverage.",
        ],
        recommendations: [
          "Prioritize the highest-impact listings first.",
          "Validate titles, bullets, descriptions, images, and variation structure before publishing changes.",
        ],
        artifacts: [{ type: "action-plan", name: "Catalog optimization plan", data: common }],
      };
    case "vector":
      return {
        summary: "Vector completed the advertising assessment and generated an optimization framework.",
        findings: [
          "Campaign efficiency should be reviewed by targeting type and search-term relevance.",
          "Budget allocation should follow conversion performance and marginal return.",
        ],
        recommendations: [
          "Separate branded, non-branded, and product-targeting strategies.",
          "Apply negative targeting and controlled bid adjustments before scaling spend.",
        ],
        artifacts: [{ type: "report", name: "Advertising optimization report", data: common }],
      };
    case "oracle":
      return {
        summary: "Oracle generated an inventory and demand-planning assessment.",
        findings: [
          "Inventory decisions depend on demand velocity, lead time, and current coverage.",
          "Stockout and overstock exposure should be evaluated at the item level.",
        ],
        recommendations: [
          "Calculate weeks of supply using current run rate and seasonal assumptions.",
          "Protect high-velocity items and flag excess inventory for promotional planning.",
        ],
        artifacts: [{ type: "forecast", name: "Inventory forecast framework", data: common }],
      };
    case "sentinel":
      return {
        summary: "Sentinel completed the compliance risk assessment.",
        findings: [
          "Required evidence and marketplace policy status must be verified before execution.",
          "Unresolved compliance requests can create suppression and revenue risk.",
        ],
        recommendations: [
          "Centralize required documents and map them to affected products.",
          "Escalate unresolved high-impact cases with a complete evidence package.",
        ],
        artifacts: [{ type: "report", name: "Compliance risk report", data: common }],
      };
    case "forge":
      return {
        summary: "Forge produced a conversion-focused creative brief.",
        findings: [
          "Creative should communicate the product value proposition immediately.",
          "Feature communication should match shopper questions and use cases.",
        ],
        recommendations: [
          "Build an image hierarchy covering product, features, scale, use, and trust.",
          "Create channel-specific assets from one approved master brief.",
        ],
        artifacts: [{ type: "brief", name: "Creative production brief", data: common }],
      };
    case "pulse":
      return {
        summary: "Pulse generated an executive reporting structure for the objective.",
        findings: [
          "Performance should be separated into outcome, driver, and risk metrics.",
          "Reporting should distinguish completed work from measurable business impact.",
        ],
        recommendations: [
          "Track baseline, target, current result, and variance for each key metric.",
          "Publish a concise executive summary with owners and next actions.",
        ],
        artifacts: [{ type: "report", name: "Executive performance report", data: common }],
      };
    default:
      throw new Error(`Worker ${context.task.worker} cannot execute routed tasks.`);
  }
}

function executableWorker(
  key: WorkerKey,
  name: string,
  responsibility: string,
  capabilities: MercuryCapability[],
): WorkerDefinition {
  return {
    key,
    name,
    responsibility,
    capabilities,
    async execute(context) {
      if (!capabilities.includes(context.task.capability)) {
        throw new Error(`${name} cannot execute ${context.task.capability}.`);
      }
      return buildOutput(context);
    },
  };
}

export const workerRegistry: Record<WorkerKey, WorkerDefinition> = {
  mercury: {
    key: "mercury",
    name: "Mercury",
    responsibility: "Objective planning, orchestration, approvals, and coordination",
    capabilities: [],
  },
  atlas: executableWorker("atlas", "Atlas", "Catalog intelligence and listing optimization", [
    "catalog.audit",
    "catalog.optimize",
  ]),
  vector: executableWorker("vector", "Vector", "Advertising analysis and campaign optimization", [
    "advertising.audit",
    "advertising.optimize",
  ]),
  sentinel: executableWorker("sentinel", "Sentinel", "Compliance monitoring and issue resolution", [
    "compliance.audit",
    "compliance.resolve",
  ]),
  oracle: executableWorker("oracle", "Oracle", "Demand forecasting and inventory protection", [
    "inventory.forecast",
    "inventory.protect",
  ]),
  forge: executableWorker("forge", "Forge", "Creative strategy and production briefs", [
    "creative.brief",
  ]),
  pulse: executableWorker("pulse", "Pulse", "Executive reporting and performance synthesis", [
    "reporting.generate",
  ]),
};

export function getWorkerForCapability(capability: MercuryCapability): WorkerDefinition {
  const worker = Object.values(workerRegistry).find((candidate) =>
    candidate.capabilities.includes(capability),
  );

  if (!worker) {
    throw new Error(`No Mercury worker is registered for capability: ${capability}`);
  }

  return worker;
}

export function getWorkerForTask(task: RoutedTask): WorkerDefinition {
  const worker = workerRegistry[task.worker];
  if (!worker?.execute) {
    throw new Error(`No executable Mercury worker is registered for ${task.worker}.`);
  }
  return worker;
}
