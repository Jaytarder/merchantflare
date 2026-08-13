import { randomUUID } from "node:crypto";
import { requirePermission } from "../../../../lib/platform";
import { PlatformNotFoundError } from "../../../../lib/platform/errors";
import { oracleRequest } from "../../../../lib/oracle/http";
import { oracleDate, oracleLifecycle, oracleObject, oracleText } from "../../../../lib/oracle/validation";

export async function GET(request: Request) {
  return oracleRequest(async (repository, principal) => {
    requirePermission(principal, "oracle.read");
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 100);
    return { planningCases: await repository.listPlanningCases(principal.organizationId, Number.isFinite(limit) ? limit : 100) };
  }, { failure: "Unable to load inventory planning cases." });
}

export async function POST(request: Request) {
  return oracleRequest(async (repository, principal) => {
    requirePermission(principal, "oracle.plan");
    const body = oracleObject(await request.json());
    const decisionCaseId = oracleText(body.decisionCaseId, "decisionCaseId", 64);
    if (!(await repository.decisionCaseExists(principal.organizationId, decisionCaseId))) throw new PlatformNotFoundError("Decision Case");
    const product = oracleObject(body.product);
    const now = new Date().toISOString();
    const planningCase = {
      id: randomUUID(), organizationId: principal.organizationId, decisionCaseId,
      product: { sku: oracleText(product.sku, "product.sku", 200), asin: typeof product.asin === "string" ? product.asin.trim() : undefined, marketplace: typeof product.marketplace === "string" ? product.marketplace.trim() : undefined, category: typeof product.category === "string" ? product.category.trim() : undefined, license: typeof product.license === "string" ? product.license.trim() : undefined, productGroup: typeof product.productGroup === "string" ? product.productGroup.trim() : undefined },
      status: "draft" as const, lifecycleState: oracleLifecycle(body.lifecycleState),
      coverageHorizonDate: oracleDate(body.coverageHorizonDate, "coverageHorizonDate"),
      createdBy: principal.subjectId, createdAt: now, updatedAt: now,
    };
    await repository.transaction(async (tx) => {
      await tx.createPlanningCase(planningCase);
      await tx.appendDecisionHistory({ organizationId: principal.organizationId, decisionCaseId, actorId: principal.subjectId, eventType: "oracle.planning_case.created", entityType: "decision_case", entityId: planningCase.id, summary: "Demand and availability planning case created.", metadata: { sku: planningCase.product.sku, asin: planningCase.product.asin, lifecycleState: planningCase.lifecycleState } });
    });
    return { planningCase };
  }, { status: 201, failure: "Unable to create the inventory planning case." });
}
