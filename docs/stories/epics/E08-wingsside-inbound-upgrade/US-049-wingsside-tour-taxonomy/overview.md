# US-049: Add WingSide tour taxonomy and classify imported tours

## Current Behavior

The 22 published WingSide BestPrice imports have structured tour detail data,
but `TourProducts` has only a broad `market` value for discovery grouping. It
does not expose governed destination or travel-style taxonomy, so Home and hub
pages cannot select real tours by Hanoi, Ha Long, Luxury, Family, or the other
approved categories.

## Target Behavior

WingSide tour products have controlled, site-aware destination and travel-style
classification. The imported 22-tour batch is backfilled through a reviewed,
idempotent mapping and becomes queryable without parsing titles at runtime.

## User Story

As a WingSide content editor, I want every imported tour classified by its real
destinations and travel styles so that I can filter, select, and feature tours
consistently across Home and discovery pages.

## Acceptance Criteria

1. `TourProducts` supports multiple controlled destination and travel-style keys.
2. Stable keys are stored independently from localized display labels.
3. The fields are editable in Payload and visible in useful admin columns or filters.
4. The 22 BestPrice records receive a reviewed mapping; no record is classified
   by frontend title matching.
5. Every eligible tour has at least one destination and one travel style.
6. Dry-run reports planned changes, missing records, conflicts and exceptions.
7. Apply is site- and batch-scoped, rollback-safe and idempotent.
8. PostgreSQL migration/CRUD and multisite isolation tests pass.
9. No WingsGo or non-WingSide `TourProduct` changes.
10. Production is not mutated as part of story implementation without a separate
    approved deploy plan.

## Affected Users

- WingSide content editors and planners.
- Developers wiring Home and hub discovery.
- Reviewers validating the 22 imported tours.

## Dependencies

- US-045 BestPrice 22 import baseline.
- Existing `TourProducts` and wrapper-page contracts.
- Editorial review of `data-map.md` before apply.

## Non-Goals

- Home card rendering; owned by US-050.
- Generic free-form tags.
- AI classification at public request time.
- Importing additional suppliers or tours.

## Implementation Status

Schema, generated types, tenant-scoped query helper, additive PostgreSQL
migration, SQLite bootstrap parity, reviewed technical map, guarded
dry-run/apply/rollback tooling and automated proof are implemented. The
2026-07-24 dry-run against a copy of the 22-tour local database reports
`changed=22`, `unchanged=0`, with zero missing mappings, missing records,
conflicts or exceptions and no data mutation.

Editorial and PM sign-off on mapping revision `us-049-v1-20260724` was
received from the project owner on 2026-07-24. The approved plan was applied
to the local WingSide database and verified at the expected `after` state.
Production was not mutated.
