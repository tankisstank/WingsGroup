# US-056 Design

## Domain Model

The repair treats a WingSide tour as two related data planes:

1. Canonical inventory data: ID, site, slug, wrapper relation, publication
   state, taxonomy, duration, media and source provenance.
2. Localized presentation data: title, summary, route, itinerary copy,
   includes/excludes, service summaries, CTA label and metadata.

Canonical data may be read from the English source locale when needed for
eligibility. Localized presentation data must be read from the requested
locale with `fallbackLocale: false`.

The accepted editorial source is the checked-in catalog under
`app/scripts/data/wingsside-tour-editorial/`. It contains exactly 22 slugs and
the four target locales in the approved WingSide voice.

## Application Flow

### Journeys listing

1. Resolve published same-site canonical tour identities and taxonomy.
2. Load requested-locale presentation fields strictly.
3. Validate that every eligible card has localized title and summary.
4. Render locale-owned duration, price, taxonomy and CTA copy.
5. Emit an operational error and fail the release gate if the strict
   projection is incomplete; never silently substitute English card copy.

### Tour Detail

1. Resolve the canonical TourProduct and same-site wrapper.
2. Load TourProduct and wrapper presentation fields in the requested locale.
3. Build the view model only after required title, summary and itinerary
   structure pass.
4. Render locale-owned interface copy around the localized product content.

### Production restoration

1. Read strict before-state values for all 88 translated pairs.
2. Validate site, ID, slug, wrapper and English source checksums.
3. Build a signed before/after plan from the accepted catalog.
4. Apply Page and TourProduct values inside one PostgreSQL transaction.
5. Re-read strict locale values and compare complete after-checksums.
6. Prove a repeated apply writes zero records.

## Interface Contract

Public routes remain unchanged:

- `/{locale}/journeys`
- `/{locale}/tour/{slug}?source=journeys`

Public locales remain `en`, `vi`, `es`, `it` and `pt`.

The validation contract must expose machine-readable counts by locale and
field group. A passing report requires:

- 22 complete titles, summaries, routes, CTA labels and metadata groups.
- Itinerary and service row counts equal to the English source manifest.
- Zero missing localized values.
- Zero forbidden English fallback matches.
- Zero locale accent/copy findings.

## Data Model

No schema migration is expected. The story repairs existing localized
PostgreSQL rows and hardens write behavior.

Maintenance scripts that update non-localized fields must snapshot the
localized editorial projection before and after mutation. A checksum change
outside the signed plan is a blocking failure.

Production artifacts:

- Encrypted pre-apply PostgreSQL backup and checksum.
- Signed restoration plan with before/after aggregate checksums.
- Apply, verify, idempotence and rollback reports.
- Strict locale audit before and after release.

## UI / Platform Impact

- Journeys cards stop using English title/summary fallback in translated
  locales.
- VI and PT price copy receives correct diacritics.
- EN, ES, IT and PT duration units use locale-aware singular/plural forms.
- Tour Detail regains localized product sections while keeping existing
  layout, filters, routing and media.

## Observability

Add structured release/audit output for:

- Locale, slug and field path of missing content.
- English-fallback and accent/copy findings.
- Before/after checksums and mutation counts.
- Canary and production route totals.
- Any blocked promotion reason.

Do not log customer data or production credentials.

## Alternatives Considered

1. Keep English fallback permanently. Rejected because it hides missing locale
   data and creates mixed-language pages.
2. Hide incomplete tours. Rejected as the primary solution because a single
   data regression could empty the translated discovery experience again.
3. Translate at runtime. Rejected because content has already been editorially
   approved and runtime machine translation is outside the product contract.
4. Restore data without adding guards. Rejected because the same maintenance
   write path could erase the repaired locales again.

