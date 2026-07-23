# US-046 — Hi-fi 8-page mapping (Bar B)

Source artifact (locked):

- Project: `9f85d0db-9ebc-409a-b580-5b401e4a10b8`
- File: `wingside-hifi-fix-8pages.html`
- Assets: `assets/hifi/*` → `app/assets/wingsside-hifi/*` + `public/wingsside-hifi/*`

**Composition policy (Bar B / hướng A):** HiFi inventory is the **primary body** for hub routes. CMS `layout` is filtered to **form blocks only** (`formBlock` / `form`). Hero stays CMS. Tour detail routes are unchanged.

## Route map

| # | Hi-fi page | Live route | CMS kept | Body composer (od-ids) | Media |
| --- | --- | --- | --- | --- | --- |
| 01 | Home | `/` | Hero + planner panel (`#home-planner`) | pillars, why + **sla/trust**, dest, styles, sample-journeys (price/micro), **notes**, close (dual CTA), **creds** full-bleed, related | dest/styles/packages assets; why family/culture |
| 02 | Plan | `/plan-your-trip` | Hero + form | plan-steps, plan-explore | explore cards |
| 03 | Destinations | `/destinations` | Hero | dest-routes, dest-grid | hanoi…sapa |
| 04 | Styles | `/styles` | Hero | styles-intro, style-grid | luxury…business |
| 05 | Packages | `/packages` | Hero | pkg-grid | heroHalong, sapa, hoian, hue, family |
| 06 | Guide | `/travel-guide` | Hero | guide-list | sapa, hue, planner |
| 07 | About | `/about-us` | Hero | about-story, about-steps, about-promises, about-team | — |
| 08 | Contact | `/contact-us` | Hero + form | contact-split, contact-after | — |

Composer contract: `app/src/utilities/wingsSideHiFiComposer.ts`  
Inventory UI: `app/src/components/WingsSideHiFi/*`  
Media catalog: `app/src/utilities/wingsSideHiFiMedia.ts`  
CMS page filter: `app/src/app/(frontend)/[...slug]/page.tsx`

## Nav IA

Home · Destinations · Styles · Packages · Guide · About · Contact + CTA **Plan trip**  
No mega menu, no Search primacy (`wingsSideHiFiNav.ts`).

## Specials (Home only)

Desktop ≥768, bottom-right, stripe widget, `wingside-promo-dismissed`.

## Acceptance (Bar B)

- [x] Single composition owner (CMS layout suppressed except forms)
- [x] Inventory od-ids for 8 hubs
- [x] Home credentials section
- [x] Grid media via `/wingsside-hifi/*`
- [x] Nav IA locked
- [x] Inventory copy i18n en/vi/it/es/pt (`copy.ts` + dual-CTA locale wire)
- [x] Payload media sync apply local (15 media; home + packages heroes)
- [x] Full e2e ladder isolated PostgreSQL **75/75** (2026-07-20)
- [x] Home traveler notes + trust strip (`home-notes`, `home-sla`)
- [x] Sample journeys full IA (micro + indicative From $…)
- [x] Why family/culture assets + dest/styles kickers/regions/Match
- [x] Credentials full-bleed + hero CTA → `#home-planner`
- [x] WingSide logo fallback + compact footer shortcuts
- [x] Fresh visual capture 1440/768/390 (`app/artifacts/tmp/hifi-p1-capture/`)
- [x] Codex re-audit r1 → **FAIL** (~82%; `codex-reaudit-home-p1.md`)
- [x] Residual P1 fix (hifi-sections.css, avatar cap, planner stack, creds, footer)
- [x] Codex re-audit r2 → **PASS-WITH-ISSUES** (~96%; `codex-reaudit-home-p1-r2.md`)
- [x] P2 polish: Specials vs planner, visible h1, close `#home-planner`, scrollbar-safe creds, CSS ownership
- [x] Root adversarial local review: LOCAL GO (2026-07-22)
- [ ] Production deploy and VPS re-audit; deploy remains frozen

## Tour detail bridge

| Hi-fi source | Live route pattern | Contract |
| --- | --- | --- |
| `wingside-tour-detail-hifi.html` | `/tour/:slug` | Hero, sticky section nav, facts, real TourProduct gallery, route, itinerary accordion, included/excluded, pricing posture, enquiry, related fallback and sticky CTA |

The Tour Detail renderer is isolated to the WingSide consultative presentation;
WingsGo keeps its retail presentation. Imported media remains CMS-owned and may
require a separate editorial curation pass to match the locked prototype image
selection.
