# US-069: Nhúng GA4 và Google Ads tracking đa site

## Status

planned

## Lane

high-risk

## Current Behavior

The six production public domains do not currently expose a governed Google
Analytics, Google tag, Google Ads conversion, or Google Tag Manager contract.
The shared Next.js/Payload frontend already resolves the authoritative tenant,
locale, public pathname, SEO settings, and lead form context, but tracking is
not yet wired into that site-aware boundary.

The lead form can persist a submission and return an accepted response. A
client-side success event therefore represents a submission accepted by the
website, not necessarily a notification delivered to an operator. Form consent
exists in selected flows, but it is not a general analytics/advertising consent
manager.

## Target Behavior

All production public domains have one reusable, tenant-aware tracking layer
that can be enabled per site and measures page views, CTA interactions, form
funnel steps, accepted lead submissions, contact-channel clicks, and approved
campaign attribution without leaking data between tenants.

The implementation uses Google tag IDs and Google Ads conversion definitions
provided by the account owner, supports consent-aware loading, prevents event
duplication during Next.js route transitions, and keeps Google Analytics/Ads
payloads free of personally identifiable or sensitive customer data.

## User Story

As a marketing and operations team, I want GA4 and Google Ads conversion
tracking on every production site so that I can measure traffic, campaign
performance, and lead actions by site and locale without changing page code or
exposing customer information.

## Acceptance Criteria

- Configure the exact production domains `wingsgroup.vn`, `wingsgo.vn`,
  `wingside.vn`, `wingsplus.vn`, `wingspass.wingsgroup.vn`, and
  `wingscare.wingsgroup.vn` using authoritative site context rather than local
  path aliases.
- Store validated, site-scoped public tracking configuration with an explicit
  kill switch, Google tag/GA4 identifiers, Google Ads conversion identifiers,
  and conversion labels. Do not store provider secrets in browser-visible
  configuration.
- Render exactly one Google tag delivery path per page. Initial loads and
  client-side route transitions produce exactly one page-view measurement.
- Implement purpose-specific analytics and advertising consent separately from
  lead-form consent. Before consent, Google storage and advertising tags remain
  disabled; consent updates apply before a navigation or conversion event.
- Emit the agreed event contract: `page_view`, `form_start`, `form_error`,
  `generate_lead`, `cta_click`, and `contact_click`, with `site_code`, locale,
  public path, page type, form/source context, and controlled event parameters.
- Emit `generate_lead` only once after a form submission receives an accepted
  response. Do not fire it on button click, validation failure, retry, or
  duplicate submission. Document that it means website-accepted submission;
  delivered/qualified lead status remains a separate operational metric.
- Capture approved UTM and Google click attribution values with length limits
  and tenant-safe parsing. Never allow client-provided attribution to override
  the server-resolved site identity.
- Never send names, email addresses, phone numbers, free-text form values,
  search terms that may contain personal data, claim details, or other PII/
  sensitive data to Google Analytics or Google Ads.
- Update the production Content Security Policy allowlist for the selected
  Google delivery path and prove that no Google tag request is blocked by CSP.
- Verify the correct GA4 stream receives realtime/debug events for every enabled
  site and the Google Ads conversion mapping does not double-count events.
- Validate production-shaped routes, locale routes, landing pages, tour/service
  pages, contact pages, consent states, form success/error states, and direct
  contact links across all six domains without sending a real customer lead.
- Provide a rollback runbook that disables tracking per site without changing
  public content, lead persistence, routing, or SEO output.
- Record the account/ID matrix, event dictionary, consent behavior, QA evidence,
  monitoring ownership, and post-launch review procedure in handover docs.

## Affected Users

- Public visitors across all six production domains and supported locales.
- Marketing users reading GA4 and Google Ads campaign/conversion reports.
- `super-admin`, `site-manager`, and release/QA operators managing site settings
  and production rollout.

## Affected Product Docs

- `docs/product/multisite-platform.md`
- `docs/product/phase-1-launch-readiness.md`
- `docs/product/go-live-review-pipeline.md`
- `source/strategy/14 Khung tính năng và KPI giai đoạn 1 WingsTravel.md`
- `source/strategy/18 Áp dụng Payload vào dự án WingsTravel.md`
- `source/strategy/19 Kiến trúc đề xuất nội bộ WingsTravel Payload.md`

## Dependencies

- US-003 site registry and settings.
- US-004 localization and site-aware routing.
- US-005 page and landing page composer.
- US-019 go-live review pipeline.
- US-041 production hardening and external metrics acknowledgement.
- US-064 consent-aware lead intake and consultation channels.
- Customer-provided GA4/Google Ads account access, stream IDs, conversion labels,
  approved privacy/cookie copy, and tracking owner.

## Non-Goals

- Meta/Facebook Pixel implementation.
- CRM, booking, payment, sales qualification, or advanced analytics dashboards.
- Sending real production leads as part of automated QA.
- Passing raw form fields or customer PII to any analytics or advertising tag.
- Enhanced Conversions until legal approval, account terms, and a separate
  first-party data design are explicitly accepted.
