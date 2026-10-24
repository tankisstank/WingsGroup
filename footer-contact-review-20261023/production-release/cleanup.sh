#!/bin/sh
set -eu
release=/home/ubuntu/wings-travel/releases/release-us085-footer-d6057d4
test "$(readlink -f /home/ubuntu/wings-travel/current)" = "$release"
expected_image="$(cat "$release/APP_IMAGE_ID")"
test "$(sudo docker inspect wingstravel-app-1 --format '{{.Image}}')" = "$expected_image"
test "$(sudo docker inspect wings-us085-footer-d6057d4 --format '{{.Image}}')" = "$expected_image"
test "$(python3 -c 'import json; print(json.load(open("'"$release"'/restore-receipt.json"))["targetDatabase"])')" = us085_restore_d6057d4
sudo docker rm -f wings-us085-footer-d6057d4
sudo docker exec wingstravel-postgres-1 sh -ec 'dropdb -U "$POSTGRES_USER" us085_restore_d6057d4'
date -u '+Owned candidate/restore cleanup completed: %Y-%m-%dT%H:%M:%SZ'
