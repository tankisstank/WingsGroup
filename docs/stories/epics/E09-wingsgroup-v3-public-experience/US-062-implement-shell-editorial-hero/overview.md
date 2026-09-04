# US-062: Implement shell và editorial hero WingsGroup v3

## Status

implemented

## Lane

high-risk

## External Tracking

- Multica: `WIN-30`, child of `WIN-20`.

## Current Behavior

WingsGroup uses the existing shared frontend shell and a pre-v3 public
presentation. The handoff defines a minimal corporate header, responsive menu,
Geist-led visual tokens, split hero, carousel controls, and consultation CTA.

## Target Behavior

The WingsGroup tenant renders an accessible v3 shell and governed editorial
hero without changing other tenants. Navigation, locale state, logo, metadata,
and CTAs come from trusted site settings and page content.

## User Story

As a WingsGroup visitor, I want a clear, fast, and accessible opening experience
so that I can understand the umbrella service and move to discovery or human
consultation on any supported viewport.

## Acceptance Criteria

- Render approved WingsGroup tokens and approved runtime logo without leaking them to other tenants.
- Provide desktop and mobile navigation with keyboard operation, Escape/outside close, and 44px minimum touch targets.
- Render the v3 split hero with primary discovery CTA and secondary consultation CTA.
- Pause hero motion on hover, focus, and hidden tab; disable autoplay for reduced motion.
- Keep the hero CTA in the first readable mobile region and avoid horizontal overflow at required breakpoints.
- Resolve navigation, locale, metadata, logo, and CTA from site-aware CMS data.
- Pass WingsGo and WingSide no-leak regression checks.

## Affected Product Docs

- `docs/product/wingsgroup-v3-public-experience.md`
- `docs/product/hero-presentation-system.md`
- `docs/product/cms-theme-management.md`

## Dependencies

- US-060 governance contract.
- US-061 site settings, hero fields, media, and approved logo source.

## Non-Goals

- Homepage blocks below the hero.
- Exposing English before the route, chrome, metadata, and editorial review are complete.
- Global redesign of other tenants.
