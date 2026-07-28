import { randomUUID } from "node:crypto";
import type postgres from "postgres";
import type { JSONValue } from "postgres";
import type { OrganizationPrincipal } from "./authorization";
import { PlatformValidationError } from "./errors";

export type AuditActorType = "user" | "service" | "system";

export type AuditEvent = {
  id: string;
  organizationId: string;
  actorType: AuditActorType;
  actorId: string;
  actorEmail?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  correlationId?: string;
  metadata: Record<string, JSONValue>;
  occurredAt: string;
};

export type AuditEventInput = Omit<AuditEvent, "id" | "occurredAt"> & {
  id?: string;
  occurredAt?: string;
};

export type PlatformSql = postgres.Sql | postgres.TransactionSql;

export function userAuditActor(
  principal: OrganizationPrincipal,
): Pick<AuditEventInput, "actorType" | "actorId" | "actorEmail"> {
  return {
    actorType: "user",
    actorId: principal.subjectId,
    actorEmail: principal.email,
  };
}

export async function appendAuditEvent(
  sql: PlatformSql,
  input: AuditEventInput,
): Promise<AuditEvent> {
  const event: AuditEvent = {
    ...input,
    id: input.id ?? randomUUID(),
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  };
  await sql`
    insert into platform_audit_events (
      id,
      organization_id,
      actor_type,
      actor_id,
      actor_email,
      action,
      resource_type,
      resource_id,
      correlation_id,
      metadata,
      occurred_at
    ) values (
      ${event.id},
      ${event.organizationId},
      ${event.actorType},
      ${event.actorId},
      ${event.actorEmail ?? null},
      ${event.action},
      ${event.resourceType},
      ${event.resourceId},
      ${event.correlationId ?? null},
      ${sql.json(event.metadata)},
      ${event.occurredAt}
    )
  `;
  return event;
}

type AuditRow = {
  id: string;
  organization_id: string;
  actor_type: AuditActorType;
  actor_id: string;
  actor_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  correlation_id: string | null;
  metadata: Record<string, JSONValue>;
  occurred_at: Date;
};

export class PostgresAuditEventRepository {
  constructor(private readonly sql: postgres.Sql) {}

  async list(input: {
    organizationId: string;
    limit?: number;
    before?: string;
  }): Promise<AuditEvent[]> {
    const limit = Math.min(Math.max(input.limit ?? 100, 1), 200);
    if (input.before && !Number.isFinite(Date.parse(input.before))) {
      throw new PlatformValidationError(
        "Audit history cursors must use an ISO 8601 timestamp.",
      );
    }
    const rows = await this.sql<Array<AuditRow>>`
      select *
      from platform_audit_events
      where organization_id = ${input.organizationId}
        and (
          ${input.before ?? null}::timestamptz is null
          or occurred_at < ${input.before ?? null}
        )
      order by occurred_at desc, id desc
      limit ${limit}
    `;
    return rows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      actorType: row.actor_type,
      actorId: row.actor_id,
      actorEmail: row.actor_email ?? undefined,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      correlationId: row.correlation_id ?? undefined,
      metadata: row.metadata,
      occurredAt: row.occurred_at.toISOString(),
    }));
  }
}
