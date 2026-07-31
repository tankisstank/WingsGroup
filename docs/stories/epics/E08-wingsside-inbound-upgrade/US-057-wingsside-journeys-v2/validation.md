# US-057 Validation

Local implementation proof completed on 2026-07-31 covers query
normalization/serialization, strict localized
q/type/destination/style/duration AND matching, missing-type private fallback,
verified-departure-only group/hybrid commerce, contact fallback after expiry,
hidden context propagation, SQLite repair parity, additive PostgreSQL
migrations and an exact-scope production lifecycle.

## Automated gates

- TypeScript: pass.
- Focused US-057 unit: 47/47 pass.
- Component: 80/80 pass; Journeys component 13/13.
- Integration: all configured suites pass; environment-dependent suites keep
  their existing skips.
- Local SQLite commerce bootstrap: pass and idempotent.
- PostgreSQL empty-to-head migration smoke: pass.
- PostgreSQL pre-head upgrade smoke: pass.
- PostgreSQL real Payload CRUD rehearsal: pass.
  - exact site and 22 product identities;
  - canary apply/verify/rollback: 1/1;
  - full apply/verify/rollback: 22/22 classifications and three managed
    departure products;
  - unmanaged expired departure preserved through both cycles.
- Production build: pass.
- Lint: zero errors; existing repository warnings remain.
- Journeys browser E2E: 5/5 pass on Chromium, covering tenant isolation,
  EN/VI/IT/ES/PT desktop and mobile filters, strict AND deep links,
  detail/contact/back context, invalid-query no-leak and true zero-result
  recovery.
- Full unit command: 722 tests at the current checkpoint; stale test fixtures
  were aligned with the already-integrated US-052 per-site default-locale
  contract.

`validate:wingsside:locales` reaches the editorial catalog gate but stops
because the local source data is still the unsafe positional v1 format without
stable `sourceRowID` dispositions. This is a pre-existing data prerequisite,
not a Journeys renderer/schema failure.

## Visual evidence

- `evidence/journeys-desktop-1440.png`
- `evidence/journeys-mobile-390.png`
- `evidence/journeys-contact-fallback-desktop-1440.png`
- `evidence/journeys-zero-result-mobile-390.png`

Repo-preferred `agent-browser` verified the local WingSide route at 1440 px and
390 px. The mobile deep link retained all five active filters with strict AND,
showed a true zero result without relaxing the brief, and had
`scrollWidth=clientWidth=390`. Contact/quote CTA URLs carried structured tour
and discovery context; the user message field remained empty.

The local CMS snapshot has not been mutated with the production
classification, so its existing records continue to exercise the private
fallback. Group, hybrid, fresh and expired card anatomy is locked by unit and
component tests; PostgreSQL rehearsal proves the real Payload mutation path.

The production/source classification remains seven pure group, eight pure
private, four hybrid and three unresolved source redirects. Product accepted
the source pricing/classification. A fresh exact-row capture validated 21
current candidate departures across products 63, 65 and 69; fresh evidence is
still required immediately before any production plan because the maximum TTL
is 24 hours.

Production apply is additionally protected against expired plans. If a process
commits but loses its output receipt, `recover-receipt` can reconstruct it only
when every managed row exactly matches the signed postimage. Rollback remains
allowed after expiry and revalidates complete identity/provenance before
deletion.

No production deployment is asserted by this proof.
