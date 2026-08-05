# CMS admin design language

## Purpose and authority

This document is the durable visual and interaction contract for Payload admin
surfaces in WingsTravel. It applies to custom admin views and to scoped admin
shell overrides; it does not change public-site design tokens, Payload schemas,
REST contracts, or access control.

`cms-operator-console-prototype.html` is not tracked in this repository and
therefore has no implementation authority. This document is the visual and
interaction source of truth until a version-controlled prototype is explicitly
introduced and linked from here. Any remembered or external prototype remains
only a non-binding reference; it cannot justify fake data, invented workflow
state, or routes that bypass Payload.

Feature-specific work records only its delta in that story's `design.md` and
links here. When a story conflicts with this document, the product decision and
the existing Payload contract take precedence until this document is updated.

## Visual language

- Canvas is light blue-gray; working surfaces are white with quiet dividers.
- Navigation is charcoal navy. The active item is a lighter navy; teal is
  reserved for verified or healthy state, not primary action.
- Orange identifies the single next action for the current screen. Do not use
  it as a general decorative or success colour.
- Use `Bahnschrift` or `Segoe UI Variable Display` for headings, `Segoe UI
  Variable Text` for body copy, and `Cascadia Code` only for identifiers and
  technical values.
- Panels have modest corners, restrained elevation, and no promotional cards,
  decorative gradients, or marketing copy.
- Bind styles to existing admin tokens in `app/src/app/(payload)/custom.scss`.
  Do not distribute raw colour values through React components.

## Shell, navigation, and responsive rules

Payload's native navigation remains the authoritative collection and global
navigation. `beforeNav` may offer fast operational links, but must not hide,
duplicate, or replace native collection routes.

- Desktop prioritises a task queue in the main column and context/warnings in a
  supporting rail.
- At 681--1050px, keep the sidebar readable with group and route labels. Touch
  targets are at least 44px. The range replaces the ambiguous `6811050px`
  notation in the original brief.
- At 680px and below, show only triage links for Console, Review, and Lead.
  Do not add a simulated drawer over Payload navigation or force complex
  editors into mobile navigation.
- Console layouts must have no horizontal overflow at 360, 390, 430, 600, 768,
  820, 1024, 1366, 1440, and 1920px.
- Retain the `finexy-soft` and `ats-compact` theme keys. `AdminThemeBootstrap`
  remains the sole owner of URL and localStorage selection behaviour.
- New admin-shell rules are scoped to `.wings-admin-theme-finexy`,
  `.wings-admin-theme-ats`, or the owning component class. They never alter
  public-site CSS.

## Data, scope, and action rules

Custom views read from real Payload APIs and respect the collection's existing
access checks. A hidden action is not authorization; Payload access control is
the final enforcement point.

- Console and the native dashboard are aggregate read models: they show all
  records that the current Payload session is allowed to read. They must label
  this as `Tất cả site được phân quyền` and `Tất cả locale`; admin-interface
  language is separate from content locale. This aggregate context grants no
  write authority.
- A write-capable destination must show its own site, content locale, role,
  and source of scope before confirmation. Page Wizard retains its current
  Payload-default locale (`vi`) because its API does not accept locale input;
  it must disclose that default rather than imply a locale selector.
- For every request group, distinguish loading, empty, error, and no-access.
  A failed request never becomes `0`, an empty list, or a made-up status.
  Failed panels expose a local retry control while independent panels continue
  rendering.
- Metrics count only documents visible through the current Payload session.
  `Trang`, `Bài viết`, `Media`, and `Tổng lead` are unfiltered collection
  counts; `Trang nháp` and `Bài viết nháp` use `_status=draft`; recent lists
  are ordered by `updatedAt` or `createdAt` as named. A draft is not “chờ
  duyệt”, and a lead count is not “lead mới” or unread work.
- Metrics display an unavailable value and `Chưa có dữ liệu` when their source
  has not been confirmed. Their labels must describe the actual query
  semantics, not an assumed operational meaning.
- Write confirmation states site scope, locale, consequence, and the review
  path. Only claim preview, diff, rollback, delivery history, or impact counts
  when an existing backend source proves them.
- Deep links use native Payload `Link` routes. A custom view may guide users to
  `/admin/page-wizard`, `/admin/site-review`, `/admin/theme`, a collection, or
  a global, but must not simulate a record action with a click handler.

## Roles and operational surfaces

The UI exposes only the shortcuts appropriate for the current role, while the
existing Payload rules continue to guard the data:

| Role | Console shortcuts |
| --- | --- |
| `editor` | Create a page draft and access granted content and lead surfaces. No import/export or advanced shortcuts. |
| `site-manager` | Editor shortcuts plus site-scoped settings and import/export where existing access permits them. |
| `super-admin` | All operational shortcuts, including users, redirects, search, globals, and cross-site administration. |

The route inventory is 24 operational routes plus `/admin/console` and the
native `/admin` landing surface:

| Surface family | Real Payload entry points |
| --- | --- |
| Custom workflow | `/admin/page-wizard`, `/admin/site-review`, `/admin/theme` |
| Content | `pages`, `posts`, `categories` |
| Tour | `tour-products`, `departure-variants`, `tour-departures`, `tour-campaigns` |
| Media and lead | `media`, `forms`, `form-submissions` |
| Data exchange | `imports`, `exports` |
| Advanced | `sites`, `theme-presets`, `hero-presentation-presets`, `site-settings`, `users`, `redirects`, `search`, `header`, `footer` |

Route labels are a convenience layer, never a new product route contract.

## Accessibility and interaction

Use native `Link`, `button`, `select`, `input`, and `textarea` controls. A
custom surface provides a skip link to its `<main>` region and a visible
`focus-visible` treatment with at least 3:1 contrast.

Touch rows and buttons meet a 44px minimum target where used on touch devices.
Dialogs are task-specific and have `role="dialog"`, `aria-modal="true"`, a
label and description, a focus trap, Escape close, and focus restoration to the
invoker. Toasts use `role="status"` and `aria-live="polite"`; form errors are
textual and connected with `aria-describedby`. Motion is not the only state
signal and respects `prefers-reduced-motion`.

## Guardrails for future work

- Do not edit generated `app/src/app/(payload)/layout.tsx` or
  `app/src/app/(payload)/admin/importMap.js` by hand.
- Regenerate the import map only when a component import path changes.
- Do not create a collection, fake analytics, fake publish status, fake
  rollback, or loosen access control just to reproduce the prototype.
- Keep Page Wizard, Site Review, Theme Manager, collection routes, and globals
  as real Payload surfaces. Use the surface suited to the command; do not turn
  every route into a generic modal.
- A new workflow that needs locale creation, approval state, delivery retry,
  dependency analysis, tour pricing/type, dry-run/diff, or rollback is a
  product/API decision. Record it and obtain approval before implementation.
- Site Review remains a read-only preview, status, scope, and edit-link
  surface in this story. Approval, comments, assignment, diff, publish, and
  rollback are out of scope.
