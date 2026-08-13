import type postgres from "postgres";
import type { JSONValue } from "postgres";
import type { OraclePlanningCase, OraclePlanningOutcome, PlannerOverride, PlanningEvidence } from "./types";

type OracleSql = postgres.Sql | postgres.TransactionSql;

export class PostgresOracleRepository {
  constructor(private readonly sql: OracleSql) {}

  async transaction<T>(operation: (repository: PostgresOracleRepository) => Promise<T>) {
    if (!("begin" in this.sql)) return operation(this);
    return (this.sql as postgres.Sql).begin((tx) => operation(new PostgresOracleRepository(tx)));
  }

  async decisionCaseExists(organizationId: string, decisionCaseId: string) {
    const rows = await this.sql`select id from decision_cases where id=${decisionCaseId} and organization_id=${organizationId} limit 1`;
    return rows.length === 1;
  }

  async listPlanningCases(organizationId: string, limit = 100): Promise<OraclePlanningCase[]> {
    const rows = await this.sql<Array<any>>`
      select * from oracle_planning_cases where organization_id=${organizationId}
      order by case when status in ('review','approved','executed','measuring') then 0 else 1 end, updated_at desc
      limit ${Math.min(Math.max(limit, 1), 200)}
    `;
    return rows.map((row) => ({ id: row.id, organizationId: row.organization_id, decisionCaseId: row.decision_case_id, product: { asin: row.asin ?? undefined, sku: row.sku, marketplace: row.marketplace ?? undefined, category: row.category ?? undefined, license: row.license ?? undefined, productGroup: row.product_group ?? undefined }, status: row.status, lifecycleState: row.lifecycle_state, coverageHorizonDate: new Date(row.coverage_horizon_date).toISOString(), createdBy: row.created_by, createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString() }));
  }

  async createPlanningCase(input: OraclePlanningCase) {
    const rows = await this.sql<Array<any>>`
      insert into oracle_planning_cases (id,organization_id,decision_case_id,asin,sku,marketplace,category,license,product_group,lifecycle_state,coverage_horizon_date,status,created_by,created_at,updated_at)
      values (${input.id},${input.organizationId},${input.decisionCaseId},${input.product.asin ?? null},${input.product.sku},${input.product.marketplace ?? null},${input.product.category ?? null},${input.product.license ?? null},${input.product.productGroup ?? null},${input.lifecycleState},${input.coverageHorizonDate},${input.status},${input.createdBy},${input.createdAt},${input.updatedAt}) returning *
    `;
    return rows[0];
  }

  async createPlanningEvidence(input: PlanningEvidence & { planningCaseId: string; createdBy: string }) {
    const rows = await this.sql<Array<{ id: string }>>`
      insert into oracle_planning_evidence (id,organization_id,decision_case_id,planning_case_id,source_message_id,sender,received_at,subject,asin,sku,metric_name,metric_value,unit,period_start,period_end,classification,stated_rule,stated_exception,stated_reasoning,recommended_action,source_confidence,provenance,created_by)
      values (${input.id},${input.organizationId},${input.decisionCaseId},${input.planningCaseId},${input.sourceMessageId},${input.sender},${input.receivedAt},${input.subject},${input.product.asin ?? null},${input.product.sku},${input.metricName ?? null},${input.metricValue ?? null},${input.unit ?? null},${input.periodStart ?? null},${input.periodEnd ?? null},${input.classification},${input.statedRule ?? null},${input.statedException ?? null},${input.statedReasoning ?? null},${input.recommendedAction ?? null},${input.sourceConfidence},${this.sql.json(input.provenance as JSONValue)},${input.createdBy}) returning id
    `;
    return rows[0];
  }

  async createOverride(input: PlannerOverride & { id: string; organizationId: string; decisionCaseId: string; planningCaseId: string; inventoryDecisionId: string }) {
    const rows = await this.sql<Array<{ id: string }>>`
      insert into oracle_planner_overrides (id,organization_id,decision_case_id,planning_case_id,inventory_decision_id,planner_id,asin,sku,original_recommendation,override_value,reason,expected_outcome,recorded_at)
      values (${input.id},${input.organizationId},${input.decisionCaseId},${input.planningCaseId},${input.inventoryDecisionId},${input.plannerId},${input.product.asin ?? null},${input.product.sku},${this.sql.json({ forecast: input.forecastBefore } as JSONValue)},${this.sql.json({ forecast: input.forecastAfter, quantity: input.quantity } as JSONValue)},${input.reason},${input.expectedOutcome},${input.recordedAt}) returning id
    `;
    return rows[0];
  }

  async createOutcome(input: OraclePlanningOutcome & { id: string; organizationId: string; decisionCaseId: string; planningCaseId: string; inventoryDecisionId: string; michaelScore: Record<string, unknown>; oracleScore: Record<string, unknown>; winningModel: "MichaelModel" | "OracleModel" | "tie"; context: Record<string, unknown>; observedAt: string; recordedBy: string }) {
    const rows = await this.sql<Array<{ id: string }>>`
      insert into oracle_planning_outcomes (id,organization_id,decision_case_id,planning_case_id,inventory_decision_id,forecast_demand,actual_demand,recommended_buy,actual_buy,expected_stockout,actual_stockout,expected_wos,actual_wos,expected_excess,actual_excess,michael_score,oracle_score,winning_model,context,observed_at,recorded_by)
      values (${input.id},${input.organizationId},${input.decisionCaseId},${input.planningCaseId},${input.inventoryDecisionId},${input.forecastDemand},${input.actualDemand},${input.recommendedBuy},${input.actualBuy},${input.expectedStockout},${input.actualStockout},${input.expectedWos},${input.actualWos},${input.expectedExcess},${input.actualExcess},${this.sql.json(input.michaelScore as JSONValue)},${this.sql.json(input.oracleScore as JSONValue)},${input.winningModel},${this.sql.json(input.context as JSONValue)},${input.observedAt},${input.recordedBy}) returning id
    `;
    return rows[0];
  }

  async appendDecisionHistory(input: { organizationId: string; decisionCaseId: string; actorId: string; eventType: string; entityType: string; entityId: string; summary: string; metadata: Record<string, unknown> }) {
    await this.sql`insert into decision_history_events (organization_id,decision_case_id,actor_id,event_type,entity_type,entity_id,summary,metadata) values (${input.organizationId},${input.decisionCaseId},${input.actorId},${input.eventType},${input.entityType},${input.entityId},${input.summary},${this.sql.json(input.metadata as JSONValue)})`;
  }
}
