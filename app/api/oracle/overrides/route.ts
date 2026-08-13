import { randomUUID } from "node:crypto";
import { requirePermission } from "../../../../lib/platform";
import { validatePlannerOverride } from "../../../../lib/oracle/evidence";
import { oracleRequest } from "../../../../lib/oracle/http";
import { oracleDate, oracleNumber, oracleObject, oracleText } from "../../../../lib/oracle/validation";

export async function POST(request: Request) {
  return oracleRequest(async (repository, principal) => {
    requirePermission(principal, "oracle.plan");
    const body = oracleObject(await request.json()); const productBody = oracleObject(body.product);
    const override = validatePlannerOverride({ plannerId: principal.subjectId, reason: oracleText(body.reason, "reason"), quantity: oracleNumber(body.quantity, "quantity"), recordedAt: oracleDate(body.recordedAt ?? new Date().toISOString(), "recordedAt"), product: { sku: oracleText(productBody.sku, "product.sku", 200), asin: typeof productBody.asin === "string" ? productBody.asin.trim() : undefined }, forecastBefore: oracleNumber(body.forecastBefore, "forecastBefore"), forecastAfter: oracleNumber(body.forecastAfter, "forecastAfter"), expectedOutcome: oracleText(body.expectedOutcome, "expectedOutcome") });
    const id = randomUUID(); const decisionCaseId = oracleText(body.decisionCaseId, "decisionCaseId", 64);
    await repository.createOverride({ ...override, id, organizationId: principal.organizationId, decisionCaseId, planningCaseId: oracleText(body.planningCaseId, "planningCaseId", 64), inventoryDecisionId: oracleText(body.inventoryDecisionId, "inventoryDecisionId", 64) });
    await repository.appendDecisionHistory({ organizationId: principal.organizationId, decisionCaseId, actorId: principal.subjectId, eventType: "oracle.planner_override.recorded", entityType: "decision_case", entityId: id, summary: "A human planner override was recorded for later outcome comparison.", metadata: { sku: override.product.sku, forecastBefore: override.forecastBefore, forecastAfter: override.forecastAfter } });
    return { id };
  }, { status: 201, failure: "Unable to record the planner override." });
}
