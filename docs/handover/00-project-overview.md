# Project Overview

## Project

- Project name: WingsTravel
- Phase: Phase 1 - Payload-first multisite CMS
- Delivery date: 2026-06-01
- Primary contact: Internal implementation team (handover package owner)

## Delivery Summary

Phase 1 delivered a production-ready multisite content platform based on
Payload + Next.js. The system supports four sites in one codebase, role-scoped
CMS access, localization, page/post/media operations, editorial draft/publish
workflow, and a role-aware CMS operator console.

## Included Sites

- WingsTravel
- WingsGo
- WingsCare
- WingsInsurance

## Core Capabilities Delivered

- Multisite: one shared codebase with site-scoped data and routing.
- Localization: `vi` and `en` enabled with locale-aware editing.
- Content management: pages, posts, categories, media, forms, lead submissions.
- Landing pages: reusable page-composer pattern and guided page wizard.
- Access control: `super-admin`, `site-manager`, `editor` with site scope.

## Known Constraints

- Phase 1 excludes CRM pipeline, booking/payment, and deep automation workflows.
- Local bootstrap uses SQLite; staging/production target PostgreSQL (+ Redis for scale).

## Links

- Production URL(s): to be finalized per deployment environment.
- Admin URL: `/admin` (operator console at `/admin/console`, wizard at `/admin/page-wizard`).
- Design or asset source: CMS-managed media library + customer-approved content assets.
- Support channel: project support process defined by delivery team.
