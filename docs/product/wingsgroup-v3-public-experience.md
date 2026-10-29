# WingsGroup v3 Public Experience

## Status

Production live as of stakeholder confirmation on 2026-08-26. Post-deployment
operational acceptance remains in progress; this contract continues to govern
safe fallbacks and future content publication.

## Source Package

- Multica initiative: `WIN-20`
- Attachment: `wingsgroup-v3-development-handoff-2026-08-10.zip`
- Attachment ID: `019ff9e2-a63a-72e3-b769-205608264d46`
- Size: `32,522,135` bytes
- SHA-256: `eea0c9fdcdae0475b82adf35e5b3161e9a99667f4ba98c92d65e5cd53a1ba98b`
- Package assessment: all 13 media files named by the handoff manifest are
  present and referenced by the prototype; the package is suitable for
  development but is not production evidence.

## Product Objective

Upgrade the existing WingsGroup umbrella site to the approved v3 public
experience without replacing the Payload-first multisite platform. WingsGroup
must remain a site-scoped tenant in the shared Next.js and Payload codebase.

## Public Experience Contract

The home page order is fixed:

1. Hero.
2. Ecosystem explorer.
3. Trust.
4. Proof Archive.
5. Editorial content.
6. Contact intake.

The ecosystem explorer is one synchronized interaction. Changing the active
brand updates its stage image, title, description, service scope, proof state,
and one contact CTA. Desktop uses a stable 800px frame with no internal
scrollbar; viewports at or below 850px use natural height.

Vietnamese and English are both E09 delivery locales. English is implemented in
parallel with Vietnamese and must read as natural human marketing copy in a
refined, courteous luxury-travel tone. A route or locale switch may expose
English only after its route, chrome, metadata, and editorial review are
complete.

## Site and Route Scope

- `/`
- `/ve-wingsgroup`
- `/nang-luc-dich-vu`
- `/tin-cay-va-phap-ly`
- `/tin-tuc`
- `/lien-he`
- `/chinh-sach-bao-mat`
- `/dieu-khoan-su-dung`
- `/chinh-sach-thanh-toan`

The public renderer, links, metadata, sitemap, media, and CMS records must all
resolve through trusted WingsGroup site context.

## Brand Naming and Slug Contract

- The approved public brand name is `WingSide`.
- The canonical path slug is `/wing-side`.
- The former `/wingsside` path is compatibility-only and must redirect to the
  equivalent `/wing-side` path. New content, CTAs, canonicals, tracking and CMS
  references must not emit `/wingsside`.
- The internal site code remains `wing-side`. The existing production domain
  remains `wingside.vn` until the domain owner approves a replacement domain.

## Content and Data Contract

- `site-settings` owns header/footer navigation, support contacts, canonical
  domain, default metadata, brand tokens, and consultation-channel state.
- `pages.hero` owns localized hero content, media slides, CTAs, and governed
  carousel behavior.
- `pages.layout` owns structured WingsGroup blocks; arbitrary HTML, CSS, and
  JavaScript are not allowed in CMS fields.
- Proof records require source/issuer, context or date, publication permission,
  media, and publication state.
- Lead submissions require name, need, site, locale, source path, consent
  version/timestamp, and an optional preferred channel.
- The approved consent version is `wingsgroup-contact-v1`. Consent is required,
  lead retention is limited to 24 months, and data-subject requests go to
  `info@doicanhviet.com`.
- Consultation leads may be routed within WingsGroup, VietWings, Đôi Cánh Việt,
  WingSide and the appropriate service branch solely to respond to the request.

## CTA Safety Rules

- US-085 records the Option A header approved on 2026-10-23: one yellow
  split control with a direct call link and a separate contact disclosure.
  WingsGroup's approved main number is `0948786775`, displayed as
  `0948 786 775`, read from `site-settings.supportPhone`. Preserve CMS-cleared
  contacts and custom additional hotlines. The disclosure offers configured
  additional numbers, shared Zalo OA and the locale-aware contact form at
  `/lien-he#contact-form`. Header navigation keeps all six links; hero and
  floating consultation triggers retain the existing dialog. Header Option A
  and the new main number were deployed in release `6a0dac0` on 2026-10-23.
- The 2026-10-23 footer follow-up keeps the intake form as the main action,
  with one direct call alternative. The WingsGroup v3 footer shows one
  resolved hotline and one email, preferring supportEmail then salesEmail.
  Additional numbers and Zalo remain in the header disclosure; the footer
  no longer repeats them or the consultation CTA. CMS values, legal identity,
  privacy links and other tenants remain intact. This follow-up was deployed
  with explicit authorization in release `d6057d4` at 21:29:13+07 on 2026-10-23;
  no CMS values or schema were changed. Proof is recorded under
  `footer-contact-review-20261023/production-release/` and US-085 validation.
- The built-in consent-aware contact form is the required consultation path.
  Unconfigured external channels show `Chờ cập nhật` or record a preference;
  they do not open an external URL and do not block release.
- Disabled channels are hidden while the generic intake form remains usable.
- Configured channels open only a site-setting URL with approved owner, SLA,
  and analytics metadata.
- US-087 simplifies brand CTA editing: editors choose the contact form or a
  website destination and enter its label and HTTPS URL. Owner, HTTP evidence,
  canonical evidence, tracking evidence, and owner-approval evidence are no
  longer CMS fields or runtime prerequisites. Website URLs must parse as
  absolute HTTPS with a hostname and no credentials, control characters, or
  backslashes. Invalid stored URLs use the safe contact fallback. The existing
  destination enum and nullable historical columns remain compatible; schema
  push must be disabled. This is a local implementation contract, not evidence
  of a production release. Media/proof and consultation-channel rules remain.

## Media Contract

The 13 supplied PNG files are licensed editorial and service media only. Before
publish, each Payload Media record must have:

- Vietnamese alt text.
- English alt text.
- Source and provenance.
- Publication rights.
- WingsGroup site scope.
- Responsive output sizes and production image formats.

No supplied image may be presented as a licence, certificate, award, partner
endorsement, customer review, or other legal proof.

## Go-Live and Post-Deployment Controls

Production must retain the following controls:

- Public legal identity or brand-relationship wording differs from the
  approved `legal-identity` gate.
- The approved privacy/consent contract is missing from a form that collects
  personal data.
- A configured external consultation URL is exposed without an approved
  endpoint, owner, SLA, and tracking proof.
- A proof record lacks source or publication permission and is published.
- A brand CTA emits an unsafe URL instead of rejecting it or using contact
  fallback. Destination availability, canonical and analytics checks belong
  to release QA, not evidence fields entered by editors.
- Sitemap, robots, canonical, or locale output leaks another tenant.
- A required Vietnamese or English route, locale switch, chrome, metadata, or
  editorial review is incomplete.
- Lead validation, failure handling, or audit evidence is incomplete.

Unconfigured consultation channels, unverified proof and unapproved ecosystem
destinations are non-blocking only when their documented pending state or form
fallback is preserved.

## Non-Goals

- CRM or sales pipeline.
- Chatbot or AI workflow.
- Booking or payment.
- Arbitrary editor-authored frontend code.
- A parallel WingsGroup application or separate CMS.

## Delivery Mapping

This contract is delivered by `E09 - Trải nghiệm public WingsGroup v3` through
`US-060` to `US-066`.
