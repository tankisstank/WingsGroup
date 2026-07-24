# Design

## Domain Model

Extend `TourProducts` with controlled multi-value `select` fields:

- `destinationTags`: the six Home keys plus governed extended keys required by
  the actual 22-tour inventory;
- `travelStyles`: Luxury, Family, Culture, Adventure, Wellness, Romance,
  Business;
- `taxonomyProvenance`: read-only mapping revision and evidence.

Select arrays are the chosen wave-1 design. The vocabulary is small and locked,
so a separate taxonomy collection would add lifecycle and access complexity
without a current editor requirement. The six Home-card keys remain `hanoi`,
`halong`, `hoian`, `hue`, `mekong`, and `sapa`; extended keys describe real
inventory without creating more Home cards. A generic free-form `tags` field is
rejected.

## Provenance

Backfill records should retain enough evidence to answer:

- which batch and TourProduct was changed;
- which mapping revision assigned the values;
- whether assignment came from imported evidence or editorial confirmation;
- whether an exception remains open.

Do not overwrite `sourceProvenance` supplier facts with editorial taxonomy.
Store taxonomy audit metadata separately if needed.

## Mapping And Apply Flow

1. Export the 22 current records by stable ID, source ID and wrapper slug.
2. Fill `data-map.md` with proposed taxonomy and evidence.
3. Run validator; block unknown keys, duplicate IDs and cross-site records.
4. Produce dry-run JSON/Markdown.
5. Obtain editorial sign-off by approving mapping revision
   `us-049-v1-20260724`.
6. Apply within the WingSide site and BestPrice batch scope. The CLI refuses
   apply/rollback without that exact approval revision and refuses PostgreSQL
   or production execution in this implementation tranche.
7. Re-run dry-run and require zero planned mutations.

## Migration

- Add a forward PostgreSQL migration and a compatible local SQLite schema path.
- Do not use production schema push.
- Migration rollback must remove only new taxonomy structures, not tour data.
- Generated Payload types and import map are updated intentionally.

## Query Contract

Queries filter by site, publication status and stable taxonomy key. Sorting is
explicit and deterministic. Runtime must never infer tags from title/summary.

## Risks

- Incorrect editorial mapping presents a tour under the wrong promise.
- Broad updates could modify WingsGo records.
- Local SQLite success may hide PostgreSQL migration issues.
- Uncontrolled tag vocabulary creates duplicates and translation drift.
