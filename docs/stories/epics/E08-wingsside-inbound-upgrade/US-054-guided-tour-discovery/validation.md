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

PM acceptance was completed locally on 2026-07-27. Production release remains
separate and requires the repository's production push re-check.

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
  verdict before being interrupted, so Harness is marked implemented from PM
  acceptance with production still pending.
- No staging, canary or production deployment was performed. The production
  push requires re-confirming the host, release path, compose project, domains,
  TLS, environment/secret paths, running containers and rollback point.
