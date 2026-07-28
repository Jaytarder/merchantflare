import { randomUUID } from "node:crypto";
import type postgres from "postgres";
import type { JSONValue } from "postgres";
import {
  requirePermission,
  type OrganizationPrincipal,
} from "./authorization";
import type { PlatformSql } from "./audit";
import { PlatformNotFoundError, PlatformValidationError } from "./errors";

export type NotificationCategory =
  | "approval"
  | "integration"
  | "evidence"
  | "billing"
  | "security"
  | "system";

export type NotificationSeverity = "info" | "success" | "warning" | "critical";

export type PlatformNotification = {
  id: string;
  organizationId: string;
  recipientUserId?: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  body: string;
  actionHref?: string;
  sourceType: string;
  sourceId: string;
  deduplicationKey?: string;
  metadata: Record<string, JSONValue>;
  readAt?: string;
  createdAt: string;
  expiresAt?: string;
};

export type NotificationInput = Omit<
  PlatformNotification,
  "id" | "readAt" | "createdAt"
> & {
  id?: string;
  createdAt?: string;
};

function validateNotification(input: NotificationInput) {
  if (!input.organizationId.trim() || !input.sourceId.trim()) {
    throw new PlatformValidationError(
      "Notifications require organization and source identifiers.",
    );
  }
  if (
    input.title.trim().length < 2 ||
    input.title.trim().length > 120 ||
    input.body.trim().length < 2 ||
    input.body.trim().length > 500
  ) {
    throw new PlatformValidationError(
      "Notification titles and bodies must use bounded, non-empty text.",
    );
  }
  if (input.actionHref && !input.actionHref.startsWith("/")) {
    throw new PlatformValidationError(
      "Notification actions must use application-relative paths.",
    );
  }
}

export async function createNotification(
  sql: PlatformSql,
  input: NotificationInput,
): Promise<string> {
  validateNotification(input);
  const id = input.id ?? randomUUID();
  const rows = await sql<Array<{ id: string }>>`
    insert into platform_notifications (
      id,
      organization_id,
      recipient_user_id,
      category,
      severity,
      title,
      body,
      action_href,
      source_type,
      source_id,
      deduplication_key,
      metadata,
      created_at,
      expires_at
    ) values (
      ${id},
      ${input.organizationId},
      ${input.recipientUserId ?? null},
      ${input.category},
      ${input.severity},
      ${input.title.trim()},
      ${input.body.trim()},
      ${input.actionHref ?? null},
      ${input.sourceType},
      ${input.sourceId},
      ${input.deduplicationKey ?? null},
      ${sql.json(input.metadata)},
      ${input.createdAt ?? new Date().toISOString()},
      ${input.expiresAt ?? null}
    )
    on conflict (
      organization_id,
      recipient_scope,
      deduplication_key
    ) where deduplication_key is not null
    do update set
      severity = excluded.severity,
      title = excluded.title,
      body = excluded.body,
      action_href = excluded.action_href,
      metadata = excluded.metadata,
      read_at = null,
      created_at = excluded.created_at,
      expires_at = excluded.expires_at
    returning id
  `;
  return rows[0]?.id ?? id;
}

type NotificationRow = {
  id: string;
  organization_id: string;
  recipient_user_id: string | null;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  body: string;
  action_href: string | null;
  source_type: string;
  source_id: string;
  deduplication_key: string | null;
  metadata: Record<string, JSONValue>;
  read_at: Date | null;
  created_at: Date;
  expires_at: Date | null;
};

function mapNotification(row: NotificationRow): PlatformNotification {
  return {
    id: row.id,
    organizationId: row.organization_id,
    recipientUserId: row.recipient_user_id ?? undefined,
    category: row.category,
    severity: row.severity,
    title: row.title,
    body: row.body,
    actionHref: row.action_href ?? undefined,
    sourceType: row.source_type,
    sourceId: row.source_id,
    deduplicationKey: row.deduplication_key ?? undefined,
    metadata: row.metadata,
    readAt: row.read_at?.toISOString(),
    createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at?.toISOString(),
  };
}

export class PostgresNotificationService {
  constructor(private readonly sql: postgres.Sql) {}

  async list(
    principal: OrganizationPrincipal,
    input: { limit?: number; unreadOnly?: boolean } = {},
  ) {
    requirePermission(principal, "notifications.read");
    const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
    const rows = await this.sql<Array<NotificationRow>>`
      select
        notification.id,
        notification.organization_id,
        notification.recipient_user_id,
        notification.category,
        notification.severity,
        notification.title,
        notification.body,
        notification.action_href,
        notification.source_type,
        notification.source_id,
        notification.deduplication_key,
        notification.metadata,
        case
          when notification.recipient_user_id is null then receipt.read_at
          else notification.read_at
        end as read_at,
        notification.created_at,
        notification.expires_at
      from platform_notifications notification
      left join platform_notification_receipts receipt
        on receipt.notification_id = notification.id
        and receipt.user_id = ${principal.subjectId}
      where notification.organization_id = ${principal.organizationId}
        and (
          notification.recipient_user_id is null
          or notification.recipient_user_id = ${principal.subjectId}
        )
        and (
          ${input.unreadOnly ?? false} = false
          or case
            when notification.recipient_user_id is null then receipt.read_at
            else notification.read_at
          end is null
        )
        and (
          notification.expires_at is null
          or notification.expires_at > now()
        )
      order by notification.created_at desc
      limit ${limit}
    `;
    return rows.map(mapNotification);
  }

  async markRead(principal: OrganizationPrincipal, notificationId: string) {
    requirePermission(principal, "notifications.read");
    return this.sql.begin(async (tx) => {
      const visible = await tx<Array<NotificationRow>>`
        select *
        from platform_notifications
        where id = ${notificationId}
          and organization_id = ${principal.organizationId}
          and (
            recipient_user_id is null
            or recipient_user_id = ${principal.subjectId}
          )
        limit 1
        for update
      `;
      const notification = visible[0];
      if (!notification) throw new PlatformNotFoundError("Notification");

      if (notification.recipient_user_id === null) {
        const receipts = await tx<Array<{ read_at: Date }>>`
          insert into platform_notification_receipts (
            notification_id, user_id, read_at
          ) values (
            ${notificationId}, ${principal.subjectId}, now()
          )
          on conflict (notification_id, user_id) do update set
            read_at = excluded.read_at
          returning read_at
        `;
        notification.read_at = receipts[0]?.read_at ?? new Date();
      } else {
        const rows = await tx<Array<NotificationRow>>`
          update platform_notifications
          set read_at = coalesce(read_at, now())
          where id = ${notificationId}
          returning *
        `;
        if (!rows[0]) throw new PlatformNotFoundError("Notification");
        return mapNotification(rows[0]);
      }

      return mapNotification(notification);
    });
  }
}
