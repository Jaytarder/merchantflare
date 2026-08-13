import { randomUUID } from "node:crypto";
import { requirePermission } from "../../../../lib/platform";
import { betterModel } from "../../../../lib/oracle/outcomes";
import { oracleRequest } from "../../../../lib/oracle/http";
import { scorePlanningOutcome } from "../../../../lib/oracle/planning";
import { oracleDate, oracleNumber, oracleObject, oracleText } from "../../../../lib/oracle/validation";

export async function POST(request: Request) {
  return oracleRequest(async (repository, principal) => {
    requirePermission(principal, "oracle.measure"); const body = oracleObject(await request.json());
    const common = { actualDemand: oracleNumber(body.actualDemand, "actualDemand"), recommendedBuy: oracleNumber(body.recommendedBuy, "recommendedBuy"), actualBuy: oracleNumber(body.actualBuy, "actualBuy"), expectedStockout: body.expectedStockout === true, actualStockout: body.actualStockout === true, expectedWos: oracleNumber(body.expectedWos, "expectedWos"), actualWos: oracleNumber(body.actualWos, "actualWos"), expectedExcess: oracleNumber(body.expectedExcess, "expectedExcess"), actualExcess: oracleNumber(body.actualExcess, "actualExcess") };
    const michaelScore = scorePlanningOutcome({ ...common, forecastDemand: oracleNumber(body.michaelForecastDemand, "michaelForecastDemand") });
    const oracleScore = scorePlanningOutcome({ ...common, forecastDemand: oracleNumber(body.oracleForecastDemand, "oracleForecastDemand") });
    const id = randomUUID(); const decisionCaseId = oracleText(body.decisionCaseId, "decisionCaseId", 64);
    await repository.transaction(async (tx) => {
      await tx.createOutcome({ ...common, forecastDemand: oracleNumber(body.oracleForecastDemand, "oracleForecastDemand"), id, organizationId: principal.organizationId, decisionCaseId, planningCaseId: oracleText(body.planningCaseId, "planningCaseId", 64), inventoryDecisionId: oracleText(body.inventoryDecisionId, "inventoryDecisionId", 64), michaelScore, oracleScore, winningModel: betterModel(michaelScore, oracleScore), context: oracleObject(body.context), observedAt: oracleDate(body.observedAt, "observedAt"), recordedBy: principal.subjectId });
      await tx.appendDecisionHistory({ organizationId: principal.organizationId, decisionCaseId, actorId: principal.subjectId, eventType: "oracle.outcome.recorded", entityType: "outcome", entityId: id, summary: "Observed inventory outcome recorded and planner models scored independently.", metadata: { winningModel: betterModel(michaelScore, oracleScore), michaelScore, oracleScore } });
    });
    return { id, winningModel: betterModel(michaelScore, oracleScore), michaelScore, oracleScore };
  }, { status: 201, failure: "Unable to record the inventory planning outcome." });
}
