# Scope Boundary And Next Steps

## Delivered In Phase 1

- Payload-first multisite CMS and public frontend foundation.
- Site registry, site settings, site-aware public rendering, and local
  path-prefix simulation for child sites.
- `vi` and `en` localization support on public route reads.
- Role and site-scoped editorial access for `super-admin`, `site-manager`, and
  `editor`.
- Reusable page composer and sample campaign landing pattern.
- Metadata, canonical URL, sitemap, breadcrumb, and structured-data SEO
  baseline.
- Handover documentation package for customer-side operations.

## Explicitly Out Of Scope

- CRM workflow
- Payment and booking
- Complex internal operations workflow
- AI or RAG features unless separately approved

Add any additional project-specific exclusions here.

- Customer-approved final content and image selection are not replaced by the
  technical sample content.
- Production provider accounts, DNS ownership, and transactional email provider
  are pending customer/environment decisions.

## Recommended Next Steps

- Confirm production hosting, PostgreSQL, Redis, domain, DNS, SSL, and email
  provider details.
- Replace sample copy/images with customer-approved content for every launched
  site.
- Choose an SMTP or transactional email provider before claiming production
  email delivery readiness.
- Run launch checklist on staging, then production.
- Create separate intake for CRM, booking/payment, advanced analytics, or AI/RAG
  features if they become required.

## Open Risks Or Follow-Up Items

- Public-domain rich-results validation remains pending until production URLs
  exist.
- Final child-site readiness depends on approved content and imagery.
- Email behavior remains console-only until an email adapter/provider is
  configured.
