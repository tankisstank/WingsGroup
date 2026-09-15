# US-072 — Fix WingsGroup five-brand logos and section header alignment

## Status

implemented

## Lane

high-risk

## Harness Classification

- Input type: `change_request`
- Labels: `bug`, `feature`, `content`
- Epic: E09 — Trải nghiệm public WingsGroup v3
- Surface: WingsGroup parent shell and five-brand ecosystem

## Current Behavior

The production WingsGroup header uses the static primary lockup at
`/brand/wingsgroup/wingsgroup-logo-primary.png`. The PNG is `2400x800`, but
the visible artwork occupies only a narrow centered portion of the canvas. At
the desktop header CSS box (`192x64px` in the observed 1280px viewport), the
painted lockup is only about `56x45px`, so the brand appears undersized.

The shared WingsGroup v3 section header primitive also uses
`align-items: end`. The eyebrow, title, description and optional actions in
the following homepage headers therefore share a bottom edge instead of a
top anchor:

- `#journey-inquiry > div > header`
- `#testimonials > div > header`
- `#proof > div > header`
- `#news > div > header`
- `#about > div > header`

The five ecosystem brands (WingsGo, WingSide, WingsPass, WingsPlus and
WingsCare) do not yet have one governed, fit-for-surface logo contract. The
existing static brand directory only contains complete logo sets for
WingsGroup, WingsGo and WingSide.

## Target Behavior

Deliver one governed five-brand logo family and a corrected parent header:

1. WingsGo
2. WingSide
3. WingsPass
4. WingsPlus
5. WingsCare

Each brand identity must have an approved primary lockup, reverse lockup and
compact/mark export with tight transparent bounds, clear-space guidance,
dimensions, checksum and accessible alt text. The exact file names and source
artwork must be recorded in the brand-family manifest before implementation;
the existing WingsGroup `favicon` and `ogImage` contracts remain separate
social/icon outputs unless the brand review explicitly replaces them.

The WingsGroup parent header must select the correct light or reverse lockup
for its surface, render at a legible visual size without overflowing the
76px desktop shell, and preserve the existing tenant-scoped fallback behavior
for other sites. Compact navigation must use the compact export or mark
without relying on a padded desktop canvas.

All five listed homepage section headers must be top-anchored at desktop
widths. Their existing horizontal editorial composition, responsive collapse,
section order and accessibility landmarks must remain intact. At compact
widths the current single-column flow must remain readable and free of
horizontal overflow.

## Acceptance Criteria

- A reviewed manifest contains exactly five ecosystem brand identities:
  WingsGo, WingSide, WingsPass, WingsPlus and WingsCare.
- Every identity has primary, reverse and compact/mark exports with explicit
  dimensions, tight artwork bounds, clear-space rules, contrast checks and
  accessible alt text; missing or unapproved assets fail closed.
- The parent WingsGroup header uses a surface-aware primary/reverse asset and
  has a measured visible lockup target at 390, 768, 1024 and 1440px without
  nav collision, clipping or horizontal overflow.
- WingsGo and WingSide retain their current site-scoped assets and behavior;
  no child-site logo or tenant fallback leaks into another site.
- `#journey-inquiry`, `#testimonials`, `#proof`, `#news` and `#about` use the
  shared section-header rule with top alignment at desktop widths; direct
  text columns differ by no more than one CSS pixel in their top anchor.
- Compact viewports keep the section headers in natural block flow and retain
  the current heading/description spacing and keyboard-visible focus states.
- Unit/component coverage proves the five-brand asset resolver, primary/
  reverse/compact selection, missing-asset fail-closed behavior and shared
  section-header contract; existing child-site and locale tests remain green.
- Agent-browser or the committed E2E suite captures desktop and compact
  screenshots for the header and all five section headers with zero console
  errors, no overflow and no duplicate landmarks.
- Production CMS writes and migrations remain out of scope. A separate release
  approval and rollback record now exist for the 2026-09-12 runtime cutover.

## Affected Users

- Public WingsGroup visitors on desktop, tablet and mobile.
- Visitors switching between the five ecosystem brands.
- Editors and reviewers validating shared brand assets and homepage fidelity.

## Affected Product Docs

- `docs/product/wingsgroup-v3-fidelity-contract.json`
- `docs/product/wingsgroup-v3-public-experience.md`
- `docs/product/multisite-platform.md`
- `source/strategy/18 Áp dụng Payload vào dự án WingsTravel.md`
- `source/strategy/19 Kiến trúc đề xuất nội bộ WingsTravel Payload.md`
- `source/strategy/20 Kiến trúc đề xuất gửi khách hàng WingsTravel.md`

## Non-Goals

- No new site, locale, routing or database schema.
- No change to the WingsGroup homepage section order or copy contract.
- No redesign of the navigation, consultation dialog or child-site themes.
- No silent cropping or upscaling of an unapproved brand master.
- No production asset import or runtime cutover in the implementation phase.
