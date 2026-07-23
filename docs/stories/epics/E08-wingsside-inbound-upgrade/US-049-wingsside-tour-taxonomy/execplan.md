# Exec Plan

## Goal

Create a governed taxonomy contract and classify the existing 22 WingsSide
BestPrice tours without changing public Home rendering yet.

## Risk Classification

Lane: `high-risk` because the work changes shared `TourProducts`, generated
types, database schema and imported production-shaped content.

## Work Phases

1. Audit the 22 records and current schema on SQLite and PostgreSQL-shaped test data.
2. Finalize field shape and stable vocabulary.
3. Add migration, collection fields, access/filter behavior and generated types.
4. Create validator and dry-run backfill tooling.
5. Complete and approve `data-map.md`.
6. Apply locally, prove idempotence and test multisite isolation.
7. Run typecheck, unit, integration, migration smoke and build.
8. Update Harness/Plane proof; leave production frozen.

## Stop Conditions

- More or fewer than 22 target records resolve for the locked batch.
- A target wrapper belongs to another site.
- Taxonomy cannot be justified from itinerary/source evidence.
- Migration would delete or rewrite existing product content.
- Production apply is requested without backup and release approval.

## Handoff To US-050

US-050 may start UI wiring only after schema migration passes and the local
22-tour data set has no blocking taxonomy gaps.
