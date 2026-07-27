# Design System

## Brand direction

MerchantFlare uses a black, white, and orange visual system with an enterprise aesthetic.

- **Black:** primary canvas and navigation surfaces
- **White:** primary typography and high-emphasis content
- **Orange:** brand accent, active states, focus, and decisive actions
- **Neutral gray:** secondary text, borders, disabled states, and supporting structure
- **Semantic colors:** restrained green, amber, and red for verified status meaning

The interface should feel precise, controlled, and operational. Avoid playful assistant visuals, novelty gradients, excessive glow, or decorative animation that weakens information hierarchy.

## Logo system

The production logo system is implemented by `components/brand/Logo.tsx` with source assets under `public/brand/`.

- `wordmark` uses the MERCHANTFLARE name with **MERCHANT** in the surface-appropriate high-contrast color and **FLARE** in orange.
- `monogram` uses the compact MF mark with an orange upward flare.
- `horizontal` combines the monogram and wordmark without duplicating SVG markup.
- `surface="dark"` and `surface="light"` select the matching flat SVG assets.
- The “Commerce Intelligence Platform” tagline is optional and should appear only where space and hierarchy support it.
- Favicons use the simplified monogram; the web app icon uses the same geometry at a larger square size.

Keep the artwork flat. Do not add gradients, glow, shadows, embedded brand-board imagery, or unrelated decorative effects to production logo assets. Preserve the supplied aspect ratio and use accessible alternative text unless a repeated mark is explicitly decorative.

## Current tokens

The active global theme in `app/globals.css` defines:

| Role | Current token |
| --- | --- |
| Background | `--bg: #07090d` |
| Elevated background | `--bg-elevated: #0d1118` |
| Panel | `--panel: #111722` |
| Primary text | `--text: #f7f8fa` |
| Muted text | `--muted: #9ba6b6` |
| Subtle text | `--subtle: #687386` |
| Border | `--line: rgba(255,255,255,.09)` |
| Strong border | `--line-strong: rgba(255,255,255,.16)` |
| Orange accent | `--accent: #ff6a00` |
| Bright orange | `--accent-2: #ff9b3d` |
| Positive | `--success: #35d49a` |
| Warning | `--warning: #f3c969` |
| Critical | `--danger: #ff6f75` |

`styles/design-system.css` contains a parallel `--mf-*` token set and reusable UI classes, but it is not imported by the current root layout. Consolidating these token systems is future design-system work; do not create a third token family.

## Typography

The current application uses:

```css
Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Guidelines:

- use strong, compact headings with clear hierarchy;
- use sentence case for interface labels;
- reserve uppercase and letter spacing for small section labels;
- keep operational text concise and concrete; and
- avoid anthropomorphic or promotional copy inside the application.

## Layout

The application shell lives in `app/components/layout/` and is styled by `app/components/app-shell.css`.

Current behavior:

- desktop: persistent 272px sidebar;
- tablet: collapsible 84px rail or 272px expanded sidebar;
- mobile: off-canvas drawer;
- topbar: sticky;
- workspace: centered content boundary with responsive padding.

New platform routes should use the shared shell rather than recreate navigation or topbar elements.

## Components

Prefer, in order:

1. an existing component in `app/components/layout/`;
2. an existing primitive in `components/ui/`;
3. an extension of an existing component; then
4. a new component with a reusable, typed interface.

Current reusable areas:

- shell components in `app/components/layout/`;
- general primitives in `components/ui/index.tsx`;
- form primitives in `components/ui/Forms.tsx`;
- the shared logo component in `components/brand/Logo.tsx`;
- marketing composition in `components/marketing/`; and
- production logo, favicon, and app-icon assets in `public/brand/`.

Some reusable components and `styles/design-system.css` are not wired into active pages. Confirm actual imports before assuming a component is in production or deleting it.

## Interaction states

Every interactive element must define:

- default;
- hover;
- keyboard focus;
- active or selected, when applicable;
- disabled, when applicable;
- loading, for asynchronous actions; and
- success or error feedback.

Controls must perform a real scoped action. Do not ship dead buttons or decorative inputs.

## Status communication

Use semantic colors only when status is known:

- green: connected, healthy, completed;
- amber: syncing, warning, needs attention;
- red: failed, critical, destructive; and
- gray: unavailable, disconnected, neutral.

Never present a static configuration value as live health. Label previews and sample data clearly.

## Accessibility

- Preserve visible focus treatment.
- Use semantic landmarks and heading order.
- Give icon-only controls accessible names.
- Maintain keyboard access for drawers, menus, search, and dialogs.
- Meet WCAG AA contrast for normal text.
- Respect reduced-motion preferences.
- Prevent background scrolling while the mobile drawer is open.
- Verify layouts at desktop, tablet, and mobile breakpoints.

## Product language in UI

Use the canonical terms from `docs/vision.md`.

In particular:

- label the primary destination **Mercury**;
- group Atlas through Pulse under **Intelligence**;
- call them intelligence modules or use their full intelligence names; and
- do not add new “worker,” “assistant,” or “AI workforce” labels.

Legacy copy remains in `/workers`, the dashboard, shell navigation and search, and source types. Migrate it deliberately without obscuring whether the underlying feature exists.
