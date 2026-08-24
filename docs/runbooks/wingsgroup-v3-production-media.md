# WingsGroup v3 production media operation

This runbook describes the approval-gated production media operation. It is a
procedure, not production authorization. Every production command below
requires fresh stakeholder cutover authorization for the named operation.

The operation is bound to the approved 13-source manifest, its 78 persisted
responsive derivatives, the immutable release SHA, the exact `wings-group`
tenant, and independently produced encrypted-backup/disposable-restore
evidence. The importer never prints `DATABASE_URL`, evidence contents, or
credential-bearing values.

## Stop conditions

Stop before `production-apply` when any item is missing or mismatched:

- the approved archive SHA-256
- the generated plan SHA-256
- the exact site scope `wings-group`
- the PostgreSQL production target with one nonempty exact database path and
  matching trusted database-name binding, plus `PAYLOAD_DB_PUSH=false`
- the immutable release SHA binding
- a fresh operation ID and operation-bound confirmation token
- encrypted backup evidence or successful disposable-restore evidence
- a clean plan with 13 source records and zero checksum/dimension errors
- the forward-only Payload migration for all six governed image sizes

Do not substitute media, bypass a checksum, use `NODE_ENV=production` as the
sole authorization, or run `apply` in place of `production-apply`.

## 1. Plan and attest

Acquire the stakeholder-approved archive through the authorized handoff
process. Use the immutable release's `us057-ops` tools image, following the
US-057 production pattern. The image ID must be the `sha256:...` value recorded
for the same release; do not invoke host `pnpm`, `tsx`, source files, or
node_modules. The protected shared env is passed through Docker without
printing its contents:

```bash
base=/home/ubuntu/wings-travel
RELEASE_SHA='<40-lowercase-hex-release-sha>'
RELEASE_PATH="$base/releases/<immutable-release-directory>"
OPS_IMAGE_ID="$(tr -d '\r\n' < "$RELEASE_PATH/OPS_IMAGE_ID")"
ARTIFACT_DIR="$base/shared/artifacts/wingsgroup-v3"
case "$OPS_IMAGE_ID" in
  sha256:*) ;;
  *) echo 'OPS_IMAGE_ID must be an immutable sha256 digest' >&2; exit 1 ;;
esac
test -f "$ARTIFACT_DIR/assets/wingsgroup-airport-service.png"

sudo docker run --rm \
  --network wingstravel_default \
  --env-file "$base/shared/.env" \
  -e "WINGSTRAVEL_RELEASE_SHA=$RELEASE_SHA" \
  -v "$ARTIFACT_DIR:/app/artifacts/wingsgroup-v3:ro" \
  "$OPS_IMAGE_ID" \
  pnpm exec tsx scripts/import-wingsgroup-v3-media.ts plan \
    --manifest=/app/docs/product/wingsgroup-v3-media-manifest.json \
    --assets-dir=/app/artifacts/wingsgroup-v3/assets
```

The expected governed archive SHA is
`eea0c9fdcdae0475b82adf35e5b3161e9a99667f4ba98c92d65e5cd53a1ba98b`. The
accepted plan evidence for the current handoff is 13 sources, 78 planned
derivatives, zero errors, and plan SHA
`18d2610de98940f03b39448f7a3cf665be1d2498cae6b57a848a3b0daaaf2943`.
Derivative names are flat Payload filenames such as
`wingsgroup-airport-service-3f92a884cdc7-640.webp`; the installed Payload
route is `/file/:filename`, so nested directory names are not used.

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

## 2a. Apply the immutable schema gate

Before any production media write, apply and verify the registered forward-only
Payload migration from the same `us057-ops` image. This is the US-057 immutable
release pattern: `pnpm` and `payload` execute inside the tools image, while the
protected environment is supplied by Docker. Do not use `PAYLOAD_DB_PUSH` to
create these columns and do not invoke host `pnpm`, `tsx`, source, or
`node_modules`:

```bash
sudo docker run --rm \
  --network wingstravel_default \
  --env-file "$base/shared/.env" \
  -e NODE_ENV=production \
  -e "WINGSTRAVEL_RELEASE_SHA=$RELEASE_SHA" \
  "$OPS_IMAGE_ID" \
  pnpm payload migrate

sudo docker run --rm \
  --network wingstravel_default \
  --env-file "$base/shared/.env" \
  -e NODE_ENV=production \
  -e "WINGSTRAVEL_RELEASE_SHA=$RELEASE_SHA" \
  "$OPS_IMAGE_ID" \
  pnpm payload migrate:status
```

The status output must show
`20260824_150000_wingsgroup_v3_media_sizes` as applied before
`production-apply`. If either command fails, stop; no media apply or publish is
authorized.

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
WINGSGROUP_V3_PRODUCTION_PUBLICATION_CONFIRMATION_TOKEN=CONFIRM_WINGSGROUP_V3_PRODUCTION_MEDIA_PUBLICATION:<fresh-operation-id>
WINGSGROUP_V3_MEDIA_ARCHIVE_SHA256=<approved-archive-sha>
WINGSGROUP_V3_MEDIA_PLAN_SHA256=<generated-plan-sha>
WINGSGROUP_V3_PRODUCTION_BACKUP_EVIDENCE_SHA256=<backup-evidence-file-sha>
WINGSGROUP_V3_PRODUCTION_RESTORE_EVIDENCE_SHA256=<restore-evidence-file-sha>
```

After a fresh stakeholder cutover authorization, run exactly:

```bash
sudo docker run --rm \
  --network wingstravel_default \
  --env-file "$base/shared/.env" \
  -e NODE_ENV=production \
  -e "WINGSTRAVEL_RELEASE_SHA=$RELEASE_SHA" \
  -v "$ARTIFACT_DIR:/app/artifacts/wingsgroup-v3:ro" \
  -v "$base/shared/data/media:/app/public/media" \
  "$OPS_IMAGE_ID" \
  pnpm exec tsx scripts/import-wingsgroup-v3-media.ts production-apply \
    --manifest=/app/docs/product/wingsgroup-v3-media-manifest.json \
    --assets-dir=/app/artifacts/wingsgroup-v3/assets \
    --site-code=wings-group \
    --archive-sha256=<approved-archive-sha> \
    --plan-sha256=<generated-plan-sha> \
    --release-sha="$RELEASE_SHA" \
    --operation-id=<fresh-operation-id> \
    --confirm=CONFIRM_WINGSGROUP_V3_PRODUCTION_MEDIA_WRITE:<fresh-operation-id> \
    --backup-evidence=/app/artifacts/wingsgroup-v3/backup-evidence.json \
    --backup-evidence-sha256=<backup-evidence-file-sha> \
    --restore-evidence=/app/artifacts/wingsgroup-v3/restore-evidence.json \
    --restore-evidence-sha256=<restore-evidence-file-sha>
```

The importer validates the complete plan before Payload initialization, then
uses a transaction, exact source identity, site scope and ownership checks. It
creates missing governed records and reuses only already-owned matching
records. Payload persists six concrete sizes (640/960/1440 in WebP/AVIF), and
the importer reads every returned size column and file, checks its dimensions,
MIME type and SHA-256, and records the six-entry ledger as
`derivativeState=generated`, `publicationState=pending`. It does not delete or
overwrite unowned media.

## 4. Exact post-apply verify

After the write, with fresh authorization for the same operation, run the
read-only verifier. It requires the production target, release, operation,
archive and plan bindings but does not require the write confirmation or backup
files. The verifier reads each source record in both `vi` and `en`, and checks
the site, dimensions, source identity/archive/attachment/file checksum,
source filename, provenance, rights evidence/state, usage scope, publication
state, derivative state, and the complete responsive-derivative inventory.

```bash
sudo docker run --rm \
  --network wingstravel_default \
  --env-file "$base/shared/.env" \
  -e NODE_ENV=production \
  -e "WINGSTRAVEL_RELEASE_SHA=$RELEASE_SHA" \
  -v "$ARTIFACT_DIR:/app/artifacts/wingsgroup-v3:ro" \
  -v "$base/shared/data/media:/app/public/media:ro" \
  "$OPS_IMAGE_ID" \
  pnpm exec tsx scripts/import-wingsgroup-v3-media.ts production-verify \
    --manifest=/app/docs/product/wingsgroup-v3-media-manifest.json \
    --assets-dir=/app/artifacts/wingsgroup-v3/assets \
    --site-code=wings-group \
    --archive-sha256=<approved-archive-sha> \
    --plan-sha256=<generated-plan-sha> \
    --release-sha="$RELEASE_SHA" \
    --operation-id=<same-operation-id>
```

Record `verified` (source records), `localizedAltVerified` (locale values), and
`responsiveDerivatives.persisted=78` with the command output. A missing file,
wrong Payload size metadata, MIME type, filename, URL, or SHA-256 fails closed.
This phase remains read-only and leaves all records pending.

## 5. Separate production publication

Publication is a second confirmation for the same named operation ID. It must
follow a successful `production-verify`, reuse the exact archive/plan/release/
database/backup/restore bindings, and supply both the original write token and
the operation-bound publication token:

```text
WINGSGROUP_V3_PRODUCTION_PUBLICATION_CONFIRMATION_TOKEN=CONFIRM_WINGSGROUP_V3_PRODUCTION_MEDIA_PUBLICATION:<same-operation-id>
```

Run only after fresh stakeholder authorization for publication:

```bash
sudo docker run --rm \
  --network wingstravel_default \
  --env-file "$base/shared/.env" \
  -e NODE_ENV=production \
  -e "WINGSTRAVEL_RELEASE_SHA=$RELEASE_SHA" \
  -v "$ARTIFACT_DIR:/app/artifacts/wingsgroup-v3:ro" \
  -v "$base/shared/data/media:/app/public/media:ro" \
  "$OPS_IMAGE_ID" \
  pnpm exec tsx scripts/import-wingsgroup-v3-media.ts production-publish \
    --manifest=/app/docs/product/wingsgroup-v3-media-manifest.json \
    --assets-dir=/app/artifacts/wingsgroup-v3/assets \
    --site-code=wings-group \
    --archive-sha256=<approved-archive-sha> \
    --plan-sha256=<generated-plan-sha> \
    --release-sha="$RELEASE_SHA" \
    --operation-id=<same-operation-id> \
    --confirm=CONFIRM_WINGSGROUP_V3_PRODUCTION_MEDIA_WRITE:<same-operation-id> \
    --publish-confirm=CONFIRM_WINGSGROUP_V3_PRODUCTION_MEDIA_PUBLICATION:<same-operation-id> \
    --backup-evidence=/app/artifacts/wingsgroup-v3/backup-evidence.json \
    --backup-evidence-sha256=<backup-evidence-file-sha> \
    --restore-evidence=/app/artifacts/wingsgroup-v3/restore-evidence.json \
    --restore-evidence-sha256=<restore-evidence-file-sha>
```

The publisher re-verifies all 13 records in both locales and all 78 physical
files, then promotes every source in one transaction to
`derivativeState=verified` and `publicationState=published`. Failure rolls
back the database transaction and never deletes media records or files; after
a committed operation, recovery is the bound encrypted PostgreSQL restore.

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
