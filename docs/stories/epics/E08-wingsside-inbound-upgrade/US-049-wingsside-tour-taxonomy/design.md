# Design

## Domain Model

Extend `TourProducts` with controlled multi-value fields:

- `destinationTags`: Hanoi, Ha Long, Hoi An, Hue, Mekong, Sapa;
- `travelStyles`: Luxury, Family, Culture, Adventure, Wellness, Business.

Implementation may use select arrays for the locked wave-1 vocabulary or a
site-scoped taxonomy collection if reuse/addition requirements justify it. The
final schema decision must preserve stable keys, generated Payload types and
same-site access control. A single generic free-form `tags` field is rejected.

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
5. Obtain editorial sign-off.
6. Apply within the WingsSide site and BestPrice batch scope.
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
