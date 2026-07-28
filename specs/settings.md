# Settings Specification

**Status:** Scaffolded
**Canonical route:** `/settings`

## Purpose

Settings manages organization identity, users, roles, policies, preferences, security, and controlled configuration shared across Mercury and intelligence modules.

## Current implementation evidence

Settings navigation and a user-menu link exist. Migration `006_platform_core.sql` adds durable organizations, users, memberships, invitations, and organization settings. `lib/platform/organizations.ts` and `/api/platform/organization`, `/members`, and `/invitations` provide permission-enforced, organization-scoped services and APIs. Owner, Admin, Manager, Analyst, and Viewer permissions are centralized; owner protections prevent removing or demoting the last active owner. Invitations expire, are single-use, match a verified email, and store only a SHA-256 token hash.

The Cognito authorization-code/PKCE flow, token verification, refresh, protected-route handling, organization membership resolution, and first-Owner bootstrap are implemented but not yet verified against a real pool. No organization selector, invitation delivery/acceptance route, early centralized session revocation, `/settings` page, approval-policy editor, retention control, or notification-preference UI is implemented.

## In scope

- Organization profile and defaults.
- Users, invitations, membership, and roles.
- Authentication and session security.
- Approval policies and thresholds.
- Marketplace, currency, time-zone, and reporting preferences.
- Notification preferences.
- Data retention and security controls.
- Audit visibility for settings changes.

## Functional requirements

- Settings MUST be organization-scoped and role-authorized.
- User invitations MUST expire, be single-use, and bind to an organization and role.
- Role changes and removals MUST invalidate affected authorization promptly.
- Security-sensitive changes MUST require appropriate reauthentication.
- Approval policies MUST be versioned, validated, and auditable.
- Preference defaults and overrides MUST have deterministic precedence.
- Destructive changes MUST disclose impact and require explicit confirmation.
- Settings mutations MUST be idempotent where retries are possible.

## Identity migration

Before production multi-user release:

- development credential fallbacks MUST be prohibited in production;
- Cognito or the approved identity provider MUST become the source of authentication;
- organization membership and role authorization MUST be server-enforced;
- current session compatibility and migration MUST be documented; and
- all protected routes and APIs MUST share the resulting auth boundary.

## Experience requirements

- `/settings` MUST group organization, users, policies, preferences, notifications, security, and data controls.
- Users MUST see only settings they can view or change.
- Saved, pending, validation-error, conflict, and permission states MUST be explicit.
- Policy changes MUST preview affected action categories.

## Acceptance criteria

Settings are complete only when:

- `/settings` is authenticated and organization-scoped;
- organization, membership, role, and preference models are durable;
- server authorization protects reads and mutations;
- invitation, removal, role-change, and session-invalidation flows are tested;
- approval policy versions are auditable;
- production secrets have no fallback values; and
- settings changes appear in history.

## Open decisions

- Identity provider and Cognito migration timing.
- Organization selection behavior for multi-organization members.
- Ownership transfer and recovery when the final owner is unavailable.
- Policy editor scope for the first release.
- Retention and organization deletion behavior.

\n
