#!/bin/sh
set -eu
release=/home/ubuntu/wings-travel/releases/release-rainbow-643a40d
cd "$release"
test "$(readlink -f /home/ubuntu/wings-travel/current)" = "$release"
test "$(sudo docker inspect wingstravel-app-1 --format '{{.Image}}')" = "$(cat APP_IMAGE_ID)"
sudo docker tag "$(cat APP_IMAGE_ID)" wingstravel-app:latest
sudo docker tag "$(cat APP_IMAGE_ID)" app-app:latest
test "$(sudo docker inspect wings-rainbow-643a40d --format '{{.Image}}')" = "$(cat APP_IMAGE_ID)"
sudo docker rm -f wings-rainbow-643a40d
curl -fsS http://127.0.0.1:3000/api/health/ready
sudo docker inspect wingstravel-app-1 --format '{{.Image}} {{.State.StartedAt}} {{.RestartCount}}'
sudo docker image inspect wingstravel-app:rollback-rainbow-643a40d --format '{{.Id}}'
df -h /
date -u '+Final runtime verified: %Y-%m-%dT%H:%M:%SZ'
