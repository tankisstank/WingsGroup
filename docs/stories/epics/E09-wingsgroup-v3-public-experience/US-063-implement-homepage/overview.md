# US-063: Implement trang chủ WingsGroup v3

## Status

implemented

## Lane

high-risk

## External Tracking

- Multica: `WIN-31`, child of `WIN-20`.

## Current Behavior

The existing homepage is a corporate hub but has stale copy, weak proof,
inconsistent imagery, cross-tenant sitemap evidence, and ecosystem destinations
that were observed returning 404. The v3 prototype defines a safe replacement
composition and interaction.

## Target Behavior

The Vietnamese and English WingsGroup homepages retain the canonical Hero →
Ecosystem → Trust → Proof Archive → Editorial → Contact order using governed
Payload content. The homepage may include governed product enhancements between
Ecosystem and Trust; the current enhancement order is Capability followed by
Journey Inquiry. English uses natural human marketing copy with a refined,
courteous luxury-travel tone. Unverified proof and destinations fail closed
while the page remains useful and credible.

## User Story

As a WingsGroup visitor, I want to understand the ecosystem and choose the
right service without encountering unsupported claims or dead links.

## Acceptance Criteria

- Render the exact approved section order without a duplicate service router before Ecosystem.
- Render the governed homepage enhancements after Ecosystem in the order Capability → Journey Inquiry without changing the canonical six-section order.
- Synchronize each ecosystem tab, stage image, profile, service scope, proof state, and single contact CTA.
- Keep the desktop ecosystem frame at 800px with no internal scrollbar and natural height at or below 850px.
- Keep 48–72px transition spacing before Trust on desktop and standard section spacing on compact viewports.
- Render missing proof as `Đang cập nhật` without logo, quote, rating, metric, or unsupported claim.
- Render the three governed editorial cards with approved taxonomy, alt, source/date/author rules.
- Provide complete English page, chrome, metadata, and reviewed marketing copy before exposing the English locale switch.
- Route unverified brand destinations and service CTAs to contact intake.
- Pass keyboard, reduced-motion, responsive, no-overflow, and tenant-isolation checks.

## Affected Product Docs

- `docs/product/wingsgroup-v3-public-experience.md`
- `docs/product/page-composer-and-landing-pattern.md`
- `docs/product/editorial-operations.md`

## Dependencies

- US-060 governance and release gates.
- US-061 structured content and media.
- US-062 shell and hero.

## Non-Goals

- Publishing reviews, ratings, licences, or partner proof without approval.
- Enabling brand deep links before destination gates pass.
- Replacing child-site experiences.
