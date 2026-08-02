import type postgres from "postgres";

export type MercuryDecisionContext = {
  decisionCaseId: string;
  title: string;
  status: string;
  problem: string;
  objective: string;
  currentBelief?: {
    statement: string;
    confidence: number;
    whatWouldChange: string;
  };
  hypothesisCount: number;
  evidenceCount: number;
  experimentCount: number;
  outcomeCount: number;
  lessonCount: number;
};

export async function getMercuryDecisionContexts(input: {
  sql: postgres.Sql;
  organizationId: string;
  conversationId: string;
}) {
  const rows = await input.sql<Array<{
    mercury_plan_id: string | null;
    decision_case_id: string;
    title: string;
    status: string;
    problem: string;
    objective: string;
    belief_statement: string | null;
    belief_confidence: string | number | null;
    belief_what_would_change: string | null;
    hypothesis_count: string | number;
    evidence_count: string | number;
    experiment_count: string | number;
    outcome_count: string | number;
    lesson_count: string | number;
  }>>`
    select
      decision_case.mercury_plan_id,
      decision_case.id as decision_case_id,
      decision_case.title,
      decision_case.status,
      decision_case.problem,
      decision_case.objective,
      belief.statement as belief_statement,
      belief.confidence as belief_confidence,
      belief.what_would_change as belief_what_would_change,
      (select count(*) from decision_hypotheses hypothesis
        where hypothesis.organization_id = decision_case.organization_id
          and hypothesis.decision_case_id = decision_case.id) as hypothesis_count,
      (select count(*) from decision_evidence evidence
        where evidence.organization_id = decision_case.organization_id
          and evidence.decision_case_id = decision_case.id) as evidence_count,
      (select count(*) from decision_experiments experiment
        where experiment.organization_id = decision_case.organization_id
          and experiment.decision_case_id = decision_case.id) as experiment_count,
      (select count(*) from decision_outcomes outcome
        where outcome.organization_id = decision_case.organization_id
          and outcome.decision_case_id = decision_case.id) as outcome_count,
      (select count(*) from decision_lessons lesson
        where lesson.organization_id = decision_case.organization_id
          and lesson.decision_case_id = decision_case.id) as lesson_count
    from decision_cases decision_case
    left join decision_beliefs belief
      on belief.id = decision_case.current_belief_id
      and belief.organization_id = decision_case.organization_id
    where decision_case.organization_id = ${input.organizationId}
      and decision_case.mercury_conversation_id = ${input.conversationId}
    order by decision_case.updated_at desc
  `;

  const byPlan = new Map<string, MercuryDecisionContext[]>();
  for (const row of rows) {
    if (!row.mercury_plan_id) continue;
    const contexts = byPlan.get(row.mercury_plan_id) ?? [];
    contexts.push({
      decisionCaseId: row.decision_case_id,
      title: row.title,
      status: row.status,
      problem: row.problem,
      objective: row.objective,
      currentBelief:
        row.belief_statement && row.belief_confidence !== null && row.belief_what_would_change
          ? {
              statement: row.belief_statement,
              confidence: Number(row.belief_confidence),
              whatWouldChange: row.belief_what_would_change,
            }
          : undefined,
      hypothesisCount: Number(row.hypothesis_count),
      evidenceCount: Number(row.evidence_count),
      experimentCount: Number(row.experiment_count),
      outcomeCount: Number(row.outcome_count),
      lessonCount: Number(row.lesson_count),
    });
    byPlan.set(row.mercury_plan_id, contexts);
  }
  return byPlan;
}
