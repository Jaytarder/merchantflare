import { createHash, randomBytes, randomUUID } from "node:crypto";
import type postgres from "postgres";
import type { JSONValue } from "postgres";
import {
  canManageRole,
  requireOrganizationScope,
  requirePermission,
  type OrganizationPrincipal,
  type OrganizationRole,
} from "./authorization";
import { appendAuditEvent, userAuditActor } from "./audit";
import type { VerifiedIdentity } from "./identity";
import {
  PlatformConflictError,
  PlatformNotFoundError,
  PlatformValidationError,
} from "./errors";

export type Organization = {
  id: string;
  slug: string;
  name: string;
  status: "active" | "suspended";
  createdAt: string;
  updatedAt: string;
};

export type OrganizationSettings = {
  organizationId: string;
  timezone: string;
  currency: string;
  locale: string;
  preferences: Record<string, JSONValue>;
  updatedAt: string;
};

export type OrganizationMembershipRecord = {
  id: string;
  organizationId: string;
  userId: string;
  email: string;
  displayName: string;
  role: OrganizationRole;
  status: "active" | "suspended";
  joinedAt: string;
};

export type OrganizationInvitation = {
  id: string;
  organizationId: string;
  email: string;
  role: OrganizationRole;
  status: "pending" | "accepted" | "revoked" | "expired";
  invitedBy: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
};

export type IssuedInvitation = {
  invitation: OrganizationInvitation;
  token: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const slugPattern = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;

function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!emailPattern.test(email) || email.length > 320) {
    throw new PlatformValidationError("A valid email address is required.");
  }
  return email;
}

function validateOrganizationName(value: string) {
  const name = value.trim();
  if (name.length < 2 || name.length > 120) {
    throw new PlatformValidationError(
      "Organization names must contain between 2 and 120 characters.",
    );
  }
  return name;
}

function validateSlug(value: string) {
  const slug = value.trim().toLowerCase();
  if (slug.length < 3 || slug.length > 63 || !slugPattern.test(slug)) {
    throw new PlatformValidationError(
      "Organization slugs must use 3 to 63 lowercase letters, numbers, or hyphens.",
    );
  }
  return slug;
}

function validateTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return value;
  } catch {
    throw new PlatformValidationError("A valid IANA timezone is required.");
  }
}

function validateCurrency(value: string) {
  const currency = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new PlatformValidationError(
      "Currency must be a three-letter ISO 4217 code.",
    );
  }
  return currency;
}

function validateLocale(value: string) {
  const locale = value.trim();
  try {
    return Intl.getCanonicalLocales(locale)[0];
  } catch {
    throw new PlatformValidationError("A valid locale is required.");
  }
}

function invitationTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

type OrganizationRow = {
  id: string;
  slug: string;
  name: string;
  status: Organization["status"];
  created_at: Date;
  updated_at: Date;
};

type MembershipRow = {
  id: string;
  organization_id: string;
  user_id: string;
  email: string;
  display_name: string;
  role: OrganizationRole;
  status: OrganizationMembershipRecord["status"];
  joined_at: Date;
};

type InvitationRow = {
  id: string;
  organization_id: string;
  email: string;
  role: OrganizationRole;
  status: OrganizationInvitation["status"];
  invited_by: string;
  expires_at: Date;
  accepted_at: Date | null;
  created_at: Date;
};

function mapOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapMembership(row: MembershipRow): OrganizationMembershipRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at.toISOString(),
  };
}

function mapInvitation(row: InvitationRow): OrganizationInvitation {
  return {
    id: row.id,
    organizationId: row.organization_id,
    email: row.email,
    role: row.role,
    status: row.status,
    invitedBy: row.invited_by,
    expiresAt: row.expires_at.toISOString(),
    acceptedAt: row.accepted_at?.toISOString(),
    createdAt: row.created_at.toISOString(),
  };
}

export class PostgresOrganizationService {
  constructor(
    private readonly sql: postgres.Sql,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async createOrganization(input: {
    identity: VerifiedIdentity;
    name: string;
    slug: string;
    displayName: string;
  }): Promise<Organization> {
    if (!input.identity.emailVerified) {
      throw new PlatformValidationError(
        "A verified email is required to create an organization.",
      );
    }
    const name = validateOrganizationName(input.name);
    const slug = validateSlug(input.slug);
    const email = normalizeEmail(input.identity.email);
    const displayName = input.displayName.trim() || email;
    const organizationId = `org_${randomUUID()}`;
    const userId = input.identity.subjectId;
    const membershipId = randomUUID();

    return this.sql.begin(async (tx) => {
      const rows = await tx<Array<OrganizationRow>>`
        insert into platform_organizations (
          id, slug, name, status, created_by
        ) values (
          ${organizationId}, ${slug}, ${name}, 'active', ${userId}
        )
        returning *
      `;
      await tx`
        insert into platform_users (
          id, email, display_name, identity_provider, identity_subject
        ) values (
          ${userId}, ${email}, ${displayName}, ${input.identity.provider},
          ${input.identity.subjectId}
        )
        on conflict (id) do update set
          email = excluded.email,
          display_name = excluded.display_name,
          updated_at = now()
      `;
      await tx`
        insert into platform_organization_memberships (
          id, organization_id, user_id, role, status
        ) values (
          ${membershipId}, ${organizationId}, ${userId}, 'owner', 'active'
        )
      `;
      await tx`
        insert into platform_organization_settings (organization_id)
        values (${organizationId})
      `;
      await appendAuditEvent(tx, {
        organizationId,
        actorType: "user",
        actorId: userId,
        actorEmail: email,
        action: "organization.created",
        resourceType: "organization",
        resourceId: organizationId,
        metadata: { slug, name },
      });
      if (!rows[0]) {
        throw new Error("Organization creation did not return a record.");
      }
      return mapOrganization(rows[0]);
    });
  }

  async listOrganizationsForSubject(subjectId: string) {
    const rows = await this.sql<Array<OrganizationRow & {
      role: OrganizationRole;
    }>>`
      select organization.*, membership.role
      from platform_organizations organization
      join platform_organization_memberships membership
        on membership.organization_id = organization.id
      where membership.user_id = ${subjectId}
        and membership.status = 'active'
        and organization.status = 'active'
      order by organization.name asc
    `;
    return rows.map((row) => ({
      organization: mapOrganization(row),
      role: row.role,
    }));
  }

  async getOrganization(principal: OrganizationPrincipal) {
    requirePermission(principal, "organization.read");
    const rows = await this.sql<Array<OrganizationRow>>`
      select *
      from platform_organizations
      where id = ${principal.organizationId}
      limit 1
    `;
    return rows[0] ? mapOrganization(rows[0]) : null;
  }

  async getSettings(
    principal: OrganizationPrincipal,
  ): Promise<OrganizationSettings | null> {
    requirePermission(principal, "organization.read");
    const rows = await this.sql<Array<{
      organization_id: string;
      timezone: string;
      currency: string;
      locale: string;
      preferences: Record<string, JSONValue>;
      updated_at: Date;
    }>>`
      select *
      from platform_organization_settings
      where organization_id = ${principal.organizationId}
      limit 1
    `;
    const row = rows[0];
    return row
      ? {
          organizationId: row.organization_id,
          timezone: row.timezone,
          currency: row.currency,
          locale: row.locale,
          preferences: row.preferences,
          updatedAt: row.updated_at.toISOString(),
        }
      : null;
  }

  async updateSettings(
    principal: OrganizationPrincipal,
    input: {
      name?: string;
      timezone?: string;
      currency?: string;
      locale?: string;
      preferences?: Record<string, JSONValue>;
    },
  ) {
    requirePermission(principal, "organization.update");
    const name =
      input.name === undefined
        ? undefined
        : validateOrganizationName(input.name);
    const timezone =
      input.timezone === undefined
        ? undefined
        : validateTimezone(input.timezone);
    const currency =
      input.currency === undefined
        ? undefined
        : validateCurrency(input.currency);
    const locale =
      input.locale === undefined ? undefined : validateLocale(input.locale);

    return this.sql.begin(async (tx) => {
      if (name !== undefined) {
        await tx`
          update platform_organizations
          set name = ${name}, updated_at = now()
          where id = ${principal.organizationId}
        `;
      }
      const rows = await tx<Array<{
        organization_id: string;
        timezone: string;
        currency: string;
        locale: string;
        preferences: Record<string, JSONValue>;
        updated_at: Date;
      }>>`
        insert into platform_organization_settings (
          organization_id, timezone, currency, locale, preferences
        ) values (
          ${principal.organizationId},
          ${timezone ?? "UTC"},
          ${currency ?? "USD"},
          ${locale ?? "en-US"},
          ${tx.json(input.preferences ?? {})}
        )
        on conflict (organization_id) do update set
          timezone = coalesce(${timezone ?? null}, platform_organization_settings.timezone),
          currency = coalesce(${currency ?? null}, platform_organization_settings.currency),
          locale = coalesce(${locale ?? null}, platform_organization_settings.locale),
          preferences = case
            when ${input.preferences !== undefined}
              then ${tx.json(input.preferences ?? {})}
            else platform_organization_settings.preferences
          end,
          updated_at = now()
        returning *
      `;
      await appendAuditEvent(tx, {
        organizationId: principal.organizationId,
        ...userAuditActor(principal),
        action: "organization.settings_updated",
        resourceType: "organization",
        resourceId: principal.organizationId,
        metadata: {
          fields: [
            ...(name !== undefined ? ["name"] : []),
            ...(timezone !== undefined ? ["timezone"] : []),
            ...(currency !== undefined ? ["currency"] : []),
            ...(locale !== undefined ? ["locale"] : []),
            ...(input.preferences !== undefined ? ["preferences"] : []),
          ],
        },
      });
      const row = rows[0];
      if (!row) throw new PlatformNotFoundError("Organization settings");
      return {
        organizationId: row.organization_id,
        timezone: row.timezone,
        currency: row.currency,
        locale: row.locale,
        preferences: row.preferences,
        updatedAt: row.updated_at.toISOString(),
      };
    });
  }

  async listMembers(principal: OrganizationPrincipal) {
    requirePermission(principal, "members.read");
    const rows = await this.sql<Array<MembershipRow>>`
      select
        membership.id,
        membership.organization_id,
        membership.user_id,
        user_account.email,
        user_account.display_name,
        membership.role,
        membership.status,
        membership.joined_at
      from platform_organization_memberships membership
      join platform_users user_account on user_account.id = membership.user_id
      where membership.organization_id = ${principal.organizationId}
      order by user_account.display_name asc, user_account.email asc
    `;
    return rows.map(mapMembership);
  }

  async listInvitations(principal: OrganizationPrincipal) {
    requirePermission(principal, "members.read");
    const rows = await this.sql<Array<InvitationRow>>`
      select *
      from platform_organization_invitations
      where organization_id = ${principal.organizationId}
      order by created_at desc
    `;
    return rows.map(mapInvitation);
  }

  async inviteMember(
    principal: OrganizationPrincipal,
    input: { email: string; role: Exclude<OrganizationRole, "owner">; ttlHours?: number },
  ): Promise<IssuedInvitation> {
    requirePermission(principal, "members.invite");
    const email = normalizeEmail(input.email);
    const ttlHours = Math.min(Math.max(input.ttlHours ?? 72, 1), 168);
    const token = randomBytes(32).toString("base64url");
    const tokenHash = invitationTokenHash(token);
    const expiresAt = new Date(
      this.now().getTime() + ttlHours * 60 * 60 * 1000,
    ).toISOString();
    const invitationId = randomUUID();

    const invitation = await this.sql.begin(async (tx) => {
      const existingMembers = await tx<Array<{ id: string }>>`
        select membership.id
        from platform_organization_memberships membership
        join platform_users user_account on user_account.id = membership.user_id
        where membership.organization_id = ${principal.organizationId}
          and lower(user_account.email) = ${email}
          and membership.status = 'active'
        limit 1
      `;
      if (existingMembers[0]) {
        throw new PlatformConflictError(
          "This person is already an active organization member.",
        );
      }
      const rows = await tx<Array<InvitationRow>>`
        insert into platform_organization_invitations (
          id,
          organization_id,
          email,
          role,
          token_hash,
          status,
          invited_by,
          expires_at
        ) values (
          ${invitationId},
          ${principal.organizationId},
          ${email},
          ${input.role},
          ${tokenHash},
          'pending',
          ${principal.subjectId},
          ${expiresAt}
        )
        on conflict (organization_id, (lower(email))) where status = 'pending'
        do update set
          role = excluded.role,
          token_hash = excluded.token_hash,
          invited_by = excluded.invited_by,
          expires_at = excluded.expires_at,
          created_at = now()
        returning *
      `;
      await appendAuditEvent(tx, {
        organizationId: principal.organizationId,
        ...userAuditActor(principal),
        action: "member.invited",
        resourceType: "organization_invitation",
        resourceId: rows[0]?.id ?? invitationId,
        metadata: { email, role: input.role, expiresAt },
      });
      if (!rows[0]) {
        throw new Error("Invitation creation did not return a record.");
      }
      return mapInvitation(rows[0]);
    });

    return { invitation, token };
  }

  async acceptInvitation(input: {
    token: string;
    identity: VerifiedIdentity;
    displayName: string;
  }): Promise<OrganizationMembershipRecord> {
    if (!input.identity.emailVerified) {
      throw new PlatformValidationError(
        "A verified email is required to accept an invitation.",
      );
    }
    const email = normalizeEmail(input.identity.email);
    const tokenHash = invitationTokenHash(input.token);
    const now = this.now().toISOString();
    const membershipId = randomUUID();

    const expired = await this.sql<Array<{ id: string }>>`
      update platform_organization_invitations
      set status = 'expired'
      where token_hash = ${tokenHash}
        and status = 'pending'
        and expires_at <= ${now}
      returning id
    `;
    if (expired[0]) {
      throw new PlatformConflictError("This invitation has expired.");
    }

    return this.sql.begin(async (tx) => {
      const invitations = await tx<Array<InvitationRow & {
        token_hash: string;
      }>>`
        select *
        from platform_organization_invitations
        where token_hash = ${tokenHash}
          and expires_at > ${now}
        limit 1
        for update
      `;
      const invitation = invitations[0];
      if (
        !invitation ||
        invitation.status !== "pending" ||
        invitation.email !== email
      ) {
        throw new PlatformNotFoundError("Active invitation");
      }
      await tx`
        insert into platform_users (
          id, email, display_name, identity_provider, identity_subject
        ) values (
          ${input.identity.subjectId},
          ${email},
          ${input.displayName.trim() || email},
          ${input.identity.provider},
          ${input.identity.subjectId}
        )
        on conflict (id) do update set
          email = excluded.email,
          display_name = excluded.display_name,
          updated_at = now()
      `;
      const rows = await tx<Array<MembershipRow>>`
        insert into platform_organization_memberships (
          id, organization_id, user_id, role, status, joined_at
        ) values (
          ${membershipId},
          ${invitation.organization_id},
          ${input.identity.subjectId},
          ${invitation.role},
          'active',
          ${now}
        )
        on conflict (organization_id, user_id) do update set
          role = excluded.role,
          status = 'active',
          updated_at = now()
        returning
          id,
          organization_id,
          user_id,
          ${email}::text as email,
          ${input.displayName.trim() || email}::text as display_name,
          role,
          status,
          joined_at
      `;
      await tx`
        update platform_organization_invitations
        set status = 'accepted', accepted_at = ${now}
        where id = ${invitation.id}
          and status = 'pending'
      `;
      await appendAuditEvent(tx, {
        organizationId: invitation.organization_id,
        actorType: "user",
        actorId: input.identity.subjectId,
        actorEmail: email,
        action: "member.invitation_accepted",
        resourceType: "organization_membership",
        resourceId: rows[0]?.id ?? membershipId,
        metadata: {
          invitationId: invitation.id,
          role: invitation.role,
        },
      });
      if (!rows[0]) {
        throw new Error("Membership creation did not return a record.");
      }
      return mapMembership(rows[0]);
    });
  }

  async changeMemberRole(
    principal: OrganizationPrincipal,
    input: { membershipId: string; role: OrganizationRole },
  ) {
    requirePermission(principal, "members.manage");

    return this.sql.begin(async (tx) => {
      const rows = await tx<Array<MembershipRow>>`
        select
          membership.id,
          membership.organization_id,
          membership.user_id,
          user_account.email,
          user_account.display_name,
          membership.role,
          membership.status,
          membership.joined_at
        from platform_organization_memberships membership
        join platform_users user_account on user_account.id = membership.user_id
        where membership.id = ${input.membershipId}
          and membership.organization_id = ${principal.organizationId}
        limit 1
        for update of membership
      `;
      const target = rows[0];
      if (!target) throw new PlatformNotFoundError("Organization member");
      requireOrganizationScope(principal, target.organization_id);
      if (!canManageRole(principal.role, target.role)) {
        throw new PlatformConflictError(
          "This role cannot manage an organization owner.",
        );
      }
      if (target.role === "owner" && input.role !== "owner") {
        const ownerCount = await tx<Array<{ count: string }>>`
          select count(*)::text as count
          from platform_organization_memberships
          where organization_id = ${principal.organizationId}
            and role = 'owner'
            and status = 'active'
        `;
        if (Number(ownerCount[0]?.count ?? 0) <= 1) {
          throw new PlatformConflictError(
            "An organization must retain at least one active owner.",
          );
        }
      }
      if (input.role === "owner" && principal.role !== "owner") {
        throw new PlatformConflictError(
          "Only an owner can assign the owner role.",
        );
      }
      const updated = await tx<Array<MembershipRow>>`
        update platform_organization_memberships membership
        set role = ${input.role}, updated_at = now()
        from platform_users user_account
        where membership.id = ${input.membershipId}
          and membership.organization_id = ${principal.organizationId}
          and user_account.id = membership.user_id
        returning
          membership.id,
          membership.organization_id,
          membership.user_id,
          user_account.email,
          user_account.display_name,
          membership.role,
          membership.status,
          membership.joined_at
      `;
      await appendAuditEvent(tx, {
        organizationId: principal.organizationId,
        ...userAuditActor(principal),
        action: "member.role_changed",
        resourceType: "organization_membership",
        resourceId: input.membershipId,
        metadata: { previousRole: target.role, role: input.role },
      });
      if (!updated[0]) throw new PlatformNotFoundError("Organization member");
      return mapMembership(updated[0]);
    });
  }

  async removeMember(
    principal: OrganizationPrincipal,
    membershipId: string,
  ) {
    requirePermission(principal, "members.manage");
    return this.sql.begin(async (tx) => {
      const rows = await tx<Array<{
        id: string;
        user_id: string;
        role: OrganizationRole;
      }>>`
        select id, user_id, role
        from platform_organization_memberships
        where id = ${membershipId}
          and organization_id = ${principal.organizationId}
        limit 1
        for update
      `;
      const target = rows[0];
      if (!target) throw new PlatformNotFoundError("Organization member");
      if (!canManageRole(principal.role, target.role)) {
        throw new PlatformConflictError(
          "This role cannot remove an organization owner.",
        );
      }
      if (target.role === "owner") {
        const ownerCount = await tx<Array<{ count: string }>>`
          select count(*)::text as count
          from platform_organization_memberships
          where organization_id = ${principal.organizationId}
            and role = 'owner'
            and status = 'active'
        `;
        if (Number(ownerCount[0]?.count ?? 0) <= 1) {
          throw new PlatformConflictError(
            "An organization must retain at least one active owner.",
          );
        }
      }
      await tx`
        update platform_organization_memberships
        set status = 'suspended', updated_at = now()
        where id = ${membershipId}
          and organization_id = ${principal.organizationId}
      `;
      await appendAuditEvent(tx, {
        organizationId: principal.organizationId,
        ...userAuditActor(principal),
        action: "member.removed",
        resourceType: "organization_membership",
        resourceId: membershipId,
        metadata: { userId: target.user_id, previousRole: target.role },
      });
    });
  }
}
