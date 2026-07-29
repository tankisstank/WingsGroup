# US-056 Exec Plan

## Goal

Restore the approved WingSide tour content to all four translated locales,
remove mixed-language and unaccented listing copy, and add release protections
that prevent the same data regression from reaching production again.

## Scope

In scope:

- Production audit and root-cause isolation for the localized data loss.
- Exact-scope restoration of 22 tours across `vi`, `es`, `it` and `pt`.
- Journeys listing copy, accents and singular/plural correction in all five
  public locales.
- Strict separation between canonical eligibility data and localized
  presentation data.
- Automated API, integration, E2E, canary and production release gates.
- Mutation safety for taxonomy and other non-localized maintenance scripts.

Out of scope:

- New editorial translation or changes to the accepted tour meaning.
- Tour inventory, taxonomy or Why Travel remapping.
- New booking, pricing, availability or personalization capabilities.

## Risk Classification

Risk flags:

- Production PostgreSQL data mutation.
- Localization and customer-facing content.
- Five public locales and 110 Tour Detail routes.
- SEO metadata, canonical and hreflang continuity.
- Shared `TourProduct` array/localization behavior.
- Regression interaction with taxonomy maintenance.

Hard gates:

- Do not mutate production before an encrypted backup and signed dry-run plan.
- Do not regenerate accepted locale content with machine translation.
- Do not use English fallback to satisfy a translated-content acceptance gate.
- Do not promote if any of the 88 translated tour-locale pairs is incomplete.
- Do not close the story on HTTP 200 checks alone.

## Work Packages

### WP1 — Freeze the incident baseline

- Capture strict production API snapshots for 22 tours and four target locales.
- Record wrapper Page state separately from `TourProduct` state.
- Compare timestamps, release actions and PostgreSQL localized tables to
  identify the write that removed or bypassed locale values.
- Freeze the accepted `vi`, `es`, `it` and `pt` JSON catalogs and source
  manifest by checksum.

Exit: the regression mechanism is reproduced or isolated with evidence, and
the approved source inventory is immutable for this release.

### WP2 — Add regression guards before data repair

- Extend the locale validator to query production-shaped data with
  `fallbackLocale: false`.
- Check title, summary, route, CTA, metadata, itinerary, includes/excludes and
  service summaries against source structure and checksum.
- Detect verbatim English leakage and locale-specific accent/copy markers.
- Add an integration test proving an EN taxonomy-only update cannot change VI,
  ES, IT or PT editorial fields.

Exit: the current production state fails deterministically and the repaired
fixture passes.

### WP3 — Build and rehearse the restoration plan

- Reuse the accepted US-055 editorial catalog without rewriting its copy.
- Produce an exact `22 × 4` signed before/after plan for TourProducts and their
  localized wrapper projections.
- Rehearse apply, verify, idempotent re-apply and rollback on PostgreSQL.
- Require transaction support and refuse identity, site, slug, itinerary-count
  or source-checksum drift.

Exit: rehearsal proves 88/88 target pairs, rollback and idempotence.

### WP4 — Correct listing and detail locale behavior

- Keep canonical identity/taxonomy reads separate from strict localized
  presentation reads.
- Remove silent English presentation fallback from translated cards and detail
  fields.
- Correct VI and PT diacritics in price-on-request copy.
- Implement locale-aware singular/plural duration formatting for EN, ES, IT
  and PT.
- Review all shared Tour Detail copy for untranslated operational terms such as
  `Sales` and preserve the accepted calm, specific, consultative voice.

Exit: focused unit/component tests pass for all five locales with no
word-for-word or machine-translated replacement content.

### WP5 — Apply production data safely

- Create and verify an encrypted PostgreSQL backup and restore drill.
- Run the signed plan in dry-run mode against the final production inventory.
- Apply all writes transactionally with a named release operator.
- Verify after-checksums, strict locale completeness and a zero-change second
  run.
- Retain the prior release, image, signed plan and rollback command.

Exit: strict API audit reports complete values for every translated pair.

### WP6 — Canary, production QA and closure

- Run the full `22 × 5` Tour Detail locale E2E matrix and five Journeys routes.
- Browser-check representative short, medium and long tours in every locale.
- Verify responsive layout, keyboard access, canonical/hreflang and console.
- Promote only the tested immutable image, repeat the strict audit on public
  production, and attach evidence to Harness and Plane.

Exit: all release gates pass and stakeholder checks return localized, complete
content with no English leakage.

## Suggested Execution Order

```text
WP1 root cause ──> WP2 guards ──> WP3 rehearsal ──> WP5 data apply
                         └──────> WP4 UI copy ────> WP6 combined release QA
```

WP3 and WP4 may run in parallel after WP2 freezes the validation contract.
WP5 must complete before final WP6 browser acceptance.

## Stop Conditions

Pause for human confirmation if:

- The accepted locale catalog no longer matches the intended editorial copy.
- The repair requires changing itinerary meaning, tour identity or taxonomy.
- A production write cannot be wrapped in a transaction and restored.
- A proposed fallback would knowingly expose English content to a translated
  locale.
- The exact 22-tour inventory or source checksums drift before apply.

