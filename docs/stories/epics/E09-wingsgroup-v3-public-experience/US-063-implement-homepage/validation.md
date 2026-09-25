# US-063 Validation

## Proof Strategy

Prove the approved composition, the Capability → Journey Inquiry homepage
enhancement order, synchronized ecosystem behavior, safe proof and CTA
fallbacks, responsive stability, and tenant isolation.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Publication filtering, CTA resolution, active-profile state, homepage enhancement order, and reduced-motion behavior. |
| Integration | Payload blocks/media resolve in exact order and remain WingsGroup-scoped. |
| E2E | Five ecosystem profiles, keyboard selection, capability badges, five inquiry triggers, pending proof, editorial links, CTA fallback, and no duplicate CTA. |
| Platform | Build, desktop/mobile screenshots, 360–1920px overflow matrix, cross-tenant smoke. |
| Performance | Responsive image sizes, lazy loading below hero, and layout stability. |
| Logs/Audit | Ecosystem/CTA events contain the expected non-PII context. |

## Fixtures

- Five ecosystem profiles.
- One approved and one pending proof record.
- Three editorial cards.
- Configured, unconfigured, and disabled CTA states.

## Commands

```text
pnpm lint
pnpm test:int
pnpm test:e2e
pnpm build
```

Use `agent-browser` for the interactive fixed-height, keyboard, and responsive
review.

## Acceptance Evidence

Implemented. Production smoke on 2026-08-26 confirmed the required homepage
order, the five-service explorer, safe trust/proof surface, editorial rail,
contact intake and published Vietnamese/English entry routes. The primary
chooser stays at `/#consultation-dialog`; the hero CTA resolves once to
`/lien-he#contact-form`.

## Navigation follow-up evidence — 2026-09-09

The deployed follow-up commits `5f427b2`, `912030c`, and `4dfb50d` make the
primary navigation consistent on the home page and every WingsGroup subpage:
`/#home`, `/#services`, `/#about`, `/#trust`, `/tin-tuc`, and `/#contact`.
The home sections remain the concise overview; their explicit deep-dive links
lead to `/nang-luc-dich-vu`, `/he-sinh-thai`, and `/ve-wingsgroup`.

Targeted navigation and shell unit checks passed (9 assertions). Production
browser smoke confirmed those six header destinations on an article route and
the three deep-dive links on the home route. This evidence does not alter the
separate operational gates tracked by US-066.

## Homepage enhancement follow-up — 2026-09-16

The implementation now renders the governed Capability and Journey Inquiry
enhancements after Ecosystem while preserving the canonical six-section order.
The consultation FAB uses the approved `LIÊN HỆ TƯ VẤN 24/7` / `24/7
CONSULTATION` labels, and Journey Inquiry stores only a whitelisted,
session-scoped request key for the shared consultation dialog. No CMS schema,
database migration, or production data write was introduced.

Evidence:

- Component: 27 files, 152 tests passed.
- Integration: 33 files passed, 6 skipped; 175 tests passed, 10 skipped.
- Targeted fidelity unit: 6 tests passed.
- TypeScript: `pnpm exec tsc --noEmit` passed.
- Targeted WingsGroup ESLint: passed with no errors.
- Local browser visual review was blocked by the existing SQLite fixture: the
  local page is rejected by the WingsGroup v3 public policy and returns 404;
  the governed preview seed also lacks the required 12 media files. Component
  tests remain the visual structure proof until the fixture is restored.
