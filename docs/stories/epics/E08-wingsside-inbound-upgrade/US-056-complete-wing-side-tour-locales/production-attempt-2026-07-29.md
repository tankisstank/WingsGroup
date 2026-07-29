# US-056 production execution attempt — 2026-07-29

## Result

Production promotion was stopped by the canary safety gate and restored from
the pre-apply backup. The live application remains on the previous release;
no US-056 full promotion was made.

## Completed safely

- SSH used the documented key from `docs/accounts.md`.
- VPS preflight passed; current release before the attempt was `f39707a`.
- Encrypted PostgreSQL backup created:
  `wingside-us056-preapply-20260729T101133Z.dump.age`.
- Backup manifest matched database `wingstravel`, filename and checksum.
- Restore drill passed into `wingstravel_us056_restore_20260729` with
  `status=ok`, 6 active sites and 71 tour records.
- Release images for the US-056 importer were built successfully in isolated
  image tags; the `current` symlink and production app image were not promoted.
- Canary attempted for `central-vietnam-adventure-4-days`; locale result was
  `updated=4`, `unchanged=106`.

## Stop condition observed

After the canary locale writes, the English source checksum for
`central-vietnam-adventure-4-days` drifted. The subsequent full plan was
rejected with:

```text
English source content changed after editorial localization
```

This indicates the current Payload write path can let a localized nested-array
update affect English source state. The canary transaction was not allowed to
proceed to full promotion.

## Recovery

- Production app was stopped during recovery.
- The database was dropped/recreated from the encrypted pre-apply backup.
- The production app was started again and returned to service.
- Public `https://wingside.vn/vi/journeys` returned HTTP 200 after recovery.

## Required before retry

1. Fix the write path so locale nested-array updates never mutate English
   source rows; add a regression test that compares English checksums before
   and after a four-locale canary.
2. Rehearse the corrected importer on PostgreSQL from a malformed English
   fixture, not only an already-normalized fixture.
3. Rebuild the release and repeat backup → canary → full apply → verify.

No production content should be changed again until these three conditions
pass.
