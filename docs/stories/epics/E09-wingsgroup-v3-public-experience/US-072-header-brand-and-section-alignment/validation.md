# Validation

## Proof Strategy

Prove brand asset integrity and layout behavior separately. A green local build
does not approve brand artwork or a production asset import. The final report
must connect every rendered logo to its manifest entry and show before/after
geometry for all five section headers.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Five brand keys resolve primary, reverse and compact variants; dimensions/checksums/alt metadata are enforced; missing or cross-site assets fail closed. |
| Component | Logo renders the selected surface/variant and stable data attributes; parent/child fallback precedence is preserved; section headers expose unchanged IDs and top-aligned layout contract. |
| Integration | Site and locale context cannot select another tenant's logo; Payload-owned assets remain scoped and publication-gated when used. |
| E2E | `/` and `/en` show the correct parent header logo, five ecosystem identities and one each of the named section headers at 390/768/1024/1440px. |
| Platform | TypeScript, scoped ESLint, formatting, production build and image/asset integrity checks pass. |
| Performance | Logo files are bounded in bytes, use responsive dimensions and do not introduce layout shift or oversized header work. |
| Logs/Audit | Browser console is clean; screenshots record viewport, source/variant, measured box and no-overflow result; manifest approval/checksum evidence is retained. |

## Fixtures

- A deterministic brand-family manifest containing WingsGo, WingSide,
  WingsPass, WingsPlus and WingsCare primary/reverse/compact entries.
- WingsGroup light and dark header themes plus compact navigation fixtures.
- Localized `/` and `/en` homepage fixtures with the five IDs:
  `journey-inquiry`, `testimonials`, `proof`, `news` and `about`.
- A cross-tenant fixture proving a missing or foreign asset never renders.
- Desktop and compact browser viewports at 390, 768, 1024 and 1440px.

## Commands

Run from `app/` after implementation:

```text
pnpm exec vitest run --config vitest.unit.config.mts <logo-and-section-unit-files>
pnpm run test:component
pnpm exec eslint <changed-files>
pnpm exec tsc --noEmit
pnpm run build
agent-browser open https://<local-test-host>/
agent-browser screenshot output/playwright/us072-*.png
```

## Acceptance Evidence

Implementation and production evidence (2026-09-12):

- Implementation commit: `1e5d54e7bf6b8ee96cfb7c669b774abbb99401cd` on the isolated
  `us072-implementation` worktree at `/home/docker-admin/.codex-worktrees/us072-implementation`.
- Brand-family manifests and tight PNG masters cover WingsGo, WingSide, WingsPass,
  WingsPlus and WingsCare. Each manifest records dimensions, SHA-256, alt text,
  `doNotCrop`, `doNotUpscale`, transparent-canvas and provenance metadata.
- Parent WingsGroup header uses surface-aware `primary`/`reverse`/`mark` variants;
  compact navigation uses the mark export and the header link has a zero-line-height
  inline-flex box to prevent mobile clipping.
- Shared `.sectionHeader` and `.editorialArchiveHeader` are top aligned at desktop;
  compact widths retain block flow.
- `pnpm run test:component`: 25 files, 156 tests passed.
- Targeted logo unit/component suites: 4 files, 26 tests passed across the final
  targeted runs (the full component run includes the same coverage).
- Scoped ESLint on changed TypeScript/TSX: 0 errors, 0 warnings.
- `pnpm run build` with disposable local SQLite and non-production env: compiled,
  TypeScript, static generation (19/19) and standalone postbuild passed.
- `pnpm exec tsc --noEmit`: only pre-existing `tests/unit/redirects.unit.spec.ts`
  optional-value errors remain; no errors originate in the implementation files.
- Agent-browser local authenticated-style fixture (disposable SQLite) rendered `/`
  and `/en` at 390, 768, 1024 and 1440 px. All five IDs (`about`,
  `journey-inquiry`, `testimonials`, `proof`, `news`) occurred exactly once, no
  horizontal overflow was measured, the parent logo resolved from
  `wingsgroup-brand-kit` (`85.25x64` at compact widths; `90.58x68` at 1440),
  and no page errors were reported. Screenshots are in
  `output/playwright/us072-*.png`.
- Production deployment used an ARM64 image built from the exact implementation
  commit, tagged `wingstravel-app:us072-1e5d54e7`, image ID
  `sha256:1906f479e906ab917886067242ca7edf0359c5d2d3a2b5f5671d05427b22b771`,
  with `WINGSTRAVEL_RELEASE_SHA=1e5d54e7bf6b8ee96cfb7c669b774abbb99401cd`.
  The atomic release is
  `/home/ubuntu/wings-travel/releases/wingsgroup-us072-1e5d54e-20260912T151054Z`;
  the previous US-071 image is retained as
  `wingstravel-app:rollback-us072-20260912`.
- Post-switch health checks returned `status=ok` and `status=ready` with
  database/Redis up. All 25 production brand asset URLs returned HTTP 200; the
  five primary assets matched the source SHA-256 values. Production `/` and
  `/en` at 1440px show the parent asset at `373x280` natural size and
  `90.58x68px` rendered size, `data-logo-surface=header`, and all five named
  section headers exactly once with `align-items:flex-start`. The English
  capability route returned HTTP 200 with the approved English copy and no
  horizontal overflow at desktop.
- Production compact QA at 390px confirms the new logo renders at `85.25x64px`,
  the five section headers remain in block flow and top-aligned, and the
  Vietnamese homepage has no overflow. The first English production probe
  exposed a 13px overflow in the testimonial conversion-action row at this
  viewport; this was retained as a separately scoped responsive follow-up.
- Responsive follow-up hotfix commit `32cd54ea8c14feabe00a3d9f357a188142c1eae9`
  adds a compact-width rule that wraps the testimonial actions and gives each
  action a full-width row. The patch is isolated to
  `WingsGroupV3.module.css`; no unrelated dirty workspace files were included.
- The hotfix was built natively for ARM64 as
  `wingstravel-app:us072-32cd54e` (image ID
  `sha256:1b2a32561db82cbe28f895aafdea0643d6d9d3ffe84ab3796f732cb4d3cb1786`,
  revision label `32cd54ea8c14feabe00a3d9f357a188142c1eae9`) and switched
  atomically to `/home/ubuntu/wings-travel/releases/wingsgroup-us072-32cd54e-20260912T160246Z`.
  The prior US-072 release remains intact; rollback tag
  `wingstravel-app:rollback-us072-hotfix-20260912` was retained.
- Post-switch `/api/health/live` returned `status=ok`; `/api/health/ready`
  returned `status=ready` with database and Redis up. Docker image pruning
  reclaimed no dangling images and builder-cache cleanup reclaimed 1.718 GB;
  disk usage ended at 89% (5.1 GB free).
- Agent-browser production QA after the hotfix at 390px measured
  `scrollWidth=390` for the English homepage. The testimonial action row is
  `left=48`, `right=345`, `height=98px`, with both actions stacked inside the
  viewport; no page errors were reported. Vietnamese at the same viewport also
  measured no overflow. Desktop English at 1440px retained the `90.58x68px`
  parent logo, no overflow and top-aligned section headers. Screenshots are
  `output/playwright/us072-hotfix-en-390.png` and
  `output/playwright/us072-hotfix-en-1440.png`. The scrolled testimonial
  conversion banner is captured in
  `output/playwright/us072-hotfix-en-390-actions.png`.
- The English capability route remained HTTP 200 with English localized
  headings, the two-column service/quality content and no horizontal overflow;
  no CMS write, migration or Redis flush was performed for the hotfix.
- No production CMS write, migration or Redis flush was performed during the
  release; PostgreSQL/Redis volumes were preserved.

## Production logo/header restoration hotfix evidence — 2026-09-15

- A read-only production check found that the deployed parent logo still used
  the old wide transparent canvas and that the English home route did not
  receive the same v3 header shell as Vietnamese. This was a runtime/source
  release mismatch, not a CMS asset record requiring a database write.
- The hotfix restored the governed WingsGroup brand-kit assets from the
  approved implementation, including tight primary/reverse/mark exports and
  their manifest metadata. The header logo is now surface-aware and keeps the
  tight primary asset at the approved responsive dimensions.
- Production release `wingsgroup-logo-header-fix-20260915` was built
  successfully for ARM64 with image
  `sha256:8aeaf185789bfd9bfed80756d99725eeb7e2505d336de9cf395e02d93ace65d0`.
  The current target is
  `/home/ubuntu/wings-travel/releases/wingsgroup-logo-header-fix-20260915`;
  rollback tag `wingstravel-app:rollback-wingsgroup-logo-header-fix-20260915`
  is retained.
- Production `/` and `/en` at 1440px render the same visible parent logo
  (`373x280` natural asset, `90.58x68px` rendered box), the same v3 header
  class, and aligned navigation. At 390px both locales render the logo at
  `85.25x64px`, retain the mobile menu, and have no horizontal overflow or
  browser errors.
- `/api/health/live` and `/api/health/ready` returned HTTP 200 after cutover.
  No production CMS write, database schema change, migration or Redis flush
  was performed. The prior runtime was not needed for rollback.

## Production brand provenance hotfix evidence — 2026-09-17

- The focused unit failures were caused by stale `sourceManifestSha256` values
  in the deployed WingsGo/WingSide public manifests and a stale shell
  source-contract expectation. The runtime assets themselves were intact.
- The production hotfix was based on the active release
  `wingsgroup-full-e95b99a-20260916`, with only the two public manifest
  provenance values changed in the derived ARM64 image
  `sha256:8d0b9e0ce2cc4249f215939ec4d123824baedaf6071a1155d75b108e56cffe46`.
  The current target is
  `/home/ubuntu/wings-travel/releases/wingsgroup-brand-provenance-hotfix-20260917T065200Z`;
  rollback tag `wingstravel-app:rollback-wingsgroup-brand-provenance-hotfix-20260917T065200Z`
  preserves the prior image `sha256:6aae8a1004e331e1a8aa3776fa7619ea934ff52e1ac73b419b98fa0845b49af8`.
- Post-cutover `/api/health/live`, `/api/health/ready` and all six public
  domains returned HTTP 200. Public WingsGo/WingSide manifest requests returned
  HTTP 200 with the canonical provenance hashes; PostgreSQL and Redis container
  IDs were unchanged.
- Agent-browser production proof passed at 1440px/390px for WingsGroup and
  390px for WingsGo/WingSide: one H1, no horizontal overflow, light theme,
  correct tenant logos and no browser/console errors. Screenshots are in
  `output/playwright/production-brand-provenance-*.png`.
- The repository go-live pipeline could not start because its local Playwright
  Chromium executable is not installed; this does not invalidate the completed
  agent-browser proof. No CMS write, schema change, migration or Redis flush
  occurred.
