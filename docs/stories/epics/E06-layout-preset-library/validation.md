# Validation

## Expected Proof

| Layer | Proof |
| --- | --- |
| Unit / integration | Registry uniqueness and preset-generated block snapshots. |
| Type | `payload generate:types`, `tsc --noEmit`. |
| Lint | ESLint with no new errors. |
| E2E | Page Wizard opens and can create a draft from a preset. |
| Build | Production build completes. |
| Migration | PostgreSQL migration includes layout/preset fields and excludes duplicate hero migration changes. |

## Evidence

- 2026-06-16: `pnpm run generate:types` passed after adding the layout preset blocks and optional preset-generated hero media.
- 2026-06-16: `pnpm run test:int` passed 10 files / 43 tests.
- 2026-06-16: `pnpm exec tsc --noEmit --pretty false --incremental false` passed.
- 2026-06-16: `pnpm run lint` passed with 5 pre-existing warnings in `ThemePresetEditor/PreviewField.tsx` and `20260614_142513.ts`.
- 2026-06-16: `pnpm run test:e2e` passed 38 tests, including Page Wizard draft creation from the Campaign launch preset.
- 2026-06-16: `pnpm run build` passed, including `next-sitemap` and `scripts/prepare-standalone.mjs`.
