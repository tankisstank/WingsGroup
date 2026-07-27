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

Pending. Worker output is not acceptance; PM records evidence only after
independent review, audit and release proof.

