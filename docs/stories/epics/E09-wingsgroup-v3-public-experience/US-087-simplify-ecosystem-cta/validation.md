# US-087 — Validation

## Planned Proof

| Layer | Required cases |
| --- | --- |
| Unit | Five removed fields absent; valid HTTPS works without evidence; malformed/insecure URLs rejected in CMS/runtime; legacy slug and contact fallback preserved |
| Component | WingsPlus CTA renders configured label and HTTPS href with no evidence; selected-brand behavior unchanged |
| Integration | No destructive schema operations; generated types match config; historical columns nullable and left intact |
| Platform | Targeted ESLint and TypeScript checks; record existing unrelated failures separately |
| Review | Independent Codex planning findings recorded and resolved |
| Tracking | Harness and scoped Plane US/children have correct Epic, status and dates |

## Acceptance Evidence — 2026-10-26

Packet and Harness planned record were created before code changes; Plane import had 1 US and 5 children. Implementation followed the planning consultation. Existing unrelated media/lazy-loading and tab-copy changes in the workspace were preserved.

Run from `app/`:

```powershell
$env:PAYLOAD_SKIP_LOCAL_SQLITE_REPAIR='true'
$env:PAYLOAD_DB_PUSH='false'
pnpm run generate:types
pnpm run test:unit -- tests/unit/wingsGroupV3Foundation.unit.spec.ts tests/unit/wingsGroupV3PublicModel.unit.spec.ts
pnpm run test:component -- tests/component/wingsGroupV3Homepage.component.spec.tsx
pnpm run test:int -- tests/int/wingsGroupV3Foundation.int.spec.ts
pnpm exec eslint src/blocks/WingsGroupEcosystem/config.ts src/components/WingsGroupV3/model.ts src/components/WingsGroupV3/EcosystemExplorer.tsx src/utilities/isSafeHTTPSURL.ts tests/unit/wingsGroupV3Foundation.unit.spec.ts tests/unit/wingsGroupV3PublicModel.unit.spec.ts tests/component/wingsGroupV3Homepage.component.spec.tsx
pnpm exec tsc --noEmit --incremental false
```

- Type generation: exit 0; exactly 10 removed lines (5 document fields and 5 select fields), no other generated changes.
- Unit: exit 0, 52/52 tests, started 22:11:23 local. Includes CMS/runtime parity for 18 valid/invalid URLs and removed-field/enum checks.
- Component: exit 0, 27/27 tests, started 22:11:21 local. WingsPlus website CTA has correct label/href without evidence; uppercase HTTPS uses external link, then selecting WingsGo restores contact fallback.
- Integration foundation: exit 0, 11/11 tests, started 22:12:55 local. Existing Page registration, governance and tenant boundaries pass. This suite is not a database save/read/version-restore roundtrip.
- ESLint: exit 0, 0 errors, 8 pre-existing no-explicit-any warnings in unchanged parts of the foundation unit file.
- TypeScript: exit 0, no output.
- `git diff --check`: exit 0.
- Final independent review: SHIP LOCAL, no concrete P1/P2/P3 findings. Planning findings and residual rollout checks recorded in audit.md.

## Open Acceptance and Limits

CMS browser save and disposable PostgreSQL save/read/version restore have not been exercised. Existing website-mode CTA URLs may become active once the evidence gate is removed; inventory destinations before any rollout. No production CMS changes, migrations, build, deployment or publication performed. Harness remains in_progress with unit/integration/platform proof; E2E proof remains 0. Plane must show Chờ xác nhận, not released or accepted.

## Tracking

Scoped commands: PLANE_STORY_IDS=US-087; plane:preview, plane:import:history, plane:sync:workitems. Final counts/dates and hierarchy are checked by `ecosystem-cta-simplification-20261026/verify-plane.mjs` after synchronization.

- plane:preview: exit 0, 1 story / 5 children.
- plane:import:history: exit 0. Plane plan limitations for initiatives/types and archived sibling projects were reported; existing E09 work-item hierarchy is usable.
- plane:sync:workitems: exit 0, patchedCount=6, missingCount=0.
- Read-back API verification at 2026-10-26T15:18:10Z: correct Core project and E09 parent; 5 children, 0 missing dates, 0 generic child names; all six titles under 80 characters and state Chờ xác nhận.
- Owner c0508g assigned to all six items; feature label applied. Story start_date=2026-10-26, target_date=2026-10-30 (review target); five child dates=2026-10-26.
- Harness: US-087 in_progress, unit=1, integration=1, e2e=0, platform=1; correct overview.md contract path. This deliberately does not claim completed acceptance or delivery.

## Production integration under US-088 — 2026-10-27

The bounded US-087 application delta was deployed with US-088 final release8a0e470 to allow the authorized WingsGroup homepage CTA update. Five evidencefields are absent from the production editor; strict HTTPS validation and historical nullable columns remain. Production Payload save of homepage191 completed without fabricated evidence; published and latestdraft were preserved in two locales except the explicit WingsPlus copy/CTA and necessary invalidCareproof repair. Real browser homepageWingsPlusCTA opens the Group introduction. Backuprestore to disposablePostgreSQL and contention/recoverytests passed; see US088audit/validation and wingsplus-on-wingsgroup-20261027.

This supersedes the earlier statement that the change was localonly. Independent browsereditorSave/versionRestore QA for US087 has not been completed; the story remains in_progress with partialproof. No DROP/schema migration or unrelated versionrestore was performed. User acceptance is not claimed.
