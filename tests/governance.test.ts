import test from "node:test";
import assert from "node:assert/strict";
import {
  APPROVAL_POLICY_VERSION,
  evaluateApproval,
} from "../lib/mercury/approvals";
import { isValidIdempotencyKey } from "../lib/idempotency";

test("approval policy decisions carry a stable policy version", () => {
  const material = evaluateApproval("advertising.optimize");
  const analytical = evaluateApproval("advertising.audit");

  assert.equal(material.required, true);
  assert.match(material.reason ?? "", /bids|budgets/i);
  assert.equal(material.policyVersion, APPROVAL_POLICY_VERSION);
  assert.equal(analytical.required, false);
  assert.equal(analytical.policyVersion, APPROVAL_POLICY_VERSION);
});

test("idempotency keys enforce the transport-safe contract", () => {
  assert.equal(isValidIdempotencyKey("request:1234-abcd"), true);
  assert.equal(isValidIdempotencyKey("short"), false);
  assert.equal(isValidIdempotencyKey("unsafe key with spaces"), false);
  assert.equal(isValidIdempotencyKey(undefined), true);
});
