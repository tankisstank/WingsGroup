# US-061: Xây nền dữ liệu Payload cho WingsGroup v3

## Status

in_progress

## Lane

high-risk

## External Tracking

- Multica: `WIN-29`, child of `WIN-20`.

## Current Behavior

The shared platform already has sites, site settings, pages, media,
localization, forms, and site-scoped access. The v3 experience needs structured
hero, ecosystem, proof, consultation, and governed media fields that are not
yet confirmed as complete for WingsGroup.

## Target Behavior

WingsGroup v3 content is represented through typed, localized, site-scoped
Payload fields and blocks. Supplied media is imported with governance metadata,
and all schema/data changes have additive PostgreSQL rehearsal and rollback
proof.

## User Story

As a WingsGroup editor, I want the v3 experience represented by governed CMS
fields so that routine content and media changes do not require frontend code
or bypass tenant controls.

## Acceptance Criteria

- Confirm or create the WingsGroup site record, canonical domain, Vietnamese-and-English locale policy, and local alias.
- Configure site settings for branding, navigation, contact, metadata, and consultation-channel states.
- Provide typed structures for hero, ecosystem profiles, proof publication state, editorial content, and contact intake.
- Import all 13 handoff images with Vietnamese and English alt, source/provenance, confirmed rights, site scope, and responsive derivatives before publish.
- Keep non-publishable proof and unapproved media fail-closed.
- Preserve site-manager/editor access scope for every new or changed field.
- Pass additive PostgreSQL migration, rollback, idempotence, and generated-type checks.

## Affected Product Docs

- `docs/product/wingsgroup-v3-public-experience.md`
- `docs/product/multisite-platform.md`
- `docs/product/page-composer-and-landing-pattern.md`
- `docs/product/editorial-operations.md`

## Dependencies

- US-060 release-gate states and field semantics.

## Non-Goals

- CRM, chatbot, booking, or payment models.
- Arbitrary HTML/CSS/JavaScript fields.
- Publishing unapproved media or proof.
