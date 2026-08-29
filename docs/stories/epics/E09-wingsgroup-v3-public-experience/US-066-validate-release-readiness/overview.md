# US-066: QA SEO và release readiness WingsGroup v3

## Status

in_progress

## Lane

high-risk

## External Tracking

- Multica: `WIN-34`, child of `WIN-20`.

## Current Behavior

Production has been promoted and the public smoke confirms the Vietnamese and
English route inventory, sitemap, five-service explorer, form surface and safe
consultation chooser. The approved Zalo OA has direct-contact and dialog smoke
evidence; WhatsApp, Messenger, proof and deep links remain safe fallbacks rather
than published claims.

## Target Behavior

WingsGroup v3 has an evidence-backed release decision covering application
tests, PostgreSQL migration/data rehearsal, responsive browser QA,
accessibility, tenant SEO, links, media rights, forms, security, observability,
canary, rollback, and all US-060 gates.

## User Story

As a release reviewer, I want one reproducible readiness packet so that a
WingsGroup promotion is based on verified production contracts rather than UI
completion or optimistic tracker status.

## Acceptance Criteria

- Run lint, typecheck, unit, component, integration, E2E, build, and relevant migration/data checks with recorded results.
- Pass responsive visual and overflow review at 360, 390, 430, 600, 768, 820, 1024, 1366, 1440, and 1920px.
- Verify every public route, locale, internal link, ecosystem destination, form state, and consultation channel state.
- Verify complete Vietnamese and English route/chrome/metadata inventories and English editorial quality against the approved tone.
- Prove WingsGroup-only canonical, robots, sitemap, hreflang, structured data, and analytics context.
- Verify media alt, source, rights, site scope, derivatives, and performance budget.
- Confirm every mandatory US-060 release gate is approved; non-blocking pending
  gates remain in their documented fallback state.
- Complete PostgreSQL backup/restore, rollback, authorized lead-path check and
  post-promotion monitoring before operational acceptance is closed.
- Record an explicit GO/NO-GO decision without changing status to delivered or complete on partial proof.

## Affected Product Docs

- `docs/product/wingsgroup-v3-public-experience.md`
- `docs/product/go-live-review-pipeline.md`
- `docs/product/phase-1-launch-readiness.md`
- `docs/product/acceptance-and-kpis.md`

## Dependencies

- US-060 through US-065 implemented with current evidence.
- Explicit authorization before production promotion or real provider tests.

## Non-Goals

- Fixing unrelated tenant defects inside the QA story.
- Sending real leads without approval.
- Treating staging or local proof as production acceptance.
