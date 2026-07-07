---
name: design
description: Apply when building, changing, or reviewing any UI. Always use Cloudflare Kumo UI (https://kumo-ui.com/) components AS-IS (pure, no per-component style overrides) — never hand-roll Modal/Menu/Popover behavior or invent a bespoke look. Covers Kumo consumption, data-mode dark theming, forms, Toasty notifications, icons, and the mandatory list-actions dropdown + DeleteResource delete pattern.
model: opus
---

# Skill: `design`

The interface standard for this project's UI. **Always use Kumo UI** (<https://kumo-ui.com/>) — every screen, form, and interaction is composed from Kumo components.

## North star

- **Use Kumo components as-is.** **Do not** add per-component style overrides, custom CSS skins, or a bespoke aesthetic. If a Kumo component looks "wrong", change the component/props or a semantic token — not a hand-rolled override.
- **Compose, don't hand-roll.** Prefer Kumo primitives over raw `<div>`s so focus-trap, `Esc`, ARIA, and keyboard nav come for free. Never reimplement Modal/Menu/Popover behavior.
- **Simple, done well** (see the `simplicity` skill): reuse the stack, no speculative abstractions, names over comments.

## How to consume Kumo

- Components: `import { Button, Dialog, Input } from "@cloudflare/kumo"`.
- Styling: import the **precompiled standalone CSS** (`@cloudflare/kumo/styles/standalone`) once at the app entry point. Avoid adding a Tailwind toolchain just for Kumo unless your build pipeline demonstrably compiles it in production.
- Discover components/props with the Kumo CLI: `npx @cloudflare/kumo ls`, `npx @cloudflare/kumo doc <Component>`.
- Blocks (higher-level ready-made patterns): <https://kumo-ui.com/blocks/> — prefer an existing block over composing the same thing by hand.

## Theming & dark mode

- Dark mode is driven by **`data-mode="light"|"dark"` on `<html>`** (Kumo's contract). Set it before hydration (inline FOUC guard) and from your color-scheme store.
- Use Kumo **semantic tokens** (e.g. `bg-kumo-base`, `text-kumo-default`, `border-kumo-line`) which resolve per mode via `light-dark()`. Don't hardcode hex per theme.

## Forms

- Use your form library (React Hook Form recommended) with your schema resolver, wiring each Kumo input via its controller and surfacing the field error into the input's `error` prop (keeps `aria-invalid` / `aria-describedby`).
- Reuse existing validation schemas — don't duplicate rules between form and API.

## Notifications

- Kumo `Toasty` provider (mounted once at the app entry) + `useKumoToastManager().add({ title, description })`. Never remove the provider in a different change than the call sites that use it.

## Icons

- Use `@phosphor-icons/react` where a Kumo prop requires a Phosphor element. Keep one icon wrapper for the app's own glyphs; don't mix icon libraries.

## List row actions and delete confirmation (mandatory for tables/lists)

Any page with a **table or list** of items must follow this exact pattern for per-item actions:

### Row actions menu

- Kumo **`DropdownMenu`** with a ghost square **dots** trigger (`Button shape="square" variant="ghost"` + dots icon).
- Every dropdown item shows an **icon + the action title**.
- Primary actions come first as normal items.
- **Delete/destructive actions come LAST**, in **red** (`variant="danger"` + trash icon), with a **horizontal separator line above** them.

### Delete confirmation

- Always Kumo's **`DeleteResource`** block (<https://kumo-ui.com/blocks/delete-resource/>) — not inline delete, not `window.confirm`, not a custom confirm `Dialog`.
- State: a nullable `toDelete` entity + `deleteLoading` + `deleteError`.
- Props pattern: `open={toDelete !== null}`, `onOpenChange` clears entity/error, `size="sm"`, `resourceType`, `resourceName`, `onDelete`, `isDeleting`, `errorMessage`.

Do **not** invent alternate list-action or delete UX on new pages — the first list page you build becomes the canonical reference; keep every later one identical.

## Accessibility (verify by hand when there is no DOM CI)

Check every UI change per route in **light and dark**: tokens resolve (no undefined CSS vars), dark mode flips, focus rings/hover/active, `Dialog` focus-trap + `Esc`, `Dropdown`/`Popover` keyboard + outside-click, form validation timing, and toasts fire.

## Deliverables for UI changes (mandatory — before AND after)

Every UI modification ships with **before/after** visual proof. No UI work
is reported as done without it:

1. **Before** — capture FIRST, before touching any code: a screenshot of
   each affected route/state and a short recording of the current behavior.
   Skip only when no "before" exists (a brand-new screen or flow). If you
   forgot to capture it, recreate it from the base branch — don't skip it.
2. **After** — a screenshot of each affected route in light and dark mode
   (when theming applies) **and** a screen recording walking through the
   changed behavior.

Attach the artifacts to the PR (or session summary) as labeled
before/after pairs per route.
