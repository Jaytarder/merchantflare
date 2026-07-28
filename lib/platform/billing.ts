import type postgres from "postgres";
import type { JSONValue } from "postgres";
import {
  requirePermission,
  type OrganizationPrincipal,
} from "./authorization";
import { PlatformConflictError } from "./errors";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "paused"
  | "cancelled";

export type EntitlementValue = boolean | number | string;

export type SubscriptionEntitlement = {
  key: string;
  value: EntitlementValue;
  source: "plan" | "organization_override";
};

export type OrganizationSubscription = {
  id: string;
  organizationId: string;
  planKey: string;
  status: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  metadata: Record<string, JSONValue>;
  entitlements: SubscriptionEntitlement[];
  updatedAt: string;
};

const entitledStatuses = new Set<SubscriptionStatus>(["trialing", "active"]);

export function entitlementValue(
  subscription: OrganizationSubscription | null,
  key: string,
): EntitlementValue | undefined {
  if (!subscription || !entitledStatuses.has(subscription.status)) {
    return undefined;
  }
  const override = subscription.entitlements.find(
    (entitlement) =>
      entitlement.key === key &&
      entitlement.source === "organization_override",
  );
  return (
    override ??
    subscription.entitlements.find((entitlement) => entitlement.key === key)
  )?.value;
}

export function hasEntitlement(
  subscription: OrganizationSubscription | null,
  key: string,
) {
  const value = entitlementValue(subscription, key);
  return value === true || (typeof value === "number" && value > 0);
}

export function requireEntitlement(
  subscription: OrganizationSubscription | null,
  key: string,
) {
  if (!hasEntitlement(subscription, key)) {
    throw new PlatformConflictError(
      `The active subscription does not include ${key}.`,
    );
  }
}

type SubscriptionRow = {
  id: string;
  organization_id: string;
  plan_key: string;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: Date | null;
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
  metadata: Record<string, JSONValue>;
  updated_at: Date;
};

export class PostgresSubscriptionService {
  constructor(private readonly sql: postgres.Sql) {}

  async get(
    principal: OrganizationPrincipal,
  ): Promise<OrganizationSubscription | null> {
    requirePermission(principal, "billing.read");
    const subscriptions = await this.sql<Array<SubscriptionRow>>`
      select *
      from platform_subscriptions
      where organization_id = ${principal.organizationId}
      order by updated_at desc
      limit 1
    `;
    const subscription = subscriptions[0];
    if (!subscription) return null;
    const entitlements = await this.sql<Array<{
      key: string;
      value: EntitlementValue;
      source: SubscriptionEntitlement["source"];
    }>>`
      select entitlement_key as key, entitlement_value as value, source
      from platform_effective_entitlements
      where organization_id = ${principal.organizationId}
        and subscription_id = ${subscription.id}
      order by entitlement_key asc, source desc
    `;
    return {
      id: subscription.id,
      organizationId: subscription.organization_id,
      planKey: subscription.plan_key,
      status: subscription.status,
      stripeCustomerId: subscription.stripe_customer_id ?? undefined,
      stripeSubscriptionId: subscription.stripe_subscription_id ?? undefined,
      currentPeriodStart: subscription.current_period_start?.toISOString(),
      currentPeriodEnd: subscription.current_period_end?.toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      metadata: subscription.metadata,
      entitlements: entitlements.map((entitlement) => ({
        key: entitlement.key,
        value: entitlement.value,
        source: entitlement.source,
      })),
      updatedAt: subscription.updated_at.toISOString(),
    };
  }
}
