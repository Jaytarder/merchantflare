import { PlatformValidationError } from "../platform/errors";

export type ResolvedPrediction = {
  confidence: number;
  succeeded: boolean;
  predictedAt: string;
  resolvedAt: string;
  posteriorConfidence: number;
};

function bounded(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new PlatformValidationError(`${field} must be between 0 and 1.`);
  }
  return value;
}

export function calculateCalibration(predictions: ResolvedPrediction[]) {
  if (predictions.length === 0) {
    return {
      count: 0,
      brierScore: null,
      predictionAccuracy: null,
      decisionSuccessRate: null,
      meanConfidence: null,
      confidenceDrift: null,
      distribution: [] as Array<{ bucket: string; count: number }>,
      curve: [] as Array<{ bucket: string; count: number; meanConfidence: number; observedRate: number }>,
    };
  }
  const bins = Array.from({ length: 10 }, (_, index) => ({
    floor: index / 10,
    ceiling: (index + 1) / 10,
    values: [] as ResolvedPrediction[],
  }));
  for (const prediction of predictions) {
    bounded(prediction.confidence, "confidence");
    bounded(prediction.posteriorConfidence, "posteriorConfidence");
    const index = Math.min(9, Math.floor(prediction.confidence * 10));
    bins[index].values.push(prediction);
  }
  const count = predictions.length;
  const meanConfidence = predictions.reduce((sum, item) => sum + item.confidence, 0) / count;
  const successRate = predictions.filter((item) => item.succeeded).length / count;
  const brierScore = predictions.reduce(
    (sum, item) => sum + (item.confidence - Number(item.succeeded)) ** 2,
    0,
  ) / count;
  const accuracy = predictions.filter(
    (item) => (item.confidence >= 0.5) === item.succeeded,
  ).length / count;
  const drift = predictions.reduce(
    (sum, item) => sum + Math.abs(item.posteriorConfidence - item.confidence),
    0,
  ) / count;
  const nonEmpty = bins.filter((bin) => bin.values.length > 0);
  return {
    count,
    brierScore,
    predictionAccuracy: accuracy,
    decisionSuccessRate: successRate,
    meanConfidence,
    confidenceDrift: drift,
    distribution: nonEmpty.map((bin) => ({
      bucket: `${Math.round(bin.floor * 100)}-${Math.round(bin.ceiling * 100)}%`,
      count: bin.values.length,
    })),
    curve: nonEmpty.map((bin) => ({
      bucket: `${Math.round(bin.floor * 100)}-${Math.round(bin.ceiling * 100)}%`,
      count: bin.values.length,
      meanConfidence: bin.values.reduce((sum, item) => sum + item.confidence, 0) / bin.values.length,
      observedRate: bin.values.filter((item) => item.succeeded).length / bin.values.length,
    })),
  };
}

export function classifyPredictionQuality(confidence: number, succeeded: boolean) {
  bounded(confidence, "confidence");
  const brierComponent = (confidence - Number(succeeded)) ** 2;
  return {
    brierComponent,
    classificationCorrect: (confidence >= 0.5) === succeeded,
    quality: brierComponent <= 0.1 ? "well_calibrated" : brierComponent <= 0.25 ? "mixed" : "poor",
  } as const;
}
