#!/bin/sh
set -eu
sudo docker exec -e PGOPTIONS='-c default_transaction_read_only=on' wingstravel-postgres-1 sh -ec '
psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At <<SQL
SELECT jsonb_build_object(
  '\''table'\'', '\''site_settings'\'',
  '\''count'\'', count(*),
  '\''fingerprint'\'', md5(jsonb_agg(to_jsonb(settings) ORDER BY id)::text)
) FROM site_settings settings;
SELECT jsonb_build_object(
  '\''table'\'', '\''site_settings_additional_hotlines'\'',
  '\''count'\'', count(*),
  '\''fingerprint'\'', md5(jsonb_agg(to_jsonb(hotline) ORDER BY id)::text)
) FROM site_settings_additional_hotlines hotline;
SQL
'
