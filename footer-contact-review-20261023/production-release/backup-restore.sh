#!/bin/sh
set -eu
release=/home/ubuntu/wings-travel/releases/release-us085-footer-d6057d4
shared=/home/ubuntu/wings-travel/shared
cd "$release"
sudo docker load -i operations-image.tar
ops_image="$(sudo docker image inspect wingstravel-ops:us085-footer-d6057d4 --format '{{.Id}}')"
test "$(sudo docker image inspect "$ops_image" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')" = d6057d41c2b3897b27cbd656356f83873d652870
printf '%s\n' "$ops_image" > OPS_IMAGE_ID
rm operations-image.tar
backup_dir="$shared/backups/release-us085-footer-d6057d4"
sudo mkdir -p "$backup_dir"
db_bootstrap='process.env.DATABASE_URL = "postgresql://" + encodeURIComponent(process.env.POSTGRES_USER) + ":" + encodeURIComponent(process.env.POSTGRES_PASSWORD) + "@postgres:5432/" + encodeURIComponent(process.env.POSTGRES_DB);'
sudo docker run --rm --network wingstravel_default --env-file "$shared/.env" \
  -e NODE_ENV=production -e PAYLOAD_DB_PUSH=false -e BACKUP_DIR=/backups \
  -v "$backup_dir:/backups" "$ops_image" node --input-type=module \
  -e "$db_bootstrap await import('./scripts/postgres-backup.mjs');"
backup_file="$(sudo find "$backup_dir" -maxdepth 1 -type f -name '*.dump.age' -printf '%f\n')"
test -n "$backup_file"
printf '%s\n' "$backup_file" > BACKUP_FILE
sudo cat "$backup_dir/$backup_file.json"
sudo docker exec wingstravel-postgres-1 sh -ec 'createdb -U "$POSTGRES_USER" us085_restore_d6057d4'
sudo docker run --rm --network wingstravel_default --env-file "$shared/.env" \
  -e NODE_ENV=production -e PAYLOAD_DB_PUSH=false \
  -e "BACKUP_FILE=/backups/$backup_file" -e RESTORE_DATABASE_NAME=us085_restore_d6057d4 \
  -e ALLOW_REMOTE_RESTORE_DRILL=true -v "$backup_dir:/backups:ro" \
  -v "$shared/recovery:$shared/recovery:ro" "$ops_image" node --input-type=module \
  -e "$db_bootstrap await import('./scripts/postgres-restore-drill.mjs');" > restore-receipt.json
cat restore-receipt.json
printf '%s\n' d6057d41c2b3897b27cbd656356f83873d652870 > RELEASE_SHA
date -u '+Backup and disposable restore completed: %Y-%m-%dT%H:%M:%SZ'
