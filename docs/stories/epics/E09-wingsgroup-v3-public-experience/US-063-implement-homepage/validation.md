# US-063 Validation

## Proof Strategy

Prove the approved composition, synchronized ecosystem behavior, safe proof and
CTA fallbacks, responsive stability, and tenant isolation.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Publication filtering, CTA resolution, active-profile state, and reduced-motion behavior. |
| Integration | Payload blocks/media resolve in exact order and remain WingsGroup-scoped. |
| E2E | Five ecosystem profiles, keyboard selection, pending proof, editorial links, CTA fallback, and no duplicate CTA. |
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
