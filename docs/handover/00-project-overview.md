# Project Overview

## Project

- Project name: WingsGroup
- Phase: Phase 1 - Payload-first multisite CMS
- Delivery date: 2026-06-01
- Primary contact: Internal implementation team (handover package owner)

## Delivery Summary

Phase 1 delivered a production-ready multisite content platform based on
Payload + Next.js. The system supports one umbrella site and five child sites in one codebase, role-scoped
CMS access, localization, page/post/media operations, editorial draft/publish
workflow, and a role-aware CMS operator console.

## Included Sites

- WingsGroup
- WingsGo
- WingsSide
- WingsPlus
- WingsCare
- WingsPass

## Core Capabilities Delivered

- Multisite: one shared codebase with site-scoped data and routing.
- Localization: `vi` and `en` enabled with locale-aware editing.
- Content management: pages, posts, categories, media, forms, lead submissions.
- Landing pages: reusable page-composer pattern and guided page wizard.
- Access control: `super-admin`, `site-manager`, `editor` with site scope.
- Theme management: approved presets, controlled site overrides, color pickers,
  and live admin previews.
- Site review: generated treeview for scanning every public site, page, post,
  and utility route.

## Known Constraints

- Phase 1 excludes CRM pipeline, booking/payment, and deep automation workflows.
- Local bootstrap uses SQLite; staging/production target PostgreSQL (+ Redis for scale).
- Automatic SQLite schema push is disabled locally. Schema changes must be
  reviewed and applied deliberately instead of accepting an interactive
  data-loss prompt.
- Operational environment details are recorded in
  [08-deployment-server-domain-email.md](08-deployment-server-domain-email.md)
  and [docs/accounts.md](../accounts.md); production pushes must be re-checked
  against the live VPS before execution.
- aaPanel access on the production VPS is intended to go through Tailscale and
  not via public exposure unless a separate decision is documented.

## Links

- Production URL(s): to be finalized per deployment environment.
- Admin URL: `/admin` (operator console at `/admin/console`, wizard at `/admin/page-wizard`).
- Theme Manager: `/admin/theme`.
- Theme preset governance: `/admin/collections/theme-presets`.
- Link review generator: `app/scripts/generate-site-link-review.ts`.
- Generated review page: `app/output/site-link-review.html`.
- Design or asset source: CMS-managed media library + customer-approved content assets.
- Support channel: project support process defined by delivery team.
