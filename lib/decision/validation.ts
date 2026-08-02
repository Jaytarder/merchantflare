import { evidenceGrades, type EvidenceGrade } from "./types";
import { PlatformValidationError } from "../platform/errors";

export function requireText(value: unknown, field: string, maximum = 4_000) {
  if (typeof value !== "string") {
    throw new PlatformValidationError(`${field} must be text.`);
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > maximum) {
    throw new PlatformValidationError(
      `${field} must contain between 1 and ${maximum} characters.`,
    );
  }
  return normalized;
}

export function optionalText(value: unknown, field: string, maximum = 4_000) {
  return value === undefined || value === null
    ? undefined
    : requireText(value, field, maximum);
}

export function requireConfidence(value: unknown, field = "confidence") {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new PlatformValidationError(`${field} must be a number from 0 through 1.`);
  }
  return value;
}

export function requireStringList(value: unknown, field: string, maximumItems = 100) {
  if (!Array.isArray(value) || value.length > maximumItems) {
    throw new PlatformValidationError(
      `${field} must be an array with at most ${maximumItems} items.`,
    );
  }
  return value.map((item, index) =>
    requireText(item, `${field}[${index}]`, 1_000),
  );
}

export function requireEvidenceGrade(value: unknown): EvidenceGrade {
  if (typeof value !== "string" || !evidenceGrades.includes(value as EvidenceGrade)) {
    throw new PlatformValidationError(
      `evidenceGrade must be one of: ${evidenceGrades.join(", ")}.`,
    );
  }
  return value as EvidenceGrade;
}

export function requireIsoTimestamp(value: unknown, field: string) {
  const timestamp = requireText(value, field, 64);
  if (!Number.isFinite(Date.parse(timestamp))) {
    throw new PlatformValidationError(`${field} must be an ISO 8601 timestamp.`);
  }
  return new Date(timestamp).toISOString();
}

export function assertCompetingHypotheses(hypotheses: readonly unknown[]) {
  if (hypotheses.length < 2) {
    throw new PlatformValidationError(
      "A decision recommendation requires at least two competing hypotheses.",
    );
  }
}

export function causalLanguageAllowed(grade: EvidenceGrade) {
  return grade === "experimental" || grade === "replicated";
}

export function classifyOutcomeClaim(grade: EvidenceGrade, statement: string) {
  const causalLanguage = /\b(caused?|causes?|because of|led to|resulted in)\b/i;
  if (causalLanguage.test(statement) && !causalLanguageAllowed(grade)) {
    throw new PlatformValidationError(
      "Causal language requires experimental or replicated evidence.",
    );
  }
  return statement;
}
