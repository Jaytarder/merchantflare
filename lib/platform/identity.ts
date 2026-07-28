import type { OrganizationPrincipal } from "./authorization";
import type postgres from "postgres";

export type AuthenticationMethod = "legacy-cookie" | "cognito";

export type AuthenticatedPrincipal = OrganizationPrincipal & {
  authenticationMethod: AuthenticationMethod;
  sessionExpiresAt: number;
};

export type VerifiedIdentity = {
  provider: "cognito";
  subjectId: string;
  email: string;
  emailVerified: boolean;
};

export type OrganizationMembership = {
  organizationId: string;
  role: OrganizationPrincipal["role"];
  status: "active" | "suspended";
};

export interface IdentitySessionVerifier<TSessionToken = string> {
  readonly method: AuthenticationMethod;
  verify(token: TSessionToken): Promise<VerifiedIdentity | null>;
}

export interface MembershipResolver {
  resolve(
    identity: VerifiedIdentity,
    organizationId?: string,
  ): Promise<OrganizationMembership | null>;
}

export class PostgresMembershipResolver implements MembershipResolver {
  constructor(private readonly sql: postgres.Sql) {}

  async resolve(
    identity: VerifiedIdentity,
    organizationId?: string,
  ): Promise<OrganizationMembership | null> {
    const rows = await this.sql<Array<{
      organization_id: string;
      role: OrganizationPrincipal["role"];
      status: OrganizationMembership["status"];
    }>>`
      select
        membership.organization_id,
        membership.role,
        membership.status
      from platform_users user_account
      join platform_organization_memberships membership
        on membership.user_id = user_account.id
      join platform_organizations organization
        on organization.id = membership.organization_id
      where user_account.identity_provider = ${identity.provider}
        and user_account.identity_subject = ${identity.subjectId}
        and (
          ${organizationId ?? null}::text is null
          or membership.organization_id = ${organizationId ?? null}
        )
        and organization.status = 'active'
      order by membership.joined_at asc
      limit 1
    `;
    const row = rows[0];
    return row
      ? {
          organizationId: row.organization_id,
          role: row.role,
          status: row.status,
        }
      : null;
  }
}

export function principalFromVerifiedIdentity(input: {
  identity: VerifiedIdentity;
  membership: OrganizationMembership;
  sessionExpiresAt: number;
}): AuthenticatedPrincipal | null {
  if (
    !input.identity.emailVerified ||
    input.membership.status !== "active" ||
    input.sessionExpiresAt <= Date.now()
  ) {
    return null;
  }

  return {
    subjectId: input.identity.subjectId,
    email: input.identity.email.trim().toLowerCase(),
    organizationId: input.membership.organizationId,
    role: input.membership.role,
    authenticationMethod: "cognito",
    sessionExpiresAt: input.sessionExpiresAt,
  };
}
