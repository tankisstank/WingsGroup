#!/bin/sh
set -eu
release=/home/ubuntu/wings-travel/releases/release-us085-6a0dac0
shared=/home/ubuntu/wings-travel/shared
ops_image="$(cat "$release/OPS_IMAGE_ID")"
mode="${1:-inspect}"
case "$mode" in inspect|apply|rehearse) ;; *) exit 1 ;; esac
bootstrap='process.env.DATABASE_URL = "postgresql://" + encodeURIComponent(process.env.POSTGRES_USER) + ":" + encodeURIComponent(process.env.POSTGRES_PASSWORD) + "@postgres:5432/" + encodeURIComponent(process.env.POSTGRES_DB);'
if test "$mode" = rehearse; then
  bootstrap="$bootstrap process.env.DATABASE_URL=new URL('us085_restore_6a0dac0',process.env.DATABASE_URL).toString(); process.env.REDIS_KEY_PREFIX='us085-rehearsal';"
fi
sudo docker run --rm --network wingstravel_default --env-file "$shared/.env" \
  -e NODE_ENV=production -e PAYLOAD_DB_PUSH=false -e REDIS_URL=redis://redis:6379 \
  -e WINGSTRAVEL_RELEASE_SHA=6a0dac015340f7279bfe352e377193c38b3d0d91 \
  -v "$release/cms-operation.mts:/app/scripts/us085-cms-operation.mts:ro" \
  "$ops_image" node --import=tsx --input-type=module \
  -e "$bootstrap process.argv=['node','/app/scripts/us085-cms-operation.mts','$mode']; await import('./scripts/us085-cms-operation.mts');"
