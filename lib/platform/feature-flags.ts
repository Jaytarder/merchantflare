import { createHash } from "node:crypto";
import type postgres from "postgres";
import type { JSONValue } from "postgres";

export type FeatureFlagValue = boolean | string | number;
export type FeatureFlagScope = "system" | "organization" | "user";

export type FeatureFlag = {
  key: string;
  description: string;
  defaultValue: FeatureFlagValue;
  enabled: boolean;
  rolloutPercentage: number;
  metadata: Record<string, JSONValue>;
};

export type FeatureFlagOverride = {
  flagKey: string;
  scope: Exclude<FeatureFlagScope, "system">;
  scopeId: string;
  value: FeatureFlagValue;
};

export type FeatureFlagContext = {
  organizationId: string;
  userId?: string;
};

export type FeatureFlagEvaluation = {
  key: string;
  value: FeatureFlagValue;
  source: FeatureFlagScope | "default";
};

function rolloutBucket(flagKey: string, organizationId: string) {
  const digest = createHash("sha256")
    .update(`${flagKey}:${organizationId}`)
    .digest();
  return digest.readUInt32BE(0) % 100;
}

export function evaluateFeatureFlag(input: {
  flag: FeatureFlag;
  context: FeatureFlagContext;
  overrides?: FeatureFlagOverride[];
}): FeatureFlagEvaluation {
  const userOverride = input.overrides?.find(
    (override) =>
      override.flagKey === input.flag.key &&
      override.scope === "user" &&
      override.scopeId === input.context.userId,
  );
  if (userOverride) {
    return { key: input.flag.key, value: userOverride.value, source: "user" };
  }
  const organizationOverride = input.overrides?.find(
    (override) =>
      override.flagKey === input.flag.key &&
      override.scope === "organization" &&
      override.scopeId === input.context.organizationId,
  );
  if (organizationOverride) {
    return {
      key: input.flag.key,
      value: organizationOverride.value,
      source: "organization",
    };
  }
  if (!input.flag.enabled) {
    return {
      key: input.flag.key,
      value: input.flag.defaultValue,
      source: "default",
    };
  }
  if (
    typeof input.flag.defaultValue === "boolean" &&
    input.flag.rolloutPercentage < 100
  ) {
    return {
      key: input.flag.key,
      value:
        input.flag.defaultValue &&
        rolloutBucket(input.flag.key, input.context.organizationId) <
          input.flag.rolloutPercentage,
      source: "system",
    };
  }
  return {
    key: input.flag.key,
    value: input.flag.defaultValue,
    source: "system",
  };
}

export class PostgresFeatureFlagService {
  constructor(private readonly sql: postgres.Sql) {}

  async evaluate(
    key: string,
    context: FeatureFlagContext,
  ): Promise<FeatureFlagEvaluation | null> {
    const flags = await this.sql<Array<{
      key: string;
      description: string;
      default_value: FeatureFlagValue;
      enabled: boolean;
      rollout_percentage: number;
      metadata: Record<string, JSONValue>;
    }>>`
      select *
      from platform_feature_flags
      where key = ${key}
      limit 1
    `;
    const row = flags[0];
    if (!row) return null;
    const overrides = await this.sql<Array<{
      flag_key: string;
      scope: FeatureFlagOverride["scope"];
      scope_id: string;
      value: FeatureFlagValue;
    }>>`
      select flag_key, scope, scope_id, value
      from platform_feature_flag_overrides
      where flag_key = ${key}
        and (
          (scope = 'organization' and scope_id = ${context.organizationId})
          or (
            scope = 'user'
            and ${context.userId ?? null}::text is not null
            and scope_id = ${context.userId ?? null}
          )
        )
    `;
    return evaluateFeatureFlag({
      flag: {
        key: row.key,
        description: row.description,
        defaultValue: row.default_value,
        enabled: row.enabled,
        rolloutPercentage: row.rollout_percentage,
        metadata: row.metadata,
      },
      context,
      overrides: overrides.map((override) => ({
        flagKey: override.flag_key,
        scope: override.scope,
        scopeId: override.scope_id,
        value: override.value,
      })),
    });
  }
}
