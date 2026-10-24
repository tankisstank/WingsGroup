#!/usr/bin/env bash
set -euo pipefail
release=release-us083-promotion-search-market-20261020-172000
root=/home/ubuntu/wings-travel
previous="$root/releases/release-us083-promotion-search-20261020-170000"
candidate=wingstravel-candidate-us083-promo-market-20261020
test "$(readlink -f "$root/current")" = "$previous"
test "$(docker inspect --format '{{.Image}}' "$candidate")" = "$(docker image inspect --format '{{.Id}}' "wingstravel-app:$release")"
docker image inspect "wingstravel-app:rollback-$release" > /dev/null
health_check() {
  docker exec wingstravel-app-1 node -e 'fetch("http://" + (process.env.HOSTNAME || "127.0.0.1") + ":3000/api/health/ready").then(async response => { const body = await response.json(); if (!response.ok || body.status !== "ready" || body.checks.database !== "up" || body.checks.redis !== "up" || body.checks.leadDelivery !== "configured") process.exit(1); console.log(JSON.stringify(body)); }).catch(() => process.exit(1))'
}
rollback() {
  trap - ERR
  echo 'Activation failed; restoring pinned previous release image and previous current.' >&2
  docker image tag "wingstravel-app:rollback-$release" wingstravel-app:latest
  docker image tag "wingstravel-app:rollback-$release" app-app:latest
  ln -sfn "$previous" "$root/current"
  cd "$root/current"
  docker compose -f docker-compose.production.yml -p wingstravel --env-file "$root/shared/.env" up -d --no-deps --no-build --pull never --force-recreate app
  for attempt in $(seq 1 30); do
    if health_check; then
      echo 'Rollback readiness verified.' >&2
      exit 1
    fi
    sleep 2
  done
  echo 'Rollback readiness FAILED; manual intervention required.' >&2
  exit 1
}
test "$(docker inspect --format '{{.Image}}' wingstravel-app-1)" = sha256:46d8b184fd48cb485ba0c38398893830325be517580987c46d516cffd132758c
trap rollback ERR
docker image tag "wingstravel-app:$release" wingstravel-app:latest
docker image tag "wingstravel-app:$release" app-app:latest
ln -sfn "$root/releases/$release" "$root/current"
cd "$root/current"
docker compose -f docker-compose.production.yml -p wingstravel --env-file "$root/shared/.env" up -d --no-deps --no-build --pull never --force-recreate app
ready=false
for attempt in $(seq 1 40); do
  if health_check; then
    ready=true
    break
  fi
  sleep 2
done
test "$ready" = true
test "$(docker inspect --format '{{.Image}}' wingstravel-app-1)" = "$(docker image inspect --format '{{.Id}}' "wingstravel-app:$release")"
trap - ERR
printf 'Activated current: '
readlink -f "$root/current"
docker inspect --format 'Activated image {{.Image}}' wingstravel-app-1
date -Is





