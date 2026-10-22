**Approval for the scoped diff: no confirmed P1/P2/P3 findings.** Deployment/browser acceptance remains conditional.

Verified:

- Signed 60-second expiry and exact tenant/path/locale/collection checks remain intact.
- Next’s bypass cookie value is retained; production attributes include `HttpOnly; Secure; SameSite=None; Partitioned; Path=/`, without `Domain`.
- Published handoff expires the partitioned bypass; exit expires the partitioned bypass, v2 grant, and legacy grant.
- Authorization and frame-policy readers use the new name without legacy fallback. Framing authorization logic is unchanged.

**Test command**, from `app/`:
```powershell
pnpm exec vitest run --config vitest.unit.config.mts tests/unit/previewHandoffRoute.unit.spec.ts tests/unit/previewHandoff.unit.spec.ts
```
**Result:** exit 0; 2 files, 13 tests passed. The initial command omitted the unit config and discovered no tests.

Serialization tests show one cookie per name with `Partitioned` in the test response store. They mock Next’s cookie/redirect plumbing, so **final outgoing response serialization is not yet proven**.

No edits, deployment, subagents, or AGY runner review. Ordinary public framing headers were outside this diff.
Browser verification remains pending after deployment: initial `ERR_BLOCKED_BY_RESPONSE` and supplied-cookie draft rendering do **not** establish browser acceptance; prove actual iframe handoff, draft, expiry/rejection, legacy coexistence, and exit.