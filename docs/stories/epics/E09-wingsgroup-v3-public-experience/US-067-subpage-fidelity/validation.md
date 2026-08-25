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
