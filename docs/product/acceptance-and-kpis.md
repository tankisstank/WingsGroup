# WingsGroup Acceptance And KPIs

## Purpose

This document consolidates the current acceptance shape for phase 1 so that
stories can point to one durable source.

## Acceptance Baseline

Phase 1 must prove these outcomes:

- the first public site is deployable and stable on core routes
- the approved child sites are deployable as independent and fully usable site
  experiences
- multisite content remains isolated by site
- the first approved locales render correctly on key routes
- editors can update core content from the CMS
- at least one reusable landing page structure exists
- access scoping prevents users from viewing or changing the wrong site data
- launch-critical routes include the selected AI-agent SEO baseline
- the delivered public sites use an approved theme system rather than
  unstructured one-off styling

## Editorial Acceptance

- Core pages can be created, updated, previewed, and published from the CMS.
- Post creation, update, publishing, and content management flows are
  production-ready for routine operation.
- Shared site settings affect the correct site only.
- Localized content can be managed without code changes for routine work.
- Required child-site pages are filled with approved copy and image assets.
- Role-specific user guidance exists for the main operational roles.
- A customer handover documentation package is complete and ready to deliver at
  the end of phase 1.
- Deployment, server or VPS, domain, and email-server notes are included when
  they are part of the delivered setup.
- AI-agent SEO research notes and implementation choices are documented.
- Theme rules are documented well enough for multisite reuse.

## UX Acceptance

- Core public routes work on mobile and desktop without major layout breakage.
- CTA paths from marketing pages to contact or conversion surfaces are clear.
- Metadata and social sharing defaults exist on main pages.

## Governance Acceptance

- `super-admin` can view platform-wide data.
- `site-manager` sees only assigned sites.
- `editor` sees only assigned editorial scope.
- Cross-site leakage is treated as a blocker.

## KPI Layers

### Handover KPIs

- All in-scope phase-1 routes and CMS flows are deployable.
- All approved child sites in scope are independently usable with their own
  content, imagery, and settings.
- No blocker remains on core browse, locale switch, or publish flows.
- At least one landing page pattern is reusable without structural code edits.
- Handover documents are complete enough for customer-side operation after
  phase 1.
- Infrastructure handover notes cover deployment, server or VPS, domain, and
  email-server setup when those parts exist in scope.
- Launch-critical pages include the selected metadata and structured-data SEO
  baseline for search and AI-assisted discovery.

### Early Operation KPIs

- Routine content updates are possible from the CMS for the main site surfaces.
- Site-specific ownership remains enforceable in day-to-day admin use.
- The public site can support the first launch without manual content hotfixes
  in code for normal editorial changes.

## Scope Guardrail

Business KPIs such as revenue, bookings, or downstream sales conversion are not
accepted as phase-1 delivery proof unless a separate intake adds the required
systems and dependencies.
