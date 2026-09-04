# 0033 WingsGroup v3 Bilingual Release And Media Rights

Date: 2026-08-13

## Status

Accepted

## Context

E09 initially scoped Vietnamese as the first implementation locale and treated
all supplied media as pending publication rights. Stakeholder direction confirms
that all 13 handoff images are licensed for project use and requires English to
be implemented in parallel with Vietnamese, using natural human marketing copy
in a refined and courteous luxury-travel tone.

## Decision

Keep the editorial-media gate pending until each Payload record has provenance,
WingsGroup scope, responsive derivatives, and Vietnamese/English alt text, but
record the supplied-image rights as approved.

Make Vietnamese and English required E09 delivery locales. Implement English in
parallel, but fail closed per route: do not expose an English route or locale
switch before complete route/chrome/metadata inventory and editorial review.

## Alternatives Considered

1. Publish the licensed images immediately. Rejected because provenance, alt,
   scope, and responsive outputs remain required publication controls.
2. Keep English as a post-launch enhancement. Rejected by stakeholder direction.
3. Expose partially translated routes. Rejected because it weakens public trust
   and breaks the locale contract.

## Consequences

Positive:

- Development may use the 13 supplied images without waiting for new licence material.
- Bilingual content is planned as a first-class delivery concern, not a late overlay.

Tradeoffs:

- US-061, US-063, US-065, and US-066 gain bilingual data, copy, QA, and SEO work.
- E09 release remains blocked until all per-media and per-locale evidence is complete.

## Follow-Up

- US-061 defines bilingual media metadata and localized content fields.
- US-062 through US-065 implement and review English alongside Vietnamese.
- US-066 verifies both locale inventories, hreflang, metadata, and editorial quality.
