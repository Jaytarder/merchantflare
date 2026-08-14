import { randomUUID } from "crypto";
import type postgres from "postgres";
import type { JSONValue } from "postgres";
import { requireOrganizationScope, requirePermission, type OrganizationPrincipal } from "../platform";
import { validateChristianReport } from "./evidence";
import type { ChristianReportFact, JointOutcome, VectorAction } from "./types";

export async function ingestChristianReport(sql: postgres.Sql, principal: OrganizationPrincipal, fact: ChristianReportFact) {
  requirePermission(principal, "vector.plan");
  const validated = validateChristianReport(fact);
  const rows = await sql<Array<{id:string}>>`insert into vector_christian_reports (id, organization_id, source_message_id, sender, received_at, subject, fact_hash, classification, fact, provenance) values (${`christian_report_${randomUUID()}`}, ${principal.organizationId}, ${validated.sourceMessageId}, ${validated.sender}, ${validated.receivedAt}, ${validated.subject}, ${validated.idempotencyKey}, ${validated.classification}, ${sql.json(validated as unknown as JSONValue)}, ${sql.json(validated.provenance as JSONValue)}) on conflict (organization_id, source_message_id, fact_hash) do nothing returning id`;
  const existing = rows[0] ? rows : await sql<Array<{id:string}>>`select id from vector_christian_reports where organization_id=${principal.organizationId} and source_message_id=${validated.sourceMessageId} and fact_hash=${validated.idempotencyKey} limit 1`;
  return { id: existing[0].id, idempotencyKey: validated.idempotencyKey };
}
export async function proposeVectorIntervention(sql: postgres.Sql, principal: OrganizationPrincipal, input:{organizationId:string;productIdentityId:string;decisionCaseId?:string;action:VectorAction;currentState:Record<string,unknown>;proposedChange:Record<string,unknown>;expectedEffect:Record<string,unknown>;idempotencyKey:string}) {
  requirePermission(principal,"vector.plan"); requirePermission(principal,"joint.plan"); requireOrganizationScope(principal,input.organizationId);
  const rows=await sql<Array<{id:string}>>`insert into vector_interventions (id,organization_id,product_identity_id,decision_case_id,action,current_state,proposed_change,expected_effect,status,requires_joint_decision,idempotency_key,created_by) values (${`vector_intervention_${randomUUID()}`},${principal.organizationId},${input.productIdentityId},${input.decisionCaseId??null},${input.action},${sql.json(input.currentState as JSONValue)},${sql.json(input.proposedChange as JSONValue)},${sql.json(input.expectedEffect as JSONValue)},'PROPOSED',true,${input.idempotencyKey},${principal.subjectId}) on conflict (organization_id,idempotency_key) do update set idempotency_key=excluded.idempotency_key returning id`;
  return {id:rows[0].id,status:"PROPOSED" as const};
}
export async function recordJointOutcome(sql:postgres.Sql,principal:OrganizationPrincipal,input:{organizationId:string;jointCaseId:string;outcome:JointOutcome;observedAt:string;provenance:Record<string,unknown>}){
  requirePermission(principal,"joint.measure");requireOrganizationScope(principal,input.organizationId);
  const rows=await sql<Array<{id:string}>>`insert into joint_outcomes (id,organization_id,joint_case_id,predicted,actual,observed_at,provenance,created_by) values (${`joint_outcome_${randomUUID()}`},${principal.organizationId},${input.jointCaseId},${sql.json(input.outcome.predicted as JSONValue)},${sql.json(input.outcome.actual as JSONValue)},${input.observedAt},${sql.json(input.provenance as JSONValue)},${principal.subjectId}) on conflict (organization_id,joint_case_id) do nothing returning id`;
  if(!rows[0]) throw new Error("A joint outcome is already recorded for this decision."); return {id:rows[0].id};
}
