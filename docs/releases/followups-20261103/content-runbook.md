# Candidate content rehearsal and production preparation

Candidate: `E:\repo\WingsTravel\followups-20261102\candidate`, baseline `8efdbbf`.
Production has not been written, published or deployed.

## Local proof

Disposable PostgreSQL container `wings-followups-20261102-pg`, port55488, database `followups`.
All integration fixtures assert this exact local database before any seed operation.
`PAYLOAD_DB_PUSH=false`; do not run schema push against an existing environment.

From candidate `app/`, after loading the intended database credentials securely:

```powershell
pnpm run update:wingsgo:cta-hotline
pnpm exec tsx scripts/updateWingsGoCampaignHeading.ts
```

Both commands default to read-only dry-run. Review the published page/locale inventory, expected old values and pending draft work before apply. Public sitemap inventory found88URLs,4CTA pages and3old-primary pages (`/`, `/campaign`, `/thi-truong`). The public CMS API refused anonymous access, so authenticated production draft inventory remains a release step.

## Apply after release authorization

Follow `docs/runbooks/oracle-vps-arm64-deployment.md`, including a fresh encrypted backup/restore drill. Load credentials for the intended environment, verify its identity independently, and run dry-run there. This document does not authorize a production write.

Use a fresh, access-restricted journal path for each apply. Journals contain CMS content and must not be committed or shared publicly.

```powershell
pnpm run update:wingsgo:cta-hotline -- --apply --snapshot <fresh-cta-journal.json>
pnpm exec tsx scripts/updateWingsGoCampaignHeading.ts --apply --snapshot <fresh-heading-journal.json>
```

The updater obtains PostgreSQL row locks and refuses stale content, a different tenant/path, or pending editor work. Resolve conflicts with the editor, take a new plan and use a new journal; do not force overwrite or clear someone else's drafts.

CLI apply recomputes the plan, persists its journal with exclusive-create and fsync before writing, then verifies live content under the transaction. Keep the original journal unchanged even if the process fails after commit. Never reuse the same filename: `EEXIST` protects the original rollback information.

## Verify

Rerun both default dry-runs: CTA `pagesWithChanges=0`, heading `status=noop`. Read Payload published VI/EN plus latest drafts and compare the preserved secondary numbers, unrelated tenant documents, EN H1, H2 and shared media caption. Actual browser checks must confirm copy/label/tel, one exact VI H1, hidden campaign captions and retained control captions, video playback, CTA navigation and no overflow at390px.

Standalone scripts deliberately disable Next cache hooks. Content release must include the normal app cutover/restart and CDN cache invalidation in the deployment runbook; verify fresh uncached pages afterward. Do not assume a CLI success means ISR/CDN has refreshed.

The H1 tool accepts exactly one plain text H1 containing the approved old or new value. Unexpected or split formatting aborts for CMS review. No English translation is performed.

## Targeted rollback

```powershell
pnpm run update:wingsgo:cta-hotline -- --rollback <original-cta-journal.json>
pnpm exec tsx scripts/updateWingsGoCampaignHeading.ts --rollback <original-heading-journal.json>
```

Rollback validates the journal transformation and tenant/path, refuses editor drafts and subsequent changes to the target layout/hero, restores only the expected before value, and is safe to rerun. A prewrite journal with `planned` status also supports recovery after a crash immediately after commit. Roll back application code separately through the deployment runbook if required; no migration or schema rollback is needed for these follow-ups.

## Unverified outside local candidate

No authenticated production inventory, production apply/rollback, real telephone/Zalo/lead submission, Safari/iOS or physical-device test was performed. PostgreSQL process crash durability and disk loss were tested by journal failure injection and recovery logic, not by crashing production or the host.

## Production execution — 2026-11-03

The candidate-only statements above describe the earlier preparation checkpoint. Production CMS apply and deployment were explicitly authorized and completed on November3. Current release is `release-5b81a19`, code5b81a19d663f2f78a04d0e411fcfa0afbd416c4a; previous is `release-us093-8efdbbf`. See `PRODUCTION-REPORT.md` for exact image digests, backup/restore, browser and data comparison evidence.

Original immutable CMS journals remain protected on VPS under `/home/ubuntu/wings-travel/shared/artifacts/followups-642b857`. They must never be overwritten or committed. All556 page-locales across6sites were compared; only3expected locale changes and no media or unrelated draft changes. Rerun is noop.

### Application rollback

Use the existing deployment runbook: read `release-5b81a19/PREVIOUS_RELEASE` and `PREVIOUS_IMAGE_ID`, atomically repoint `current` to that validated release, then recreate only app with the previous compose plus `release-5b81a19/rollback-compose.yml` using the protected shared environment. Verify exact image and readiness. Do not restore the entire database for an application rollback. These follow-ups have no schema migration to reverse.

### Targeted CMS rollback

Only if rollback is required, use the immutable operations image associated with the original journals, `release-642b857/OPS_IMAGE_ID` (or the final operations image whose unchanged updater code is reviewed). Load the production environment securely, derive DATABASE_URL from POSTGRES credentials without printing it, connect to network `wingstravel_default`, set `PAYLOAD_DB_PUSH=false`, and mount the protected original artifact directory at `/app/artifacts/followups`.

Inside that operations container, run one command at a time:

```sh
pnpm exec tsx scripts/updateWingsGoCampaignHeading.ts --rollback /app/artifacts/followups/heading-apply.json
pnpm exec tsx scripts/updateWingsGoCtaHotline.ts --rollback /app/artifacts/followups/cta-apply.json
```

The original operations image includes the required source and dependencies. Review each command's output before continuing. The tools refuse subsequent editor changes, drafts, wrong tenant/path or tampered journal; resolve conflicts rather than force overwrite. Refresh normal application caches/restart through the runbook and verify public content afterward. Rollback was rehearsed on isolated PostgreSQL; production content rollback was not executed because delivery succeeded.

Fresh encrypted final-release backup and restore evidence is retained at `shared/backups/release-5b81a19-fd64d70e-d7f5-412d-8654-5542dfea5ffb`, with its mode600 key. The earlier pre-CMS backup is also retained. Database restore is a separate disaster-recovery action because it would discard newer leads/editor work.