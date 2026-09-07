#!/bin/sh

# Production-only worker trigger. The cron entry invokes Payload's authenticated
# local endpoint; credentials stay in the shared, non-versioned environment file.
set -eu

base=/home/ubuntu/wings-travel

# shellcheck disable=SC1090
. "$base/shared/.env"

: "${CRON_SECRET:?CRON_SECRET is required}"

if ! printf 'Authorization: Bearer %s\n' "$CRON_SECRET" | /usr/bin/curl \
  --header @- \
  --fail \
  --silent \
  --show-error \
  --connect-timeout 5 \
  --max-time 55 \
  'http://127.0.0.1:3000/api/payload-jobs/run?allQueues=true&limit=25' \
  >/dev/null; then
  logger -t wingstravel-payload-jobs 'Payload job trigger failed'
fi
