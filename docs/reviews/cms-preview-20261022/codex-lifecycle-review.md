**Not approved: two confirmed findings.**

- **P1 — Login redirects can expose credentials.** [Runner:53](/E:/repo/WingsTravel/app/scripts/cms-production-lifecycle-proof.ts:53) uses fetch’s default redirect behavior. A cross-origin HTTP 307/308 can forward the login POST body containing the admin password despite the fixed initial CMS origin. Reject redirects for authenticated CMS requests.

- **P2 — Committed creates can escape cleanup without an ID.** [Runner:239](/E:/repo/WingsTravel/app/scripts/cms-production-lifecycle-proof.ts:239), [271](/E:/repo/WingsTravel/app/scripts/cms-production-lifecycle-proof.ts:271), and [287](/E:/repo/WingsTravel/app/scripts/cms-production-lifecycle-proof.ts:287) record IDs only after successful responses. If creation commits but its response fails, `finally` skips the unknown ID and the error evidence cannot identify that leftover fixture. Add ownership-safe reconciliation for ambiguous create/provision failures.

**Verification:** `pnpm exec vitest run tests/unit/cmsProductionLifecycleProof.unit.spec.ts` initially excluded the file. Rerunning through Vitest’s API with isolated configuration: **14/14 passed, exit 0**.

Reviewed only the three requested files; no edits, network mutations, or subagents. Real API hook behavior was not verified; the passing mocks do not cover these two failure paths.