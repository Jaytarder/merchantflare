import type postgres from "postgres";
import {
  PostgresMembershipResolver,
  principalFromVerifiedIdentity,
  type AuthenticatedPrincipal,
  type MembershipResolver,
  type VerifiedIdentity,
} from "../platform/identity";

export type PrincipalResolution =
  | { ok: true; principal: AuthenticatedPrincipal }
  | { ok: false; reason: "email_unverified" | "membership_required" };

export async function resolvePrincipalWithMembership(
  resolver: MembershipResolver,
  identity: VerifiedIdentity,
  sessionExpiresAt: number,
  organizationId?: string,
): Promise<PrincipalResolution> {
  if (!identity.emailVerified) return { ok: false, reason: "email_unverified" };
  const membership = await resolver.resolve(identity, organizationId);
  if (!membership) return { ok: false, reason: "membership_required" };
  const principal = principalFromVerifiedIdentity({
    identity,
    membership,
    sessionExpiresAt,
  });
  return principal
    ? { ok: true, principal }
    : { ok: false, reason: "membership_required" };
}

export function resolveCognitoPrincipal(
  sql: postgres.Sql,
  identity: VerifiedIdentity,
  sessionExpiresAt: number,
  organizationId?: string,
) {
  return resolvePrincipalWithMembership(
    new PostgresMembershipResolver(sql),
    identity,
    sessionExpiresAt,
    organizationId,
  );
}
