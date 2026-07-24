# Validation

## Proof Strategy

The feature is done when role-specific CMS surfaces work in browser tests and existing multisite/content flows remain green.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Existing role/site helper coverage remains green. |
| Integration | Existing site access tests remain green. |
| E2E | Console loads, wizard link works, role-sensitive links are visible/hidden, public routes remain green. |
| Platform | Build succeeds and standalone start script is documented. |
| Performance | Not separately measured; console queries use small limits and existing Payload counts. |
| Logs/Audit | Browser console checked in Playwright manual audit. |

## Fixtures

- Seeded users from `seedPhase1Launch`.
- Seeded sites: WingsTravel, WingsGo, WingSide, WingsPlus, WingsCare, WingsPass.
- Seeded pages/posts/forms/submissions from local e2e helpers.

## Commands

```text
pnpm exec tsc --noEmit
pnpm run lint
pnpm run generate:importmap
pnpm run build
pnpm run test:int
pnpm run test:e2e
```

## Acceptance Evidence

- 2026-05-29 `pnpm exec tsc --noEmit` passed.
- 2026-05-29 `pnpm run lint` passed.
- 2026-05-29 `pnpm run generate:importmap` passed.
- 2026-05-29 `npm run build` passed outside sandbox after Windows EPERM on `.next`.
- 2026-05-29 `pnpm run test:int` passed 8 files / 30 tests.
- 2026-05-29 `pnpm run test:e2e` passed 18 tests.
- 2026-05-29 Playwright manual audit opened `/admin/console`, `/admin/collections/form-submissions`, and `/admin/collections/imports`; no browser console errors.
