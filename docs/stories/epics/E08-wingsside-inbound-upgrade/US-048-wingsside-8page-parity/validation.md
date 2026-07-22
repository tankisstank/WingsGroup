# Validation

## Proof Strategy

Combine targeted unit/component/integration tests with real-browser DOM assertions and pixel evidence. Freeze Home carousel state and clear the promo dismissal state before comparisons. Never submit a live form.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Form block consumption, allowed reusable block filtering, stable marker mapping. |
| Integration | Payload/seed inventory has 6 destinations, 6 styles, 5 packages, 3 guide notes, and WhatsApp. |
| E2E | Eight routes load, required markers exist, Plan/Contact have one form, no duplicate IDs. |
| Platform | 1440x900 and 390x844 screenshots; overflow checks at 360/390/430/768/1024/1440. |
| Performance | Production build and go-live review complete without page errors. |
| Logs/Audit | No browser console errors; audit report records before/after and residual findings. |

## Fixtures

- Local Payload SQLite content in the isolated worktree.
- Approved prototype HTML and supplied screenshot evidence.
- Existing local CMS forms without submission.

## Commands

```text
pnpm exec prettier --check <changed-files>
pnpm exec tsc --noEmit
pnpm run test:unit
pnpm run test:component
pnpm run test:int
pnpm run build
pnpm run go-live:review -- --site wingsside --base-url http://127.0.0.1:3011
```

## Acceptance Evidence

Completed locally on 2026-07-22 against the runtime served from
`E:\repo\WingsTravel-us046-hifi\app` at `http://127.0.0.1:3011`.

- Plan and Contact each render one CMS form; no duplicate DOM IDs were found.
- Required markers are present exactly once. Inventory counts are 6 destinations,
  6 styles, 5 packages, and 3 guide notes.
- All 8 routes have zero horizontal overflow at 360, 390, 430, 768, 1024, and
  1440 px.
- Hero media panel and image bounds match on Plan, Destinations, Styles, Packages,
  Guide, About, and Contact; captions remain inside the cropped image.
- Mobile hero CTA controls are one-column, full-width, and 44 px high on all 8
  routes.
- Local CMS seed is idempotent after apply: 40/40 locale/page records unchanged,
  no missing records, and no validation gaps.

### Automated checks

- `pnpm exec tsc --noEmit`: pass.
- Targeted ESLint: pass.
- `pnpm run test:unit`: 37 files, 253 tests passed.
- `pnpm run test:component`: 10 files, 31 tests passed.
- Targeted WingsSide integration: 2 files, 7 tests passed.
- `pnpm run build`: pass.
- `pnpm run go-live:review -- --site wingsside --base-url http://127.0.0.1:3011`:
  completed 91/91 checks and included `/wingsside/travel-guide`; rendering was OK
  on desktop/mobile. The release gate remains blocked by pre-existing tenant SEO
  configuration (canonical, robots, sitemap, title/alt metadata), which is outside
  this UI parity tranche.

### Visual evidence

The external audit evidence directory contains
`remediated-{home,plan,destinations,styles,packages,guide,about,contact}-{desktop,mobile}.png`
at 1440x900 and 390x844. Home was captured after clearing
`sessionStorage['wingside-promo-dismissed']` and selecting carousel slide 4.
