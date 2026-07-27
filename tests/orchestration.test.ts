import test from "node:test";
import assert from "node:assert/strict";
import { orchestrate } from "../lib/mercury/orchestrator";

test("routes a cross-module objective deterministically", async () => {
  const result = await orchestrate(
    "Audit advertising efficiency and catalog conversion",
  );

  assert.deepEqual(
    result.plan.tasks.map((task) => task.worker),
    ["vector", "atlas", "pulse"],
  );
  assert.equal(result.status, "ready");
  assert.equal(result.plan.requiresApproval, false);
});

test("keeps material optimization work approval-gated", async () => {
  const result = await orchestrate(
    "Optimize listing content and advertising bids",
  );

  assert.equal(result.status, "awaiting_approval");
  assert.equal(result.plan.requiresApproval, true);
  assert.ok(result.approvalReasons.length >= 1);
  assert.ok(
    result.routes.some((task) => task.routeStatus === "blocked_by_approval"),
  );
});
