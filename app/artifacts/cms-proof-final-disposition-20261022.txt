Resolved. Verified:

- Stale hub mock uses `pathname: '/tour'`.
- Recovery scenario `lost-create-response-recovery-failure` expects `cleanupVerified: false`.
- Command passed: `pnpm exec vitest run --config vitest.unit.config.mts ...`
- Result: **2 files passed, 20 tests passed**.

Skipped rechecking production logs and broader repository state per scope.