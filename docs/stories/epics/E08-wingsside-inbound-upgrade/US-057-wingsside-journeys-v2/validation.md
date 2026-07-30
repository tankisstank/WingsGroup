# US-057 Validation

Local implementation proof completed on 2026-07-30 covers query
normalization/serialization, strict localized
q/type/destination/style/duration AND matching, missing-type private fallback,
verified-departure-only group commerce, hidden context propagation, SQLite
repair parity and additive PostgreSQL migrations.

## Automated gates

- TypeScript: pass.
- Component: 77/77 pass.
- Integration: all configured suites pass; environment-dependent suites keep
  their existing skips.
- PostgreSQL empty-to-head migration smoke: pass.
- PostgreSQL pre-head upgrade smoke: pass.
- Production build: pass.
- Lint: zero errors; existing repository warnings remain.
- Journeys browser E2E: 5/5 pass on Chromium, covering tenant isolation,
  EN/VI/IT/ES/PT desktop and mobile filters, strict AND deep links,
  detail/contact/back context, invalid-query no-leak and true zero-result
  recovery.
- Full unit command: 692 pass and five canonical-locale failures. The same
  five failures reproduce unchanged on clean base `a6a7a45`; US-057 does not
  change either failing SEO implementation or test file.

`validate:wingsside:locales` reaches the editorial catalog gate but stops
because the local source data is still the unsafe positional v1 format without
stable `sourceRowID` dispositions. This is a pre-existing data prerequisite,
not a Journeys renderer/schema failure.

## Visual evidence

- `evidence/journeys-desktop-1440.png`
- `evidence/journeys-mobile-390.png`

The repo-preferred `agent-browser` daemon could not complete its own offline
doctor check on this workstation, so screenshots and interactive QA used the
committed Playwright stack as the documented fallback.

Current local CMS inventory has no confirmed `tourType` backfill. Existing
records therefore use the documented private fallback and show tailor-made
quote posture. No small-group price, departure or availability was invented;
product/CMS must classify and populate verified group inventory before the
group commerce anatomy appears publicly.

The read-only production/source audit on 2026-07-31 classified the 22-tour
catalog as seven pure group, eight pure private, four hybrid records that the
current enum cannot represent, and three redirected/stale source records. It
also captured 22 future departure candidates across two pure-group products
and one blocked hybrid product. The candidate is not an apply plan: supplier
fulfilment authorization is not recorded, and its live source evidence expires
after 24 hours. See
`production-group-commerce-audit-2026-07-31.md`.

No production deployment is asserted by this proof.
