# Settings Specification

**Status:** Planned
**Canonical route:** `/settings`

## Purpose

Settings manages organization identity, users, roles, policies, preferences, security, and controlled configuration shared across Mercury and intelligence modules.

## Current implementation evidence

Settings navigation and a user-menu link exist. Early organization and user role types exist in `lib/domain.ts`, but there is no route, persistence, multi-user identity, membership model, invitation flow, policy editor, or preference API. Authentication is a single administrator cookie with development fallback values.

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

Settings are implemented only when:

- `/settings` is authenticated and organization-scoped;
- organization, membership, role, and preference models are durable;
- server authorization protects reads and mutations;
- invitation, removal, role-change, and session-invalidation flows are tested;
- approval policy versions are auditable;
- production secrets have no fallback values; and
- settings changes appear in history.

## Open decisions

- Identity provider and Cognito migration timing.
- Role and permission matrix.
- Multi-organization membership.
- Policy editor scope for the first release.
- Retention and organization deletion behavior.

\n