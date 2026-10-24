#!/bin/sh
set -eu
readlink -f /home/ubuntu/wings-travel/current
sudo docker inspect wingstravel-app-1 --format '{{.Image}}'
sudo docker exec -e PGOPTIONS='-c default_transaction_read_only=on' wingstravel-postgres-1 sh -ec '
psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At <<SQL
SELECT jsonb_build_object(
  '\''site'\'', sites.code,
  '\''settingsID'\'', settings.id,
  '\''supportPhone'\'', settings.support_phone,
  '\''fingerprint'\'', md5(to_jsonb(settings)::text)
) FROM site_settings settings JOIN sites ON sites.id = settings.site_id ORDER BY sites.code;
SELECT jsonb_build_object(
  '\''table'\'', '\''site_settings_additional_hotlines'\'',
  '\''count'\'', count(*),
  '\''fingerprint'\'', md5(jsonb_agg(to_jsonb(hotline) ORDER BY id)::text)
) FROM site_settings_additional_hotlines hotline;
SQL
'
