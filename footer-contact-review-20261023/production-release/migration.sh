#!/bin/sh
set -eu
release=/home/ubuntu/wings-travel/releases/release-us085-footer-d6057d4
shared=/home/ubuntu/wings-travel/shared
ops_image="$(cat "$release/OPS_IMAGE_ID")"
bootstrap='process.env.DATABASE_URL = "postgresql://" + encodeURIComponent(process.env.POSTGRES_USER) + ":" + encodeURIComponent(process.env.POSTGRES_PASSWORD) + "@postgres:5432/" + encodeURIComponent(process.env.POSTGRES_DB);'
command="${1:-migrate:status}"
case "$command" in migrate:status|migrate) ;; *) exit 1 ;; esac
sudo docker run --rm --network wingstravel_default --env-file "$shared/.env" \
  -e NODE_ENV=production -e PAYLOAD_DB_PUSH=false "$ops_image" \
  node --input-type=module -e "$bootstrap const {spawnSync}=await import('node:child_process'); const result=spawnSync('pnpm',['payload','$command'],{env:process.env,stdio:'inherit'}); process.exit(result.status ?? 1);"
