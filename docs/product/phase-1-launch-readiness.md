# WingsTravel Phase 1 Launch Readiness

## Purpose

This document is the phase-1 launch proof surface for the current
Payload-first multisite implementation.

## Current Launch State

The platform is technically prepared for first-site validation:

- site registry and settings are implemented
- `vi` and `en` localization routing is implemented
- editorial access is scoped by role and assigned site
- metadata, canonical, sitemap, breadcrumb, and structured-data baselines exist
- reusable page and landing page composition is implemented
- handover documentation package exists under `docs/handover/`

## Site Route Inventory

| Site | Local route | Locale route example | Sample pages |
| --- | --- | --- | --- |
| WingsTravel | `/` | `/en` | `/`, `/he-sinh-thai`, `/nang-luc-dich-vu`, `/tin-tuc`, `/lien-he` |
| WingsGo | `/wingsgo` | `/wingsgo/en` | `/wingsgo`, `/wingsgo/contact`, `/wingsgo/campaign`, `/wingsgo/posts` |
| WingsSide | `/wingsside` | `/wingsside/en` | `/wingsside`, `/wingsside/contact`, `/wingsside/campaign`, `/wingsside/posts` |
| WingsPlus | `/wingsplus` | `/wingsplus/en` | `/wingsplus`, `/wingsplus/contact`, `/wingsplus/campaign`, `/wingsplus/posts` |
| WingsCare | `/wingscare` | `/wingscare/en` | `/wingscare`, `/wingscare/contact`, `/wingscare/campaign`, `/wingscare/posts` |
| WingsPass | `/wingspass` | `/wingspass/en` | `/wingspass`, `/wingspass/contact`, `/wingspass/campaign`, `/wingspass/posts` |

## Launch Checklist

- [x] Multisite context resolution implemented.
- [x] Site-specific settings, branding, SEO defaults, navigation, footer, and
  contact data implemented.
- [x] Localized route simulation implemented for `vi` and `en`.
- [x] Page/post metadata, canonical URLs, sitemap URLs, and JSON-LD baseline
  implemented.
- [x] Breadcrumb UI and matching `BreadcrumbList` implemented where visible.
- [x] Reusable campaign landing pattern implemented.
- [x] Site-scoped roles and write enforcement implemented.
- [x] Handover document set exists.
- [x] Production placeholder content and imagery are available for independent
  child-site smoke checks.
- [x] Docker VPS deployment shape is documented with PostgreSQL and Redis-ready
  services.
- [ ] Customer-approved final copy and images filled for every launched child
  site.
- [ ] Production deployment environment values confirmed on the real VPS.
- [ ] Public domain, DNS, SSL, and email provider details confirmed.

## Content Readiness Status

The current app can run Phase 1 smoke checks with production-shaped placeholder
content. This proves site structure, routing, page composition, SEO fields, and
media wiring. It does not replace customer-approved final content and imagery.

## Scope Guardrail

Phase 1 launch proof does not depend on CRM, booking/payment, advanced
analytics, internal operator workflow, or AI/RAG features. Those require
separate intake and stories.
