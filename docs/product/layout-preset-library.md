# CMS Layout Preset Library

## Product Contract

The Payload page composer provides a governed library of reusable page layout
presets and block presentation variants for public website pages.

The library is inspired by VibeUI's public prompt taxonomy, but WingsGroup owns
the implementation. Do not copy VibeUI code, visual identity, assets, or prompt
copy verbatim.

## Governance

- Presets are code-owned and registered in `app/src/utilities/layoutPresets.ts`.
- Editors select a preset in Page Wizard; the generated page stores a snapshot
  in `Pages.layout`.
- `layoutPresetKey` records the source preset for audit and support, but future
  preset changes do not mutate existing pages.
- Editors may choose block presentation variants in Payload, but may not enter
  arbitrary CSS, HTML, or class names.
- All rendering remains site-aware, localized, theme-token based, and
  independent of site code, hostnames, or pathnames.

## VibeUI Taxonomy Mapping

Implemented in `Pages.layout`:

- Hero sections: covered by the existing hero presentation registry.
- Pricing: departure table, tier cards, comparison, single offer, package split,
  and mobile stacked variants.
- Features / Bento: icon grid, bento, alternating rows, tabs, accordion, sticky
  reveal, icon wall, and before/after.
- CTA banners: card, full bleed, split card, sticky bar, patterned, dual action,
  inline form, and testimonial CTA.
- Stats bars: inline bar, card grid, editorial numbers, logo proof, progress,
  split statement, and floating metrics.
- Testimonials: quote grid, marquee, masonry, featured quote, video, social wall,
  logo cloud, and carousel.
- FAQ: single column, two column, chat bubbles, searchable, and categorized.
- Blog / content: archive grid, magazine archive, compact list, reading view,
  sidebar TOC, and editorial split.
- Contact: split contact, centered card, minimal, and support-channel form.

Excluded from this initiative:

- Auth forms.
- Dashboards.
- Onboarding flows.
- Navigation bars and footers.
- Cookie banners, 404 pages, loading states, app shell, and admin-only surfaces.

These belong to auth, operations, global site settings, or app-shell work, not
page content layout.

## Preset Set

The initial code-owned page presets are:

- Homepage editorial.
- Homepage service hub.
- Destination showcase.
- Tour conversion.
- Service detail.
- Campaign launch.
- Lead capture.
- Contact and support.
- Pricing and package comparison.
- Magazine and content hub.
- Long-form guide.
- Trust and social proof.

Each preset must generate a valid draft page using registered block types only.

## Validation Contract

- Unit/integration tests prove registry uniqueness and valid block snapshots.
- Type generation, typecheck, lint, integration tests, E2E, and build must pass
  before release.
- E2E must cover Page Wizard visibility and at least one preset-created draft.
- Visual smoke should cover desktop and mobile for representative public pages.

## Admin UX Notes

- Page Wizard shows a sticky preset summary on desktop and stacks the summary
  above cards on mobile.
- Mobile spacing reserves room for Payload's floating admin control so it does
  not cover the first preset card.
- Payload admin sets the title suffix to `WingsGroup CMS` and suppresses
  hydration warnings caused by browser extensions mutating `<html>` attributes
  before React hydrates.
