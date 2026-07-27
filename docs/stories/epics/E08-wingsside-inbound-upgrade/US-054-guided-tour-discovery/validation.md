# US-054 Validation

## Proof Strategy

Prove the vertical slice from visible entry to listing, filtered URL, Tour Detail
and consultation recovery. Every result must trace to a published same-site
TourProduct. Validation covers EN/VI/IT/ES/PT and must not submit a real lead.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Query parsing, invalid values, three duration buckets, relax order, canonical policy and context serialization. |
| Integration | Same-site/published filtering, wrapper validity, locale projection, duration+taxonomy AND semantics, stable ordering and no static fallback. |
| Component | Filter controls, cards, counts, invalid notice, broader/empty/error recovery, focus and 44px touch targets. |
| E2E | Nav/Home/hub entry -> filter -> URL restore -> Tour Detail; zero result -> Plan/Contact at 390px/1440px in five locales. |
| Platform | TypeScript, lint, build, locale validator, DB/Redis health, tenant isolation and canonical/sitemap probes. |
| Regression | US-050 Home 6/6/3, existing hubs, Tour Detail and US-053 gates remain intact. |

## Fixtures

- Published same-site tours covering destination/style/duration combinations.
- Unpublished, cross-site and incomplete records proving fail-closed behavior.
- Zero-result and invalid-query combinations.
- Exact EN/VI/IT/ES/PT labels and representative localized content.

## Commands

```text
pnpm run test:unit
pnpm run test:component
pnpm run test:int
pnpm run test:e2e
pnpm run validate:wingsside:locales
pnpm exec tsc --noEmit
pnpm run lint
pnpm run build
```

Add a targeted discovery E2E command/spec with the implementation.

## Acceptance Evidence

PM acceptance was completed locally on 2026-07-27. Production release was
completed later on 2026-07-27 after explicit owner re-confirmation.

| Acceptance criterion | Evidence |
| --- | --- |
| Published, same-site inventory only | The discovery query applies site, published and wrapper constraints; a second bounded public-access page query verifies every wrapper. Unverified populated wrappers are nulled before projection. Integration coverage passes. |
| Shareable destination/style/duration filters | Scalar query parsing, contract-order serialization and the `1-7`, `8-14`, `15-plus` buckets pass unit, component and browser tests. Rewritten tenant URLs use full-document replace so server data and metadata update; focus and scroll are restored after navigation. |
| EN/VI/IT/ES/PT behavior | The locale validator passes `105/105` expected routes with zero blockers and warnings. The E2E matrix renders all five locales at `1440x900` and `390x844`. |
| Deterministic recovery | Cumulative relaxation removes duration, then style, then destination. Browser proof verifies the broader-results notice, stable result count and consultation actions. |
| Detail and consultation context | E2E proves discovery context through Tour Detail, Plan and Contact, including Back restoration. No real lead was submitted. |
| SEO, tenant, accessibility and responsive gates | Base discovery is self-canonical/indexable; filtered and invalid URLs are `noindex,follow` and canonicalize to the base. Sitemap includes only base locale URLs. Non-WingSide access is rejected. Interactive browser QA found no page or console errors at desktop and mobile widths. |
| Governed public price state | Discovery cards, WingSide Home curation, standalone Tour Detail and routed CMS/StructuredPages detail all use the governed tour-price helper. Public price claims require a finite positive value and supported `VND` or `USD`; unsupported currencies (`ABC`, `XXX`, `EUR`, `GBP`), missing currency, zero, negative and non-finite prices fail closed to on-request/contact copy. |
| Observability and performance | One structured completion event records normalized filter codes, result count, invalid-filter count, relaxation, tenant outcome and `duration_ms` without raw invalid values. Production-like SQLite probes returned 22 base cards and measured approximately `1.55s` cold/`1.03s` warm for base, `0.32s`/`0.30s` exact, `0.59s`/`0.60s` relaxed and `0.60s`/`0.52s` invalid queries. |

## Executed Proof

- `pnpm run test:unit`: `58` files, `392/392` tests passed.
- `pnpm run test:component`: `14` files, `56/56` tests passed.
- `pnpm run test:int -- tests/int/wingsSideDiscovery.int.spec.ts`: `7/7`
  tests passed, including fail-closed public wrapper verification and safe
  structured logging.
- Final post-remediation focused gate on `cbc9fdf`: unit `38/38`,
  component `27/27`, integration `8/8`, `pnpm exec tsc --noEmit` PASS, and
  `pnpm exec next build --webpack` PASS.
- `tests/e2e/wingsside-journeys-discovery.e2e.spec.ts`: all five scenarios
  passed against production-like SQLite data. The scenarios cover tenant and
  sitemap routing, five locales at desktop/mobile, exact filtering and
  Detail/Back context, invalid-query SEO, and cumulative recovery with
  consultation context.
- `pnpm run validate:wingsside:locales`: PASS, `105` expected routes, zero
  blockers and zero warnings.
- `pnpm exec tsc --noEmit`: PASS.
- Changed-file ESLint: PASS with zero errors.
- `pnpm exec next build --webpack`: PASS; the `/journeys` dynamic route is in
  the production route manifest.
- Agent-browser captures:
  `artifacts/us054-qa/final-desktop-loaded.png` and
  `artifacts/us054-qa/final-mobile-filtered.png`. The filtered mobile probe
  showed `8` Hanoi results, `noindex, follow`, the base canonical, restored
  focus and no browser errors.

## Baseline and Environment Notes

- The full integration command reaches a pre-existing
  `multisiteInventoryContract.int.spec.ts` failure for the WingsCare VI default
  locale. The same isolated test fails identically on the untouched base
  checkout; the US-054 targeted integration suite passes.
- The default Turbopack build rejects the worktree's external `node_modules`
  junction. The repository's webpack production build passes.
- SQLite is used only for local proof. Staging/production remain PostgreSQL
  with Redis support per the architecture contract.

## Independent Review and Release

- Initial independent review found an unverified populated-wrapper bypass; the
  implementation now nulls every wrapper absent from the constrained
  verification result and includes a regression test.
- Initial independent acceptance audit found missing structured completion
  logs; the required safe fields and tests are now implemented.
- The next independent review found that a static `/journeys` route could
  shadow a legitimate CMS page on another tenant. Non-WingSide requests now
  delegate to the existing generic CMS renderer and metadata path; focused
  regression coverage preserves WingSide discovery and absent-page
  fail-closed behavior.
- Subsequent independent review and audit cycles found invalid App Router
  exports, missing governed discovery price state, non-positive price claims,
  unsupported currency claims, and routed CMS detail price bypasses. These were
  remediated through scoped worker/PM commits up to `cbc9fdf`; PM verification
  on that HEAD passed unit, component, integration, TypeScript and webpack
  gates. The last GPT-5.5 audit wrapper did not return a final acceptance
  verdict before being interrupted, so local Harness acceptance was marked from
  PM acceptance and the clean final code review.

## Production Release

Production go-live completed on 2026-07-27:

- Release source SHA:
  `8d5a1e3b46157481d60856137ff92118eb686500`.
- Immutable release path:
  `/home/ubuntu/wings-travel/releases/wingsside-us054-8d5a1e3`.
- Previous release retained:
  `/home/ubuntu/wings-travel/releases/wingsside-us053-e6c44df`.
- Active runtime image:
  `sha256:24c59085f37855640ae9fbf920fd72ff3074d4c2354c8333279748d6e4791867`.
- Rollback image tag retained:
  `wingstravel-app:rollback-us054-pre-20260727T160329Z`.
- Canary on `127.0.0.1:3001` passed live health, database, Redis,
  `/journeys` and filtered `/journeys?destination=hanoi&style=romance&duration=8-14`
  probes before production switch. Readiness remained `degraded` only because
  lead delivery is disabled, matching the preceding production release.
- Production switch updated the `current` symlink and recreated only the app
  container. PostgreSQL and Redis containers were preserved.
- Public HTTPS probes passed:
  `/api/health/live`, `/api/health/ready`, `/journeys`, the filtered Hanoi +
  Romance + 8-14 day query and an invalid-query recovery URL all returned HTTP
  200.
- Agent-browser live QA confirmed base `/journeys` renders `22` same-site
  journeys, the filtered Hanoi + Romance + 8-14 query renders exactly `1`
  journey, and Plan, Contact and Tour Detail links preserve the valid discovery
  context. Invalid query UI resets to `All` filters, drops raw invalid params
  from Plan/Contact/card links, remains `noindex`, and canonicalizes to the
  base `/journeys` URL. No real lead was submitted.

Production evidence:

- `evidence/us054-production-filtered-journeys.png`

## Production Media Mount Correction

On 2026-07-28, post-release visual review found that several `/journeys` cards
rendered broken image placeholders. The public image URLs were correct, but the
production app container had mounted release-local `./data/media` into
`/app/public/media`; that release-local directory was empty. The production
media catalog exists at the documented shared path
`/home/ubuntu/wings-travel/shared/data/media`.

The production compose file now mounts
`${WINGSTRAVEL_MEDIA_DIR:-/home/ubuntu/wings-travel/shared/data/media}` to
`/app/public/media` so immutable application releases keep using the shared
media catalog. Recreate only the app container after applying this correction;
PostgreSQL and Redis are not affected.
