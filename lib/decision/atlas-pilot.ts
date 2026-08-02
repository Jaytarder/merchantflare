import { PlatformValidationError } from "../platform/errors";

export type AtlasTitlePilot = {
  workflow: "atlas_title_optimization";
  currentTitle: string;
  proposedTitle: string;
  productReference: string;
  metric: string;
  baseline: number;
  minimumLift: number;
  observationDays: number;
};

export function createAtlasTitlePilot(input: AtlasTitlePilot) {
  if (!input.currentTitle.trim() || !input.proposedTitle.trim() || input.currentTitle === input.proposedTitle) {
    throw new PlatformValidationError("Atlas title pilot requires distinct current and proposed titles.");
  }
  if (!input.productReference.trim() || !input.metric.trim()) {
    throw new PlatformValidationError("Atlas title pilot requires a product reference and metric.");
  }
  if (![input.baseline, input.minimumLift, input.observationDays].every(Number.isFinite) || input.observationDays < 1) {
    throw new PlatformValidationError("Atlas title pilot requires finite measurement inputs and a positive observation window.");
  }
  return {
    ...input,
    title: `Atlas title optimization · ${input.productReference}`,
    problem: "The current product title may not communicate verified attributes clearly enough.",
    objective: `Test whether a reversible title change improves ${input.metric}.`,
    competingHypotheses: [
      "Verified title clarity improves the selected outcome metric.",
      "Traffic quality or other factors explain performance; the title change will not produce the required lift.",
    ],
    successCriteria: [{ metric: input.metric, operator: "gte" as const, value: input.baseline + input.minimumLift }],
    exactIntent: { productReference: input.productReference, field: "title", from: input.currentTitle, to: input.proposedTitle },
    rollbackPlan: `Restore the exact title: ${input.currentTitle}`,
    executionBoundary: "Approval and recording do not publish to Amazon. Provider execution remains a separate authenticated action.",
  };
}
