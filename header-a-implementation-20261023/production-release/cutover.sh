#!/bin/sh
set -eu
release=/home/ubuntu/wings-travel/releases/release-us085-6a0dac0
root=/home/ubuntu/wings-travel
shared="$root/shared"
cd "$release"
previous_release="$(readlink -f "$root/current")"
previous_image="$(sudo docker inspect wingstravel-app-1 --format '{{.Image}}')"
test "$previous_release" = "$root/releases/release-0701404"
test "$previous_image" = sha256:b2625ab337b68f47029d9310e616efcc1ba9cd8680f5c8c5286eeb98b44f5458
new_image="$(cat APP_IMAGE_ID)"
test "$(sudo docker inspect wings-us085-6a0dac0 --format '{{.Image}}')" = "$new_image"
test "$(sudo docker inspect wings-us085-6a0dac0 --format '{{.State.Running}}')" = true
curl -fsS http://127.0.0.1:3101/api/health/ready
printf '%s\n' "$previous_release" > PREVIOUS_RELEASE
printf '%s\n' "$previous_image" > PREVIOUS_IMAGE_ID
sudo docker tag "$previous_image" wingstravel-app:rollback-us085-6a0dac0
rollback() {
  sudo docker tag "$previous_image" wingstravel-app:latest
  ln -sfn "$previous_release" "$root/current"
  cd "$previous_release"
  sudo docker compose -f docker-compose.production.yml -p wingstravel \
    --env-file "$shared/.env" up -d --no-deps --no-build --pull never --force-recreate app
  echo 'US085 activation failed; previous immutable application restored.' >&2
}
sudo docker tag "$new_image" wingstravel-app:latest
ln -sfn "$release" "$root/current"
if ! sudo docker compose -f docker-compose.production.yml -p wingstravel \
  --env-file "$shared/.env" up -d --no-deps --no-build --pull never --force-recreate app; then
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
