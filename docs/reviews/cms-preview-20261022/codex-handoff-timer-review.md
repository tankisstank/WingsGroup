No confirmed P1/P2/P3 findings in commit `0701404b550f65447fb5b21692c7ec44fa6f1bb5`’s two-file diff.

- Top-level script queues one deferred `form.submit()` after the form exists.
- Auth, tenant access, signed handoff, POST method, and hidden grant protections are unchanged.
- Actual response HTML JSDOM test passes: scheduled state, no synchronous submission, then submission of the exact form.

Verification from `app/`:

```text
pnpm exec vitest run --config vitest.unit.config.mts tests/unit/localPreviewRoute.unit.spec.ts --reporter verbose
```

**Exit 0 — 11/11 tests passed.** Initial invocation used the default integration config and found no tests; corrected command above succeeded.

No edits, deploy, or subagents. Browser startup/navigation remains unproven; the test intercepts timers and mocks submission.