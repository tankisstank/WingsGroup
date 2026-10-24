#!/bin/sh
set -eu
root=/home/ubuntu/wings-travel
release=$root/releases/release-rainbow-643a40d
shared=$root/shared
cd "$release"
previous_release=$(readlink -f "$root/current")
previous_image=$(sudo docker inspect wingstravel-app-1 --format '{{.Image}}')
test "$previous_release" = "$root/releases/release-us081-wingsgo-16ff60a"
test "$previous_image" = sha256:6ff0106b45f4eba6a5019e502891903a7103105ca893a65602bbabac5e1a8f27
new_image=$(cat APP_IMAGE_ID)
test "$(sudo docker inspect wings-rainbow-643a40d --format '{{.Image}}')" = "$new_image"
curl -fsS http://127.0.0.1:3102/api/health/ready
printf '%s\n' "$previous_release" > PREVIOUS_RELEASE
printf '%s\n' "$previous_image" > PREVIOUS_IMAGE_ID
sudo docker tag "$previous_image" wingstravel-app:rollback-rainbow-643a40d
printf 'services:\n  app:\n    image: %s\n' "$new_image" > pinned-compose.yml
printf 'services:\n  app:\n    image: %s\n' "$previous_image" > rollback-compose.yml
rollback() {
  ln -sfn "$previous_release" "$root/current"
  sudo docker compose -f "$previous_release/docker-compose.production.yml" -f "$release/rollback-compose.yml" -p wingstravel --env-file "$shared/.env" up -d --no-deps --no-build --pull never --force-recreate app
  echo 'Activation failed; restored previous immutable runtime.' >&2
}
ln -sfn "$release" "$root/current"
if ! sudo docker compose -f docker-compose.production.yml -f pinned-compose.yml -p wingstravel --env-file "$shared/.env" up -d --no-deps --no-build --pull never --force-recreate app; then
  rollback
  exit 1
fi
ready=false
for attempt in $(seq 1 25); do
  if curl -fsS http://127.0.0.1:3000/api/health/ready > active-ready.json; then
    if python3 -c 'import json; data=json.load(open("active-ready.json")); assert data["status"]=="ready"; assert all(data["checks"][key]=="up" for key in ["database","redis"]); assert data["checks"]["leadDelivery"]=="configured"'; then
      ready=true
      break
    fi
  fi
  sleep 2
done
if test "$ready" != true; then rollback; exit 1; fi
if test "$(sudo docker inspect wingstravel-app-1 --format '{{.Image}}')" != "$new_image"; then rollback; exit 1; fi
if test "$(sudo docker exec wingstravel-app-1 cat /app/.next/BUILD_ID)" != "$(cat expected-build-id.txt)"; then rollback; exit 1; fi
cat active-ready.json
sudo docker inspect wingstravel-app-1 --format '{{.Image}} {{.State.StartedAt}} {{.RestartCount}}'
date -u '+Cutover completed: %Y-%m-%dT%H:%M:%SZ'
