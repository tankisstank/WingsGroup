# WingsGroup v3 production media operation

This runbook describes the approval-gated production media operation. It is a
procedure, not production authorization. Every production command below
requires fresh stakeholder cutover authorization for the named operation.

The operation is bound to the approved 13-source manifest, its 78 planned
responsive derivatives, the immutable release SHA, the exact `wings-group`
tenant, and independently produced encrypted-backup/disposable-restore
evidence. The importer never prints `DATABASE_URL`, evidence contents, or
credential-bearing values.

## Stop conditions

Stop before `production-apply` when any item is missing or mismatched:

- the approved archive SHA-256
- the generated plan SHA-256
- the exact site scope `wings-group`
- the PostgreSQL production target and `PAYLOAD_DB_PUSH=false`
- the immutable release SHA binding
- a fresh operation ID and operation-bound confirmation token
- encrypted backup evidence or successful disposable-restore evidence
- a clean plan with 13 source records and zero checksum/dimension errors

Do not substitute media, bypass a checksum, use `NODE_ENV=production` as the
sole authorization, or run `apply` in place of `production-apply`.

## 1. Plan and attest

Acquire the stakeholder-approved archive through the authorized handoff
process. Run the normal plan in the immutable release image and retain the
printed `archiveSha256`, `planned`, `errors`, and `planChecksum` values:

```bash
pnpm exec tsx scripts/import-wingsgroup-v3-media.ts plan \
  --manifest=../docs/product/wingsgroup-v3-media-manifest.json \
  --assets-dir=<verified-handoff-assets-directory>
```

The expected governed archive SHA is
`eea0c9fdcdae0475b82adf35e5b3161e9a99667f4ba98c92d65e5cd53a1ba98b`. The
accepted plan evidence for the current handoff is 13 sources, 78 planned
derivatives, zero errors, and plan SHA
`e0d7fcf0f98fc900ebcdad92c2fb930e6799fefcc8cbbcfff1888a3f2189aede`.

Do not run the production phase until the plan is independently reviewed and
the cutover authorization names the same operation ID.

## 2. Bind backup and restore evidence

Before the write, an operator with the approved production access must produce
an encrypted PostgreSQL backup and a successful disposable restore rehearsal.
The evidence JSON files must be retained outside the repository and must bind
the same `operationID`, `databaseHost`, `databaseName`, `releaseSha`,
`archiveSha256`, and `planSha256`.

The encrypted-backup evidence must include at least:

```json
{
  "status": "verified",
  "encrypted": true,
  "format": "postgres-custom",
  "operationID": "<fresh-operation-id>",
  "databaseHost": "postgres",
  "databaseName": "<production-database-name>",
  "releaseSha": "<40-lowercase-hex-release-sha>",
  "archiveSha256": "<manifest-archive-sha>",
  "planSha256": "<generated-plan-sha>",
  "backupSha256": "<encrypted-backup-sha>",
  "restoreEvidenceSha256": "<restore-evidence-file-sha>"
}
```

The disposable-restore evidence must include `status: "verified"`,
`disposableRestore: true`, the same binding fields and backup SHA, plus a
`targetDatabase` that is not the production database name. Compute and retain
the SHA-256 of each evidence file; pass only the hashes and file paths to the
command. Never put secrets or evidence contents in tracked files or logs.

## 3. Production apply

Set the trusted environment values through the release platform's protected
configuration. Do not place a production `DATABASE_URL` or credentials in the
repository. The environment must include:

```text
NODE_ENV=production
PAYLOAD_DB_PUSH=false
WINGSGROUP_V3_PRODUCTION_ALLOW=production
WINGSGROUP_V3_PRODUCTION_SITE_CODE=wings-group
WINGSGROUP_V3_PRODUCTION_DATABASE_HOST=postgres
WINGSGROUP_V3_PRODUCTION_DATABASE_NAME=<production-database-name>
WINGSTRAVEL_RELEASE_SHA=<same-40-lowercase-hex-release-sha>
WINGSGROUP_V3_PRODUCTION_RELEASE_SHA=<same-release-sha>
WINGSGROUP_V3_PRODUCTION_OPERATION_ID=<fresh-operation-id>
WINGSGROUP_V3_PRODUCTION_CONFIRMATION_TOKEN=CONFIRM_WINGSGROUP_V3_PRODUCTION_MEDIA_WRITE:<fresh-operation-id>
WINGSGROUP_V3_MEDIA_ARCHIVE_SHA256=<approved-archive-sha>
WINGSGROUP_V3_MEDIA_PLAN_SHA256=<generated-plan-sha>
WINGSGROUP_V3_PRODUCTION_BACKUP_EVIDENCE_SHA256=<backup-evidence-file-sha>
WINGSGROUP_V3_PRODUCTION_RESTORE_EVIDENCE_SHA256=<restore-evidence-file-sha>
```

After a fresh stakeholder cutover authorization, run exactly:

```bash
pnpm exec tsx scripts/import-wingsgroup-v3-media.ts production-apply \
  --manifest=../docs/product/wingsgroup-v3-media-manifest.json \
  --assets-dir=<verified-handoff-assets-directory> \
  --site-code=wings-group \
  --archive-sha256=<approved-archive-sha> \
  --plan-sha256=<generated-plan-sha> \
  --release-sha=<immutable-release-sha> \
  --operation-id=<fresh-operation-id> \
  --confirm=CONFIRM_WINGSGROUP_V3_PRODUCTION_MEDIA_WRITE:<fresh-operation-id> \
  --backup-evidence=<encrypted-backup-evidence.json> \
  --backup-evidence-sha256=<backup-evidence-file-sha> \
  --restore-evidence=<disposable-restore-evidence.json> \
  --restore-evidence-sha256=<restore-evidence-file-sha>
```

The importer validates the complete plan before Payload initialization, then
uses a transaction, exact source identity, site scope and ownership checks. It
creates missing governed records and reuses only already-owned matching
records. It does not delete or overwrite unowned media.

## 4. Exact post-apply verify

After the write, with fresh authorization for the same operation, run the
read-only verifier. It requires the production target, release, operation,
archive and plan bindings but does not require the write confirmation or backup
files:

```bash
pnpm exec tsx scripts/import-wingsgroup-v3-media.ts production-verify \
  --manifest=../docs/product/wingsgroup-v3-media-manifest.json \
  --assets-dir=<verified-handoff-assets-directory> \
  --site-code=wings-group \
  --archive-sha256=<approved-archive-sha> \
  --plan-sha256=<generated-plan-sha> \
  --release-sha=<immutable-release-sha> \
  --operation-id=<same-operation-id>
```

Record the verified count and keep the command output with the release
evidence. Runtime publication remains fail-closed until responsive derivatives,
governance and production smoke checks are complete.

## Rollback and recovery

If the transaction fails before commit, the importer attempts the transaction
rollback and removes only files reported as created by that run. If transaction
rollback or cleanup fails, stop and require manual recovery review.

After a committed production operation, media/data rollback is only the
approved encrypted PostgreSQL backup restore procedure bound to the same
operation. An application image or symlink rollback is not a media/data
rollback and must never be recorded as one. Do not add a media rollback CLI
that deletes or rewrites records without a reviewed database restore plan.

No production backup receipt, restore receipt, cutover authorization or runtime
publication approval is asserted by this repository document.
