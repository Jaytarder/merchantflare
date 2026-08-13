import { PlatformValidationError } from "../platform/errors";
import { oracleLifecycleStates, planningEvidenceClassifications, type OracleLifecycleState, type PlanningEvidenceClassification } from "./types";

export function oracleObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PlatformValidationError("request must be an object.");
  return value as Record<string, unknown>;
}
export function oracleText(value: unknown, field: string, max = 1000) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new PlatformValidationError(`${field} is required and must be at most ${max} characters.`);
  return value.trim();
}
export function oracleNumber(value: unknown, field: string, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value); if (!Number.isFinite(number) || number < min || number > max) throw new PlatformValidationError(`${field} must be between ${min} and ${max}.`); return number;
}
export function oracleDate(value: unknown, field: string) {
  const text = oracleText(value, field, 64); if (!Number.isFinite(Date.parse(text))) throw new PlatformValidationError(`${field} must be an ISO timestamp.`); return new Date(text).toISOString();
}
export function oracleLifecycle(value: unknown): OracleLifecycleState {
  if (typeof value !== "string" || !oracleLifecycleStates.includes(value as OracleLifecycleState)) throw new PlatformValidationError("lifecycleState is invalid."); return value as OracleLifecycleState;
}
export function planningClassification(value: unknown): PlanningEvidenceClassification {
  if (typeof value !== "string" || !planningEvidenceClassifications.includes(value as PlanningEvidenceClassification)) throw new PlatformValidationError("classification is invalid."); return value as PlanningEvidenceClassification;
}
