# US-057 production runbook — Journeys v2 and governed group commerce

This runbook is executable only after explicit approval of the exact release
SHA, production host, change window and operator. Commands containing
`<PLACEHOLDER>` are intentionally incomplete and must not be run until the
release lead records the value in the protected change record.

The code release, migrations and commerce data are separate gates. A failure at
any gate stops promotion. Never print `.env`, `admin.env`, the age identity or
SSH private key.

## Fixed production target

- SSH: `ubuntu@168.110.212.116`, port `22`, documented key in
  `docs/accounts.md`.
- Release root: `/home/ubuntu/wings-travel/releases`.
- Live symlink: `/home/ubuntu/wings-travel/current`.
- Shared env: `/home/ubuntu/wings-travel/shared/.env`.
- Admin env: `/home/ubuntu/wings-travel/shared/admin.env`.
- Media: `/home/ubuntu/wings-travel/shared/data/media`.
- Protected artifacts: `/home/ubuntu/wings-travel/shared/artifacts/wingsside-us057`.
- Backups: `/home/ubuntu/wings-travel/shared/backups`.
- Compose project/network: `wingstravel` / `wingstravel_default`.
- App/PostgreSQL/Redis containers: `wingstravel-app-1`,
  `wingstravel-postgres-1`, `wingstravel-redis-1`.
- Public site: `https://wingside.vn`; Payload tenant code: `wing-side`.

Re-read these values from the server before continuing. Historical release
paths are evidence only and must not be reused as the rollback target without a
live check.

## 0. Local immutable package

From a clean repository checkout:

```powershell
$releaseSha = (git rev-parse HEAD).Trim()
if ($releaseSha -notmatch '^[a-f0-9]{40}$') { throw 'Invalid release SHA' }
if (git status --porcelain) { throw 'Release worktree is not clean' }
$shortSha = $releaseSha.Substring(0, 12)
$archive = "wingsside-us057-$shortSha.tar.gz"
git archive --format=tar.gz --output $archive $releaseSha
Get-FileHash -Algorithm SHA256 $archive
```

Record the archive checksum, then upload without exposing the key:

```powershell
scp -P 22 `
  -i "C:\Users\VIETD\Downloads\ssh-key-2026-06-04.key" `
  -o IdentitiesOnly=yes `
  -o StrictHostKeyChecking=yes `
  $archive `
  ubuntu@168.110.212.116:/home/ubuntu/wings-travel/shared/artifacts/wingsside-us057/
```

## 1. Server read-only preflight

Connect using the strict SSH command in `docs/accounts.md`, then:

```bash
set -euo pipefail
base=/home/ubuntu/wings-travel
cd "$base/current/app"
readlink -f "$base/current"
cat "$base/current/RELEASE_SHA"
sudo docker compose \
  --env-file "$base/shared/.env" \
  -p wingstravel \
  -f docker-compose.production.yml ps
sudo docker inspect wingstravel-app-1 \
  --format '{{.Image}} {{.State.Status}} {{.State.Health.Status}}'
sudo docker inspect wingstravel-postgres-1 \
  --format '{{.Image}} {{.State.Status}} {{.State.Health.Status}}'
sudo docker inspect wingstravel-redis-1 \
  --format '{{.Image}} {{.State.Status}} {{.State.Health.Status}}'
df -h "$base"
curl --fail --silent --show-error http://127.0.0.1:3000/api/health/live
curl --fail --silent --show-error http://127.0.0.1:3000/api/health/ready
```

Record:

```bash
export RELEASE_SHA='<40_HEX_RELEASE_SHA>'
export SHORT_SHA="${RELEASE_SHA:0:12}"
export RELEASE_PATH="$base/releases/wingsside-us057-$SHORT_SHA"
export ROLLBACK_RELEASE="$(readlink -f "$base/current")"
export ROLLBACK_RELEASE_SHA="$(tr -d '\r\n' < "$ROLLBACK_RELEASE/RELEASE_SHA")"
test "$RELEASE_SHA" != "$ROLLBACK_RELEASE_SHA"
```

Stop if containers are unhealthy, disk is insufficient, a writer job is
active, the rollback release lacks `RELEASE_SHA`, or the recorded target differs
from `docs/accounts.md`.

## 2. Extract release and build immutable ARM64 images

This mutates release artifacts and requires:

```bash
test "${CONFIRM_US057_RELEASE_PACKAGE:-}" = \
  'CONFIRM_WINGSSIDE_US057_RELEASE_PACKAGE'
```

Then:

```bash
archive="$base/shared/artifacts/wingsside-us057/wingsside-us057-$SHORT_SHA.tar.gz"
test -f "$archive"
test ! -e "$RELEASE_PATH"
mkdir -p "$RELEASE_PATH"
tar -xzf "$archive" -C "$RELEASE_PATH"
printf '%s\n' "$RELEASE_SHA" > "$RELEASE_PATH/RELEASE_SHA"
cd "$RELEASE_PATH/app"

sudo docker build \
  --platform linux/arm64 \
  --target runner \
  --build-arg "WINGSTRAVEL_RELEASE_SHA=$RELEASE_SHA" \
  --tag "wingstravel-app:us057-$SHORT_SHA" \
  --file Dockerfile .

sudo docker build \
  --platform linux/arm64 \
  --target us057-ops \
  --build-arg "WINGSTRAVEL_RELEASE_SHA=$RELEASE_SHA" \
  --tag "wingstravel-us057-ops:$SHORT_SHA" \
  --file Dockerfile .

export APP_IMAGE_ID="$(
  sudo docker image inspect "wingstravel-app:us057-$SHORT_SHA" --format '{{.Id}}'
)"
export OPS_IMAGE_ID="$(
  sudo docker image inspect "wingstravel-us057-ops:$SHORT_SHA" --format '{{.Id}}'
)"
test "$(sudo docker image inspect "$APP_IMAGE_ID" \
  --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')" = "$RELEASE_SHA"
test "$(sudo docker image inspect "$OPS_IMAGE_ID" \
  --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')" = "$RELEASE_SHA"
printf '%s\n' "$APP_IMAGE_ID" > "$RELEASE_PATH/APP_IMAGE_ID"
printf '%s\n' "$OPS_IMAGE_ID" > "$RELEASE_PATH/OPS_IMAGE_ID"
```

Use the image IDs (`sha256:...`) for canary and promotion. Tags are retained
for operator readability but are not the immutable binding.

## 3. Port-3001 code canary

```bash
test "${CONFIRM_US057_CODE_CANARY:-}" = \
  'CONFIRM_WINGSSIDE_US057_CODE_CANARY'
sudo docker rm -f wingstravel-us057-canary 2>/dev/null || true
sudo docker run -d \
  --name wingstravel-us057-canary \
  --network wingstravel_default \
  --env-file "$base/shared/.env" \
  -e "WINGSTRAVEL_RELEASE_SHA=$RELEASE_SHA" \
  -p 127.0.0.1:3001:3000 \
  -v "$base/shared/data/media:/app/public/media" \
  "$APP_IMAGE_ID"
```

Probe without public traffic switching:

```bash
curl --fail http://127.0.0.1:3001/api/health/live
curl --fail http://127.0.0.1:3001/api/health/ready
curl --fail -H 'Host: wingside.vn' http://127.0.0.1:3001/journeys
curl --fail -H 'Host: wingside.vn' \
  'http://127.0.0.1:3001/journeys?type=group&destination=hanoi'
sudo docker logs --tail 200 wingstravel-us057-canary
sudo docker rm -f wingstravel-us057-canary
```

Stop on 4xx/5xx, wrong tenant, migration/schema errors or unexpected readiness
degradation.

## 4. Exact migrations

Migrations are applied before the pre-content backup. No content plan may be
applied until both names report applied.

```bash
test "${CONFIRM_US057_MIGRATIONS:-}" = \
  'CONFIRM_WINGSSIDE_US057_MIGRATIONS'
sudo docker run --rm \
  --network wingstravel_default \
  --env-file "$base/shared/.env" \
  -e "WINGSTRAVEL_RELEASE_SHA=$RELEASE_SHA" \
  "$OPS_IMAGE_ID" pnpm payload migrate

sudo docker run --rm \
  --network wingstravel_default \
  --env-file "$base/shared/.env" \
  -e "WINGSTRAVEL_RELEASE_SHA=$RELEASE_SHA" \
  "$OPS_IMAGE_ID" pnpm payload migrate:status
```

Required rows:

- `20260731_090000_tour_commerce_freshness_identity`
- `20260731_100000_tour_departure_source_provenance`

## 5. Fresh evidence and one-snapshot full/canary plans

Create the protected artifact directory and use the immutable ops image:

```bash
mkdir -p "$base/shared/artifacts/wingsside-us057"
artifact="$base/shared/artifacts/wingsside-us057"

sudo docker run --rm \
  --network wingstravel_default \
  --env-file "$base/shared/.env" \
  -e "WINGSTRAVEL_RELEASE_SHA=$RELEASE_SHA" \
  -v "$artifact:/app/artifacts/us057" \
  "$OPS_IMAGE_ID" \
  pnpm run lifecycle:wingsside:group-commerce -- capture-evidence \
    --candidates scripts/data/wingsside-group-commerce-v1/source-candidates.json \
    --ttl-hours 8 \
    --output artifacts/us057/source-evidence.json

sudo docker run --rm \
  --network wingstravel_default \
  --env-file "$base/shared/.env" \
  -e "WINGSTRAVEL_RELEASE_SHA=$RELEASE_SHA" \
  -v "$artifact:/app/artifacts/us057" \
  "$OPS_IMAGE_ID" \
  pnpm run lifecycle:wingsside:group-commerce -- plan \
    --release-sha "$RELEASE_SHA" \
    --evidence artifacts/us057/source-evidence.json \
    --canary 63 \
    --output artifacts/us057/full-plan.json \
    --canary-output artifacts/us057/canary-plan.json
```

Record the printed full and canary SHA-256 values. Do not regenerate either
plan after the backup binding or canary starts.

## 6. Encrypted backup and US057 disposable restore drill

The `us057-ops` image contains PostgreSQL 16 client tools and `age`; credentials
come only from the shared env file. The age identity is mounted read-only and is
never printed.

```bash
test "${CONFIRM_US057_BACKUP:-}" = \
  'CONFIRM_WINGSSIDE_US057_ENCRYPTED_BACKUP'
sudo docker run --rm \
  --network wingstravel_default \
  --env-file "$base/shared/.env" \
  -e NODE_ENV=production \
  -e BACKUP_DIR=/app/artifacts/us057 \
  -e BACKUP_RETENTION_DAYS=365 \
  -v "$artifact:/app/artifacts/us057" \
  "$OPS_IMAGE_ID" pnpm run db:backup | tee "$artifact/backup-result.json"
```

Read the generated backup path from the one-line JSON result and set
`BACKUP_BASENAME` to that basename. Create a disposable database:

```bash
export RESTORE_DB="wingstravel_us057_restore_${SHORT_SHA}"
sudo docker exec \
  -e "RESTORE_DB=$RESTORE_DB" \
  wingstravel-postgres-1 sh -lc \
  'dropdb --if-exists -U "$POSTGRES_USER" "$RESTORE_DB" &&
   createdb -U "$POSTGRES_USER" "$RESTORE_DB"'
```

Run the drill from the ops image. `<AGE_IDENTITY_HOST_PATH>` is the protected
host path approved by the release lead:

```bash
sudo docker run --rm \
  --network wingstravel_default \
  --env-file "$base/shared/.env" \
  -e "BACKUP_FILE=/app/artifacts/us057/$BACKUP_BASENAME" \
  -e BACKUP_AGE_IDENTITY=/run/secrets/backup-age-identity \
  -e "RESTORE_DATABASE_NAME=$RESTORE_DB" \
  -e RESTORE_ASSERTION_PROFILE=wingsside-us057 \
  -v "$artifact:/app/artifacts/us057:ro" \
  -v "<AGE_IDENTITY_HOST_PATH>:/run/secrets/backup-age-identity:ro" \
  "$OPS_IMAGE_ID" pnpm run db:restore:drill \
  | tee "$artifact/restore-drill.json"
```

The drill must report:

- `status=ok`, `restoreListVerified=true`;
- a non-production `targetDatabase`;
- one `wing-side` site and exactly 22 production tour IDs;
- both US057 migrations, all nine governed columns and the unique inventory
  identity index.

Drop only the exact disposable database after evidence is safely written:

```bash
test "${CONFIRM_US057_DROP_DRILL:-}" = \
  'CONFIRM_WINGSSIDE_US057_DROP_DISPOSABLE_DRILL'
sudo docker exec \
  -e "RESTORE_DB=$RESTORE_DB" \
  wingstravel-postgres-1 sh -lc \
  'dropdb --if-exists -U "$POSTGRES_USER" "$RESTORE_DB"'
```

## 7. Bind backup, restore, plan and rollback release

```bash
sudo docker run --rm \
  --network wingstravel_default \
  --env-file "$base/shared/.env" \
  -v "$artifact:/app/artifacts/us057" \
  "$OPS_IMAGE_ID" \
  pnpm run bind:wingsside:us057-release-evidence -- \
    --backup "artifacts/us057/$BACKUP_BASENAME" \
    --database-host postgres \
    --database-name "$POSTGRES_DB" \
    --plan artifacts/us057/full-plan.json \
    --release-sha "$RELEASE_SHA" \
    --restore-evidence artifacts/us057/restore-drill.json \
    --rollback-release "$ROLLBACK_RELEASE" \
    --rollback-release-sha "$ROLLBACK_RELEASE_SHA" \
    --confirm BIND_WINGSSIDE_US057_RELEASE_EVIDENCE
```

Record the backup, manifest, restore evidence, full plan and canary plan
checksums in the protected change record. Export the trusted gate variables
without printing their values:

- `WINGSSIDE_RELEASE_REMEDIATION_ALLOW=production`
- `WINGSSIDE_RELEASE_SHA`, `WINGSTRAVEL_RELEASE_SHA`
- `WINGSSIDE_RELEASE_DATABASE_HOST`, `WINGSSIDE_RELEASE_DATABASE_NAME`
- `WINGSSIDE_RELEASE_BACKUP_SHA256`
- `WINGSSIDE_RELEASE_BACKUP_MANIFEST_SHA256`
- `WINGSSIDE_RELEASE_BACKUP_BINDING_SHA256` (full plan SHA)
- `WINGSSIDE_RELEASE_RESTORE_EVIDENCE_SHA256`
- `WINGSSIDE_ROLLBACK_RELEASE_PATH`, `WINGSSIDE_ROLLBACK_RELEASE_SHA`
- `WINGSSIDE_TOUR_EDITORIAL_PLAN_SHA256` (the plan used by the current phase)
- `ADMIN_EMAIL`

## 8. Data canary, attestation and full apply

Every mutation command additionally requires:

- `--confirm-production wing-side`;
- exact backup/restore/rollback paths and checksums;
- exact phase confirmation token;
- `--admin-email` matching protected `ADMIN_EMAIL`.

Apply canary ID 63 using `canary-plan.json`, `--parent-plan full-plan.json` and
confirmation `CONFIRM_WINGSSIDE_GROUP_COMMERCE_PRODUCTION_WRITE`. Save its
receipt, verify `--state after`, run `attest-canary` with that receipt, and save
the attestation SHA.

Before full apply, set
`WINGSSIDE_TOUR_EDITORIAL_PLAN_SHA256=<FULL_PLAN_SHA>` and
`WINGSSIDE_GROUP_COMMERCE_CANARY_ATTESTATION_SHA256=<ATTESTATION_SHA>`.
Full apply must include:

- `--plan full-plan.json`, `--plan-sha256 <FULL_PLAN_SHA>`;
- `--canary-plan canary-plan.json`, `--canary-plan-sha256 <CANARY_SHA>`;
- `--canary-receipt <CANARY_RECEIPT>`;
- `--canary-attestation <ATTESTATION>`;
- `--canary-attestation-sha256 <ATTESTATION_SHA>`;
- `--output full-apply-receipt.json`.

The exact argument contract is enforced in
`scripts/wingsside-group-commerce-lifecycle.ts`. Do not abbreviate or bypass
the guard. Immediately run full `verify --state after`, then public Journeys,
Tour Detail and Contact QA. Monitor for 30–60 minutes.

If apply commits but output writing fails, run read-only `recover-receipt`
against the same plan/SHA. It succeeds only when every managed row matches the
exact signed postimage.

## 9. App-only promotion

Only after schema, data and public canary gates are green:

```bash
test "${CONFIRM_US057_PROMOTION:-}" = \
  'CONFIRM_WINGSSIDE_US057_APP_PROMOTION'
cd "$RELEASE_PATH/app"
export WINGSTRAVEL_APP_IMAGE="$APP_IMAGE_ID"
ln -s "$RELEASE_PATH" "$base/current.us057-next"
mv -Tf "$base/current.us057-next" "$base/current"
sudo --preserve-env=WINGSTRAVEL_APP_IMAGE docker compose \
  --env-file "$base/shared/.env" \
  -p wingstravel \
  -f docker-compose.production.yml \
  -f deploy/docker-compose.us057-image.yml \
  up -d --no-deps --no-build --pull never --force-recreate app
```

Verify the running container image ID equals `APP_IMAGE_ID`; PostgreSQL and
Redis container IDs must be unchanged. Probe health and public desktop/mobile
Journeys, strict AND deep links, expired-contact fallback and context-safe
Contact.

## 10. Rollback

### Data rollback

Use the new release ops image before changing `current`. Run `rollback` with the
same full plan, full SHA, linked canary plan/SHA, exact full receipt, backup
binding and `CONFIRM_WINGSSIDE_GROUP_COMMERCE_PRODUCTION_ROLLBACK`. Rollback is
allowed after plan expiry but still requires the exact current postimage.
Verify `--state before`.

### App rollback

```bash
test "${CONFIRM_US057_APP_ROLLBACK:-}" = \
  'CONFIRM_WINGSSIDE_US057_APP_ROLLBACK'
export ROLLBACK_APP_IMAGE_ID='<RECORDED_PRE_RELEASE_IMAGE_ID>'
ln -s "$ROLLBACK_RELEASE" "$base/current.us057-rollback"
mv -Tf "$base/current.us057-rollback" "$base/current"
cd "$base/current/app"
export WINGSTRAVEL_APP_IMAGE="$ROLLBACK_APP_IMAGE_ID"
sudo --preserve-env=WINGSTRAVEL_APP_IMAGE docker compose \
  --env-file "$base/shared/.env" \
  -p wingstravel \
  -f docker-compose.production.yml \
  -f deploy/docker-compose.us057-image.yml \
  up -d --no-deps --no-build --pull never --force-recreate app
```

Do not roll back the additive schema during the incident. The old app can
ignore the added columns; destructive migration rollback increases recovery
risk.

### Catastrophic database restore

There is deliberately no automated production-target restore command in this
runbook. Stop the app and escalate to the database owner. Restore requires a
separate explicit approval naming the exact backup checksum and database,
because it drops/recreates the production database. The successful disposable
restore drill is evidence that the backup is usable; it is not authorization to
overwrite production.

## Required evidence

- release SHA, archive checksum, release path;
- runner/ops tags, image IDs and revision labels;
- pre/post container IDs and health;
- migration status;
- source evidence, full/canary plans and checksums;
- encrypted backup, bound manifest and restore drill evidence;
- canary receipt, verify result and attestation;
- full receipt and verify result;
- desktop/mobile public QA and monitoring;
- rollback release path/SHA/image ID and final go/no-go decision.
