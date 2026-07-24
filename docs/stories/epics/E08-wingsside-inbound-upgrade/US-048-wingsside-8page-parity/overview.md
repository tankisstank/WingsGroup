# US-048: Remediate WingSide 8-page hi-fi parity

## Status

implemented

## Production closure (2026-07-23)

WP5 deployed the eight-page remediation to `wingside.vn`. Production passed
all 91 go-live checks and the 54/54 responsive browser matrix. Plan and Contact
each render one governed form without duplicate IDs; inventories and marker
contracts remain complete. Canonical, robots, sitemap, security headers and
tenant-isolation probes pass. The final release decision is
`pass_with_notes`, limited to non-blocking decorative/brand image alt text and
intentionally disabled lead delivery.

## Current Behavior

The eight WingSide hub routes are live locally, but the independent visual audit records duplicated Plan forms, incomplete package content, secondary hero media gaps, responsive CTA and typography drift, desktop navigation drift, and missing card-level review markers.

## Target Behavior

All eight routes preserve Payload CMS ownership and multisite dispatch while matching the approved prototype at 1440x900 and 390x844. Plan and Contact each render exactly one CMS form, CMS-backed inventories are complete, and all requested `data-od-id` markers are stable.

## Affected Users

- WingSide travelers using desktop and mobile browsers.
- Content editors managing WingSide pages, cards, channels, and forms in Payload.
- Reviewers using Open Design markers and go-live evidence.

## Affected Product Docs

- `docs/product/page-composer-and-landing-pattern.md`
- `docs/stories/epics/E08-wingsside-inbound-upgrade/overview.md`
- `docs/AUDIT-US046-HIFI-LOCAL-2026-07-22.md`

## Non-Goals

- Deploying or changing production.
- Replacing Payload or the multisite route architecture.
- Hardcoding fallback cards to hide missing CMS records.
- Changing non-WingSide routes or submitting real leads.
