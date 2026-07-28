export const organizationRoles = [
  "owner",
  "admin",
  "manager",
  "analyst",
  "viewer",
] as const;

export type OrganizationRole = (typeof organizationRoles)[number];

export const platformPermissions = [
  "organization.read",
  "organization.update",
  "members.read",
  "members.invite",
  "members.manage",
  "audit.read",
  "notifications.read",
  "notifications.manage",
  "billing.read",
  "billing.manage",
  "integrations.read",
  "integrations.manage",
  "atlas.read",
  "atlas.assess",
  "mercury.read",
  "mercury.write",
  "mercury.approve",
] as const;

export type PlatformPermission = (typeof platformPermissions)[number];

const permissionsByRole: Record<
  OrganizationRole,
  ReadonlySet<PlatformPermission>
> = {
  owner: new Set(platformPermissions),
  admin: new Set([
    "organization.read",
    "organization.update",
    "members.read",
    "members.invite",
    "members.manage",
    "audit.read",
    "notifications.read",
    "notifications.manage",
    "billing.read",
    "integrations.read",
    "integrations.manage",
    "atlas.read",
    "atlas.assess",
    "mercury.read",
    "mercury.write",
    "mercury.approve",
  ]),
  manager: new Set([
    "organization.read",
    "members.read",
    "notifications.read",
    "integrations.read",
    "atlas.read",
    "atlas.assess",
    "mercury.read",
    "mercury.write",
    "mercury.approve",
  ]),
  analyst: new Set([
    "organization.read",
    "members.read",
    "notifications.read",
    "integrations.read",
    "atlas.read",
    "atlas.assess",
    "mercury.read",
    "mercury.write",
  ]),
  viewer: new Set([
    "organization.read",
    "members.read",
    "notifications.read",
    "integrations.read",
    "atlas.read",
    "mercury.read",
  ]),
};

export class PlatformAuthorizationError extends Error {
  constructor(
    readonly permission: PlatformPermission,
    message = `Permission ${permission} is required.`,
  ) {
    super(message);
    this.name = "PlatformAuthorizationError";
  }
}

export class OrganizationScopeError extends Error {
  constructor() {
    super("The requested resource does not belong to the active organization.");
    this.name = "OrganizationScopeError";
  }
}

export type OrganizationPrincipal = {
  subjectId: string;
  email: string;
  organizationId: string;
  role: OrganizationRole;
};

export function isOrganizationRole(value: unknown): value is OrganizationRole {
  return (
    typeof value === "string" &&
    organizationRoles.includes(value as OrganizationRole)
  );
}

export function hasPermission(
  principal: Pick<OrganizationPrincipal, "role">,
  permission: PlatformPermission,
) {
  return permissionsByRole[principal.role].has(permission);
}

export function requirePermission(
  principal: Pick<OrganizationPrincipal, "role">,
  permission: PlatformPermission,
) {
  if (!hasPermission(principal, permission)) {
    throw new PlatformAuthorizationError(permission);
  }
}

export function requireOrganizationScope(
  principal: Pick<OrganizationPrincipal, "organizationId">,
  organizationId: string,
) {
  if (principal.organizationId !== organizationId) {
    throw new OrganizationScopeError();
  }
}

export function canManageRole(
  actorRole: OrganizationRole,
  targetRole: OrganizationRole,
) {
  if (actorRole === "owner") return true;
  return actorRole === "admin" && targetRole !== "owner";
}
