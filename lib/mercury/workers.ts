import type { WorkerKey } from "../domain";
import type { MercuryCapability } from "./types";

export type WorkerDefinition = {
  key: WorkerKey;
  name: string;
  responsibility: string;
  capabilities: MercuryCapability[];
};

export const workerRegistry: Record<WorkerKey, WorkerDefinition> = {
  mercury: {
    key: "mercury",
    name: "Mercury",
    responsibility: "Objective planning, orchestration, approvals, and coordination",
    capabilities: [],
  },
  atlas: {
    key: "atlas",
    name: "Atlas",
    responsibility: "Catalog intelligence and listing optimization",
    capabilities: ["catalog.audit", "catalog.optimize"],
  },
  vector: {
    key: "vector",
    name: "Vector",
    responsibility: "Advertising analysis and campaign optimization",
    capabilities: ["advertising.audit", "advertising.optimize"],
  },
  sentinel: {
    key: "sentinel",
    name: "Sentinel",
    responsibility: "Compliance monitoring and issue resolution",
    capabilities: ["compliance.audit", "compliance.resolve"],
  },
  oracle: {
    key: "oracle",
    name: "Oracle",
    responsibility: "Demand forecasting and inventory protection",
    capabilities: ["inventory.forecast", "inventory.protect"],
  },
  forge: {
    key: "forge",
    name: "Forge",
    responsibility: "Creative strategy and production briefs",
    capabilities: ["creative.brief"],
  },
  pulse: {
    key: "pulse",
    name: "Pulse",
    responsibility: "Executive reporting and performance synthesis",
    capabilities: ["reporting.generate"],
  },
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
