#!/bin/sh
set -eu
release=/home/ubuntu/wings-travel/releases/release-us085-footer-d6057d4
test "$(readlink -f /home/ubuntu/wings-travel/current)" = "$release"
test "$(sudo docker inspect wingstravel-app-1 --format '{{.Image}}')" = "$(cat "$release/APP_IMAGE_ID")"
test "$(sudo docker image inspect wingstravel-app:rollback-us085-footer-d6057d4 --format '{{.Id}}')" = sha256:54821addabf22f01d90986cc1fcea3e00e4d842627bf4738729b14d2f3c0b962
test -z "$(sudo docker ps -aq --filter name='^wings-us085-footer-d6057d4$')"
test "$(sudo docker exec wingstravel-postgres-1 sh -ec 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT count(*) FROM pg_database WHERE datname='\''us085_restore_d6057d4'\''"')" = 0
test -s /home/ubuntu/wings-travel/shared/backups/release-us085-footer-d6057d4/wingstravel-2026-10-23T14-19-48-385Z.dump.age
readlink -f /home/ubuntu/wings-travel/current
sudo docker inspect wingstravel-app-1 --format '{{.Image}} started={{.State.StartedAt}} restarts={{.RestartCount}}'
sudo docker exec wingstravel-app-1 cat /app/.next/BUILD_ID
curl -fsS http://127.0.0.1:3000/api/health/ready
df -h /
date -u '+Final runtime and cleanup verification: %Y-%m-%dT%H:%M:%SZ'
