import { randomUUID } from "node:crypto";
import { requirePermission } from "../../../../lib/platform";
import { oracleRequest } from "../../../../lib/oracle/http";
import { validatePlanningEvidence } from "../../../../lib/oracle/evidence";
import { oracleDate, oracleNumber, oracleObject, oracleText, planningClassification } from "../../../../lib/oracle/validation";

export async function POST(request: Request) {
  return oracleRequest(async (repository, principal) => {
    requirePermission(principal, "oracle.plan");
    const body = oracleObject(await request.json());
    const productBody = oracleObject(body.product);
    const evidence = validatePlanningEvidence({
      id: randomUUID(), organizationId: principal.organizationId,
      decisionCaseId: oracleText(body.decisionCaseId, "decisionCaseId", 64),
      sourceMessageId: oracleText(body.sourceMessageId, "sourceMessageId", 500),
      sender: oracleText(body.sender, "sender", 500), receivedAt: oracleDate(body.receivedAt, "receivedAt"),
      subject: oracleText(body.subject, "subject", 1000),
      product: { sku: oracleText(productBody.sku, "product.sku", 200), asin: typeof productBody.asin === "string" ? productBody.asin.trim() : undefined },
      metricName: typeof body.metricName === "string" ? body.metricName.trim() : undefined,
      metricValue: body.metricValue === undefined ? undefined : oracleNumber(body.metricValue, "metricValue", -Number.MAX_SAFE_INTEGER),
      unit: typeof body.unit === "string" ? body.unit.trim() : undefined,
      periodStart: body.periodStart === undefined ? undefined : oracleDate(body.periodStart, "periodStart"),
      periodEnd: body.periodEnd === undefined ? undefined : oracleDate(body.periodEnd, "periodEnd"),
      classification: planningClassification(body.classification),
      statedRule: typeof body.statedRule === "string" ? body.statedRule.trim() : undefined,
      statedException: typeof body.statedException === "string" ? body.statedException.trim() : undefined,
      statedReasoning: typeof body.statedReasoning === "string" ? body.statedReasoning.trim() : undefined,
      recommendedAction: typeof body.recommendedAction === "string" ? body.recommendedAction.trim() : undefined,
      sourceConfidence: oracleNumber(body.sourceConfidence, "sourceConfidence", 0, 1),
      provenance: oracleObject(body.provenance),
    });
    const record = await repository.createPlanningEvidence({ ...evidence, planningCaseId: oracleText(body.planningCaseId, "planningCaseId", 64), createdBy: principal.subjectId });
    await repository.appendDecisionHistory({ organizationId: principal.organizationId, decisionCaseId: evidence.decisionCaseId, actorId: principal.subjectId, eventType: "oracle.planning_evidence.recorded", entityType: "evidence", entityId: record.id, summary: `Planning email evidence recorded as ${evidence.classification}.`, metadata: { sourceMessageId: evidence.sourceMessageId, sku: evidence.product.sku, classification: evidence.classification } });
    return { id: record.id, classification: evidence.classification };
  }, { status: 201, failure: "Unable to record planning evidence." });
}
