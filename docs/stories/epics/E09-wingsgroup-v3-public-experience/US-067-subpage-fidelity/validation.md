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
