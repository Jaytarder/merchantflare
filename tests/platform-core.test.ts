import test from "node:test";
import assert from "node:assert/strict";
import {
  canManageRole,
  hasPermission,
  OrganizationScopeError,
  requireOrganizationScope,
} from "../lib/platform/authorization";
import {
  entitlementValue,
  hasEntitlement,
  type OrganizationSubscription,
} from "../lib/platform/billing";
import {
  evaluateFeatureFlag,
  type FeatureFlag,
} from "../lib/platform/feature-flags";
import { principalFromVerifiedIdentity } from "../lib/platform/identity";

test("role permissions preserve least privilege", () => {
  assert.equal(hasPermission({ role: "owner" }, "billing.manage"), true);
  assert.equal(hasPermission({ role: "admin" }, "billing.manage"), false);
  assert.equal(hasPermission({ role: "manager" }, "mercury.approve"), true);
  assert.equal(hasPermission({ role: "analyst" }, "mercury.approve"), false);
  assert.equal(hasPermission({ role: "viewer" }, "mercury.write"), false);
  assert.equal(hasPermission({ role: "viewer" }, "mercury.read"), true);
});

test("role management protects organization owners", () => {
  assert.equal(canManageRole("owner", "owner"), true);
  assert.equal(canManageRole("admin", "manager"), true);
  assert.equal(canManageRole("admin", "owner"), false);
  assert.equal(canManageRole("manager", "viewer"), false);
});

test("organization scope rejects cross-tenant access", () => {
  assert.doesNotThrow(() =>
    requireOrganizationScope(
      { organizationId: "org_a" },
      "org_a",
    ),
  );
  assert.throws(
    () =>
      requireOrganizationScope(
        { organizationId: "org_a" },
        "org_b",
      ),
    OrganizationScopeError,
  );
});

test("verified Cognito identities require active memberships", () => {
  const principal = principalFromVerifiedIdentity({
    identity: {
      provider: "cognito",
      subjectId: "cognito-user-1",
      email: "OWNER@EXAMPLE.COM",
      emailVerified: true,
    },
    membership: {
      organizationId: "org_1",
      role: "owner",
      status: "active",
    },
    sessionExpiresAt: Date.now() + 60_000,
  });
  assert.deepEqual(principal, {
    subjectId: "cognito-user-1",
    email: "owner@example.com",
    organizationId: "org_1",
    role: "owner",
    authenticationMethod: "cognito",
    sessionExpiresAt: principal?.sessionExpiresAt,
  });
  assert.equal(
    principalFromVerifiedIdentity({
      identity: {
        provider: "cognito",
        subjectId: "cognito-user-1",
        email: "owner@example.com",
        emailVerified: true,
      },
      membership: {
        organizationId: "org_1",
        role: "owner",
        status: "suspended",
      },
      sessionExpiresAt: Date.now() + 60_000,
    }),
    null,
  );
});

test("feature flags apply user then organization override precedence", () => {
  const flag: FeatureFlag = {
    key: "mercury.new-plan-view",
    description: "A revised plan presentation.",
    defaultValue: false,
    enabled: false,
    rolloutPercentage: 0,
    metadata: {},
  };
  const evaluation = evaluateFeatureFlag({
    flag,
    context: { organizationId: "org_1", userId: "user_1" },
    overrides: [
      {
        flagKey: flag.key,
        scope: "organization",
        scopeId: "org_1",
        value: true,
      },
      {
        flagKey: flag.key,
        scope: "user",
        scopeId: "user_1",
        value: false,
      },
    ],
  });
  assert.deepEqual(evaluation, {
    key: flag.key,
    value: false,
    source: "user",
  });
});

test("feature flag percentage rollout is deterministic per organization", () => {
  const flag: FeatureFlag = {
    key: "evidence.sync-v2",
    description: "Second synchronization workflow.",
    defaultValue: true,
    enabled: true,
    rolloutPercentage: 50,
    metadata: {},
  };
  const first = evaluateFeatureFlag({
    flag,
    context: { organizationId: "org_1" },
  });
  const second = evaluateFeatureFlag({
    flag,
    context: { organizationId: "org_1" },
  });
  assert.deepEqual(first, second);
  assert.equal(typeof first.value, "boolean");
});

test("subscription entitlements require an active trusted state", () => {
  const subscription: OrganizationSubscription = {
    id: "subscription_1",
    organizationId: "org_1",
    planKey: "growth",
    status: "active",
    cancelAtPeriodEnd: false,
    metadata: {},
    entitlements: [
      { key: "mercury.access", value: true, source: "plan" },
      { key: "team.members", value: 5, source: "plan" },
      {
        key: "team.members",
        value: 10,
        source: "organization_override",
      },
    ],
    updatedAt: "2026-07-27T12:00:00.000Z",
  };
  assert.equal(hasEntitlement(subscription, "mercury.access"), true);
  assert.equal(entitlementValue(subscription, "team.members"), 10);
  assert.equal(
    hasEntitlement({ ...subscription, status: "past_due" }, "mercury.access"),
    false,
  );
});
