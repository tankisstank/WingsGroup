# Validation

## Proof Strategy

Prove the presentation system, content contract and route behavior separately;
an implementation build is not approval to publish content or deploy.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Corporate content contract requires correct route/locale/archetype data and governed hero-media references. |
| Component | Header, breadcrumb, editorial rail, archetypes, service rows and archive preserve required accessible landmarks and CMS data use. |
| Integration | WingsGroup page/post/media queries remain site- and locale-scoped; external deep-links and proof remain fail-closed. |
| E2E | Desktop and mobile public routes resolve, the consultation CTA lands once on the contact form, and no horizontal overflow or development controls appear. |
| Platform | Production build and static type/lint/format checks pass. |
| Release | Separate approval is required for content import, deployment, cutover and production smoke. |

## Fixtures

- The approved 13-asset WingsGroup media manifest with VI/EN alt and provenance.
- Published, site-scoped WingsGroup Posts in both supported locales.
- Safe pending external consultation and ecosystem-link configuration.

## Commands

Use focused project tests first, then `pnpm lint`, Prettier check, TypeScript and
`pnpm build`. Browser review uses `agent-browser` against a local production
build; no production endpoint is modified.

## Acceptance Evidence

Populate after independent review with the accepted commit SHA, exact commands,
browser screenshots and report checksums.

## Worker Validation Record — 2026-08-25

This is implementation-worker evidence only; it is not independent approval.

- Focused unit coverage: 6 files, 42 tests passed.
- Focused component coverage: 3 files, 19 tests passed.
- Focused corporate-route integration: 14 tests passed.
- `pnpm exec tsc --noEmit`: passed.
- `pnpm lint`: passed with 0 errors and 176 existing warnings.
- Prettier check on changed files: passed.
- `pnpm exec next build --webpack`: passed, including static generation of 17/17 pages.
- Default `pnpm build`: environment-blocked because the repository-local `node_modules` symlink points outside the checkout root; the linked checkout was not modified.
- Browser review: no screenshots recorded. A fresh disposable seed was blocked by the governed media fixture `wingsgroup-vietnam-discovery.png`; an older disposable snapshot also required a schema migration that failed in the existing migration API. No production endpoint or CMS data was modified.

## P1 Correction Validation — 2026-08-25

This corrective pass resolves the two P1 findings from the independent review
of commit `4076b97c0bb4ca46c9a248d96aa3fdc489af3e69`.

- Every public media-led V3 route now supplies a primary hero destination that
  exists on that route or safely leads to `/lien-he#contact-form`; only the
  ecosystem route retains `#ecosystem`.
- Production inventory verification now compares every expected `page.hero`
  media relation with the persisted relation and the verified WingsGroup
  published-media inventory. Missing, mismatched, cross-site and unpublished
  relations fail closed.
- Focused importer checks: 2 tests passed (hero destinations plus valid,
  missing, mismatched, cross-site and unpublished hero-media evidence).
- Focused regressions: 42 unit tests, 19 component tests and 14 integration
  tests passed.
- `pnpm exec tsc --noEmit`, `pnpm lint`, Prettier check and
  `pnpm exec next build --webpack` passed.
- The full standalone importer-spec run still has one pre-existing idempotent
  write-count assertion failure (`30` observed versus `40` expected); it is
  unchanged by this correction and outside the two P1 changes. It remains a
  follow-up test-maintenance item, not evidence for browser fidelity.
- Browser evidence remains pending because the clean clone does not contain a
  usable governed 13-media preview fixture. No production import, deployment
  or cutover was run.
