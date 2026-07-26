# WingSide public-acquisition audit triage — 2026-07-25

## Source

- External audit: `wingside-audit-report.md`, reviewed on 2026-07-25.
- Scope in the supplied report: 45 public routes, desktop 1440px, mobile
  390px, English and Vietnamese.
- Repo evidence was checked before creating work so findings already closed by
  later releases are not duplicated.

## Locale decision

The remediation contract covers the five public WingSide locales already
supported by the platform: `en`, `vi`, `it`, `es`, and `pt`.

Product ownership confirmed the required public locale set as `en`, `vi`,
`it`, `es`, and `pt`.

## Classification

| Audit finding | Classification | Owner | Decision |
| --- | --- | --- | --- |
| WS-AUD-000/001 tenant robots, sitemap, canonical and hreflang | Regression bug, P0 | US-053 / BUG-WS-002 | Re-open as a production release gate because it contradicts US-048 closure proof. Extend from VI/EN to EN/VI/IT/ES/PT. |
| WS-AUD-002 form accessible names and validation focus | Accessibility bug, P0 | US-053 / BUG-WS-003 | Fix across Plan and Contact in all five public locales. |
| WS-AUD-003 mixed-language and identical-default copy | Content-integrity bug, P0 | US-053 / BUG-WS-005 | Extend the editorial audit and remediation to VI/IT/ES/PT; EN remains the source-language baseline. |
| WS-AUD-004 static discovery cards | Already resolved | US-050 / BUG-WS-001 | Do not duplicate. Production release now binds Home discovery to real TourProduct records for EN/VI/IT/ES/PT. |
| WS-AUD-011 Family Vietnam 404 and internal 4xx | Routing bug, P0 | US-053 / BUG-WS-004 | Add same-locale route inventory and crawl gates for all five locales. |
| Mobile drawer focus containment | Change request, P1 | CR-WS-002 | Conversion/accessibility enhancement; not grouped into a release bug until reproduced against the current release. |
| Parent navigation and Tour TOC current state | Change request, P1 | CR-WS-002 | Bounded navigation enhancement. |
| CTA vocabulary and Home mobile length | Change request, P1 | CR-WS-002 | Requires content/design approval rather than a defect-only patch. |
| Localized alt-text governance | Change request, P1 | CR-WS-002 | Requires an editorial classification policy and inventory. |
| Credentials CMS source and fixed accessible frame | Already resolved | US-052 | Do not duplicate; Proof Archive is live with CMS ownership and keyboard proof. |
| English benefit-first copy and overlay polish | Change request, P2 | CR-WS-002 | Keep in a separately prioritizable request. |

## Delivery decision

- Create one high-risk parent story, US-053, because the P0 findings share the
  same release decision, five-locale route matrix and production proof gate.
- Keep each reproducible defect as a named bug under US-053 for independent
  ownership and evidence.
- Keep P1/P2 improvements in CR-WS-002; do not imply that they block the P0
  remediation or that implementation has started.
- Preserve US-050 real-tour discovery and US-052 Proof Archive as explicit
  regression gates.

## Navigation-flow follow-up

The companion navigation-flow analysis is captured in
`navigation-flow-proposal-2026-07-25.md`. Product ownership approved the Guided
Tour Discovery direction for fast-track delivery as US-054. It remains separate
from US-053 because it adds a new listing/filter capability rather than fixing a
release-blocking defect.
