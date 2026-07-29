# US-056 production execution attempt — 2026-07-29

## Result

The first production attempt was stopped by the canary safety gate and
restored from the pre-apply backup. After the write-path fix, the guarded
rehearsal and production run completed successfully.

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

## Successful retry

- Runtime fix committed as `d3fd70b8792e5a0a57f0b635586252433e350247`.
- Canary plan `us056-canary-plan-d3fd70b.json` passed apply (`updated=4`,
  `unchanged=106`) and verify (`checked=88`). The canary was then reverted by
  restoring the verified encrypted backup before the full write.
- Full plan companion `us056-canary-plan-d3fd70b.json.full.json` passed apply
  (`updated=110`, `unchanged=0`) and verify (`checked=88`).
- A second full apply was idempotent (`updated=0`, `unchanged=110`).
- Public QA returned HTTP 200 for journeys and the Central Vietnam tour detail
  in `en`, `vi`, `it`, `es`, and `pt`.

## Required before retry

1. Fix the write path so locale nested-array updates never mutate English
   source rows; add a regression test that compares English checksums before
   and after a four-locale canary.
2. Rehearse the corrected importer on PostgreSQL from a malformed English
   fixture, not only an already-normalized fixture.
3. Rebuild the release and repeat backup → canary → full apply → verify.

The US-056 production data gates are now complete. The importer/tools image is
an operational release artifact; the public app image was not rebuilt because
the change is data/import runtime only.
