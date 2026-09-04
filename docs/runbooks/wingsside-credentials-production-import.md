# WingSide Credentials Production Import

Use this runbook only for the committed US-047 WingSide credentials catalog in
`app/assets/wingsside-credentials`.

Hard guards enforced by the CLI:

- `NODE_ENV=production`
- PostgreSQL `DATABASE_URL`
- `PAYLOAD_DB_PUSH=false`
- exact site code `wing-side`
- exact locale set `vi,en,it,es,pt` with `defaultLocale=en`
- exactly one published Home page per locale
- exact manifest and 24 asset SHA-256 fingerprints
- exact `WINGSTRAVEL_RELEASE_SHA` 40-hex source commit fingerprint
- explicit confirmation for write phases

The normal production app image stays minimal. Run the importer from release
source or build the dedicated tools target:

```powershell
$releaseSha = "<40-hex-release-source-commit>"
docker build --platform linux/arm64 --target tools --build-arg WINGSTRAVEL_RELEASE_SHA=$releaseSha -t wings-travel-tools:us047 -f app/Dockerfile app
```

For the VPS compose deployment, use Docker project `wingstravel` and run the
tools image on the `wingstravel_default` compose network, with the same
production env file and the same media volume mount used by the application
container. Example shape:

```powershell
docker run --rm --platform linux/arm64 --network wingstravel_default --env-file /home/ubuntu/wings-travel/shared/.env -e WINGSTRAVEL_RELEASE_SHA=$releaseSha -v /home/ubuntu/wings-travel/shared/data/media:/app/public/media -v /home/ubuntu/wings-travel/shared/artifacts/wingsside-credentials:/app/artifacts/release/wingsside-credentials wings-travel-tools:us047 pnpm run import:wingsside:credentials:prod:plan -- --output artifacts/release/wingsside-credentials/plan.json
```

Phases:

```powershell
pnpm --dir app run import:wingsside:credentials:prod:plan -- --output artifacts/release/wingsside-credentials/plan.json
```

Container:

```powershell
docker run --rm --platform linux/arm64 --network wingstravel_default --env-file /home/ubuntu/wings-travel/shared/.env -e WINGSTRAVEL_RELEASE_SHA=$releaseSha -v /home/ubuntu/wings-travel/shared/data/media:/app/public/media -v /home/ubuntu/wings-travel/shared/artifacts/wingsside-credentials:/app/artifacts/release/wingsside-credentials wings-travel-tools:us047 pnpm run import:wingsside:credentials:prod:plan -- --output artifacts/release/wingsside-credentials/plan.json
```

Record the printed `planSha256`, then apply:

```powershell
pnpm --dir app run import:wingsside:credentials:prod:apply -- --plan artifacts/release/wingsside-credentials/plan.json --plan-sha256 <sha256> --admin-email <super-admin-email> --confirm CONFIRM_WINGSSIDE_CREDENTIALS_PRODUCTION_WRITE
```

Container:

```powershell
docker run --rm --platform linux/arm64 --network wingstravel_default --env-file /home/ubuntu/wings-travel/shared/.env -e WINGSTRAVEL_RELEASE_SHA=$releaseSha -v /home/ubuntu/wings-travel/shared/data/media:/app/public/media -v /home/ubuntu/wings-travel/shared/artifacts/wingsside-credentials:/app/artifacts/release/wingsside-credentials wings-travel-tools:us047 pnpm run import:wingsside:credentials:prod:apply -- --plan artifacts/release/wingsside-credentials/plan.json --plan-sha256 <sha256> --admin-email <super-admin-email> --confirm CONFIRM_WINGSSIDE_CREDENTIALS_PRODUCTION_WRITE
```

Verify:

```powershell
pnpm --dir app run import:wingsside:credentials:prod:verify -- --plan artifacts/release/wingsside-credentials/plan.json --plan-sha256 <sha256>
```

Container:

```powershell
docker run --rm --platform linux/arm64 --network wingstravel_default --env-file /home/ubuntu/wings-travel/shared/.env -e WINGSTRAVEL_RELEASE_SHA=$releaseSha -v /home/ubuntu/wings-travel/shared/data/media:/app/public/media -v /home/ubuntu/wings-travel/shared/artifacts/wingsside-credentials:/app/artifacts/release/wingsside-credentials wings-travel-tools:us047 pnpm run import:wingsside:credentials:prod:verify -- --plan artifacts/release/wingsside-credentials/plan.json --plan-sha256 <sha256>
```

Rollback, if required:

```powershell
pnpm --dir app run import:wingsside:credentials:prod:rollback -- --plan artifacts/release/wingsside-credentials/plan.json --plan-sha256 <sha256> --admin-email <super-admin-email> --confirm CONFIRM_WINGSSIDE_CREDENTIALS_PRODUCTION_ROLLBACK
```

Container:

```powershell
docker run --rm --platform linux/arm64 --network wingstravel_default --env-file /home/ubuntu/wings-travel/shared/.env -e WINGSTRAVEL_RELEASE_SHA=$releaseSha -v /home/ubuntu/wings-travel/shared/data/media:/app/public/media -v /home/ubuntu/wings-travel/shared/artifacts/wingsside-credentials:/app/artifacts/release/wingsside-credentials wings-travel-tools:us047 pnpm run import:wingsside:credentials:prod:rollback -- --plan artifacts/release/wingsside-credentials/plan.json --plan-sha256 <sha256> --admin-email <super-admin-email> --confirm CONFIRM_WINGSSIDE_CREDENTIALS_PRODUCTION_ROLLBACK
```

Expected exact before: no credentials carousel blocks on the five WingSide Home
locales and no matching credential media records.

Expected exact after: 24 content-addressed Media records and one deterministic
24-item credentials block on each of the five locales, for 120 placements with
105 `verified` and 15 `needs-review` aggregate review-status counts. Re-running
apply with the same plan and SHA is a no-op.

Rollback validates the same plan, source fingerprints and current after state,
then restores the captured before layouts and deletes only the 24 matching media
records created by the plan. During rollback the importer quarantines exact
upload files before deleting Media records and restores them if the database
transaction rolls back.
