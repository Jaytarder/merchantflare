# Belief Graph

## Status

- **Implemented:** additive `decision_belief_graph_edges` storage and relationship materialization from explicit Decision Platform links.
- **Verified locally:** migration ordering, composite tenant constraint, index, self-edge prevention, uniqueness, and append-only trigger.
- **Planned:** graph layout controls, dependency authoring, semantic similarity edges, and graph-scale performance testing.

## Nodes and relationships

Nodes retain the identifiers of Beliefs, Evidence, Hypotheses, Experiments, Outcomes, and Lessons. Edges may support, contradict, depend on, test, produce, revise, inform, or reuse. Each edge includes an organization, Decision Case, rationale, weight, actor, and timestamp.

Materialization derives only defensible relationships:

- explicit evidence links become support, contradiction, or information edges;
- a recorded experiment tests its hypothesis;
- a recorded outcome is produced by its experiment; and
- a lesson is produced by its outcome.

The graph does not infer causation. Historical edges cannot be updated or deleted.
