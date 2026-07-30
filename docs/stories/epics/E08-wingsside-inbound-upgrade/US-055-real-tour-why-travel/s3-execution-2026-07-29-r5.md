# US-055 S3 production-gate report — run R5

## Decision

- Project-owner production authority: **granted on 2026-07-29**.
- Independent combined WP6 verdict: **HOLD**.
- D7-A status: **blocked before mutation**.
- Production apply, deployment, canary and promotion: **not performed**.
- Candidate code SHA:
  `ef729d768e6d6f01049374f04f20491fb3ea0b76`.
- Production baseline release:
  `fadd22c68de26d0c1fdd281d77bac58b25f12625`.

The production approval satisfies the human-authority gate. It does not waive
the release-quality and safety dependencies defined in WP6 and D7-A.

## Combined WP6 review

An independent reviewer reproduced the required substitution, wrong-target,
stale/replay, self-approval, row-loss, locale-fallback and adverse-media
attacks. Twelve focused test files and 145 tests pass. The R4 lifecycle,
journal, E2E specifications and exact checksums remain internally consistent.

WP6 nevertheless returns `HOLD` because three P0 gates are red:

1. D4-C retains 220 watermark-positive hashes and zero accepted faithful
   replacements.
2. No protected ownership, license or publication approval artifact exists.
3. No exact production-target backup, restore drill, signed apply/rollback
   package and protected target proof is frozen for the candidate release.

Reviewer report:

- path:
  `C:\Users\VIETD\AppData\Local\Temp\multi-model-agent-orchestrator\wingsside-us055-r5-wp6-combined-report.json`;
- SHA-256:
  `fa5743395b389344b0f817f287452b16f297bf9da3fd2509333f37251ed1efc5`;
- schema: valid;
- release verdict: `HOLD`.

## Independent D4-C gate

The independent media review confirms:

- 586 unique source hashes;
- 366 clean and 220 watermark-positive hashes;
- 221 positive references affecting 21 of 22 tours;
- five affected `heroMedia` references and 216 affected gallery references;
- four rejected near-duplicate candidates;
- zero accepted outputs and zero candidate mappings;
- current candidate map is no-write with `productionWrite=false`; and
- no ownership, license, publication or production-safe media apply/rollback
  manifest.

Removing positive references from the current release is not a safe shortcut.
It would contradict the approved retain-and-remove direction and break the WP2
completeness/WP4 exact media-manifest contract. Such a change requires a new
scope decision, new exact plan and a fresh rehearsal.

Media reviewer report:

- path:
  `C:\Users\VIETD\AppData\Local\Temp\multi-model-agent-orchestrator\wingsside-us055-r5-media-gate-report.json`;
- SHA-256:
  `22e07faa5f901efb00ff38bd0a60ceb957e5b771a838afdac0a0927f94dc64fe`;
- focused validation: 3 files / 31 tests pass;
- verdict: `HOLD`.

## Production preflight facts

Read-only probes establish:

- VPS hostname: `instance-20260604-2317`;
- current release link:
  `/home/ubuntu/wings-travel/releases/wingsside-us054-fadd22c`;
- current release SHA:
  `fadd22c68de26d0c1fdd281d77bac58b25f12625`;
- application container is running;
- PostgreSQL 16 and Redis 7 containers are healthy;
- candidate SHA `ef729d7...` is not present on `origin`;
- the production environment does not yet contain the protected US-055
  release, catalog, plan, backup-manifest, restore-evidence or rollback
  bindings required by the write guard;
- the backup directory contains existing artifacts, but no US-055
  production-target restore-drill evidence was found.

The pre-canary public Home baseline returns HTTP success, one H1, one form,
the correct canonical and no horizontal overflow. It still shows the prior
static Why Travel links, confirming that US-055 has not been deployed.

D7-A preflight report:

- path:
  `C:\Users\VIETD\AppData\Local\Temp\multi-model-agent-orchestrator\wingsside-us055-r5-d7a-preflight-report.json`;
- SHA-256:
  `5565358084f24dd31fb8114f0c6d9969d70ac76601a53e328f2a1578345e147e`;
- schema: valid;
- verdict: `BLOCKED`.

Baseline screenshot:

- local path:
  `E:\TEMP\us055-r5-production-baseline\home-en-before.png`;
- SHA-256:
  `cc4b3f571827d6c6c9bcc4a31a5fd429427b881687cd3b69ef4bdc746823e42e`.

## D7-A stop decision

D7-A explicitly depends on WP6 `SHIP`. Because WP6 returned `HOLD`, the leader
stopped before:

- creating or applying a production editorial plan;
- mutating the production database;
- building or deploying a candidate release;
- switching canary or production traffic; or
- promoting the release.

This is a successful fail-closed production gate, not a failed deployment.

## Required recovery path

Before D7-A can resume:

1. provide faithful clean replacements for all 220 positive hashes, or approve
   a newly scoped complete clean-media plan;
2. provide protected ownership/license/publication evidence;
3. regenerate and rehearse the exact media-bound catalog;
4. rerun combined WP6 and obtain `SHIP`;
5. publish the immutable candidate release SHA;
6. freeze the exact production target, encrypted backup, restore drill, signed
   plan and rollback release; and
7. then execute D7-A canary, green observation window and separately gated
   promotion.
