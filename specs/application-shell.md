# Application Shell Specification

**Status:** Implemented
**Roadmap stage:** 1

## Purpose

Provide the consistent, responsive frame for authenticated MerchantFlare workflows while preserving the canonical navigation and enterprise brand.

## Implemented scope

The current shell implements:

- a persistent 272px desktop sidebar;
- an 84px collapsed or 272px expanded tablet sidebar;
- an off-canvas mobile drawer;
- config-driven navigation;
- route highlighting;
- a sticky topbar;
- navigation search with `Ctrl+K`;
- notification and user-menu surfaces;
- static platform-status presentation; and
- a responsive workspace boundary.

The shell is composed from `app/components/layout/` and styled by `app/components/app-shell.css`. It is used by `/dashboard` and directly by the legacy `/workers` page.

## Required behavior

### Navigation

- Navigation MUST follow the hierarchy in [`docs/vision.md`](../docs/vision.md).
- Active state MUST support exact and nested routes.
- Search MUST include only destinations the user can access.
- An unimplemented route MUST not be presented as a completed experience.
- New authenticated surfaces MUST reuse the shared shell.

### Responsive behavior

- Desktop at 1200px and above MUST keep the sidebar persistent.
- Tablet from 768px through 1199px MUST support explicit collapse and expansion.
- Mobile below 768px MUST use a dismissible drawer and backdrop.
- Opening the mobile drawer MUST prevent background scrolling.
- Route changes, Escape, backdrop activation, and a navigation choice MUST close the drawer.

### Accessibility

- The shell MUST provide a skip link and semantic landmarks.
- Icon-only buttons MUST have accessible names.
- Navigation MUST expose the current page.
- Drawer and popover interactions MUST remain keyboard accessible.
- Focus MUST remain visible.
- Reduced-motion preferences MUST be respected.

### Status and account surfaces

- Connection status MUST come from a data-backed integration health source before it is labeled live.
- Notifications MUST come from a durable notification or event source before counts are non-zero.
- Logout MUST invalidate the current session.
- Account links MUST route only to implemented and authorized destinations.

## Known gaps

- `AI Workers` is a non-canonical navigation entry.
- Most configured destinations are not implemented.
- Connection states are static.
- Notifications are a static empty state.
- Search placeholder text includes legacy worker language.
- `/workers` bypasses the dashboard authentication layout.
- The existing logo metadata contains legacy product language.

## Acceptance criteria

The Sprint 1 shell remains complete while these regression criteria pass:

- desktop, tablet, and mobile layouts match the required behavior;
- active routes remain correct for nested destinations;
- navigation and search are keyboard operable;
- mobile background scroll is blocked while the drawer is open;
- asynchronous or data-backed status is never fabricated;
- all authenticated routes reuse one shell boundary; and
- typecheck and production build pass.

Follow-up shell work is complete only when canonical navigation replaces the legacy entry, all protected routes share the auth boundary, and platform status is data-backed or explicitly unavailable.

## Open decisions

- Whether canonical authenticated routes should live under a route group or a common `/app` prefix.
- Whether tablet collapse state should persist per user.
- Notification retention and read-state model.

\n