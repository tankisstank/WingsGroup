#!/usr/bin/env bash
set -euo pipefail
release=release-us083-promotion-search-market-20261020-172000
root=/home/ubuntu/wings-travel
candidate=wingstravel-candidate-us083-promo-market-20261020
expected="$root/releases/release-us083-promotion-search-20261020-170000"
test "$(readlink -f "$root/current")" = "$expected"
cd "$root/releases/$release"
sha256sum -c release-files.sha256
if test -e server.js; then
  test "$(cat .next/BUILD_ID)" = "$(cat expected-build-id.txt)"
fi
unzip -oq release-clean.zip < /dev/null
test "$(cat .next/BUILD_ID)" = "$(cat expected-build-id.txt)"
sed -i 's/\r$//' relink.sh
mkdir -p public/media
docker build -f Dockerfile.standalone -t "wingstravel-app:$release" .
docker compose -f docker-compose.production.yml -f candidate.compose.yml -p wingstravel --env-file "$root/shared/.env" run -d --no-deps --name "$candidate" --publish 127.0.0.1:3104:3000 app
ready=false
for attempt in $(seq 1 25); do
  if docker exec "$candidate" node -e '
    fetch("http://" + process.env.HOSTNAME + ":3000/api/health/ready")
      .then(async response => {
        const body = await response.json();
        if (!response.ok || body.status !== "ready" || body.checks.database !== "up" || body.checks.redis !== "up" || body.checks.leadDelivery !== "configured") process.exit(1);
        console.log(JSON.stringify(body));
      })
      .catch(() => process.exit(1));
  '; then
    ready=true
    break
  fi
  sleep 2
done
test "$ready" = true
docker exec -i "$candidate" node <<'NODE'
if (process.arch !== 'arm64') throw new Error('Expected ARM64');
const Database = require('libsql');
const database = new Database(':memory:');
database.exec('CREATE TABLE native_probe (value TEXT NOT NULL)');
database.prepare('INSERT INTO native_probe (value) VALUES (?)').run('promotion-search-runtime');
const result = database.prepare('SELECT value FROM native_probe').get();
if (result.value !== 'promotion-search-runtime') throw new Error('Native write/read mismatch');
console.log('ARM64 libsql memory write/read', result);
database.close();
require('sharp')({ create: { width: 1, height: 1, channels: 3, background: '#ffffff' } })
  .png()
  .toBuffer()
  .then(bytes => console.log('ARM64 sharp/libvips bytes', bytes.length))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
NODE
docker inspect --format 'Candidate image {{.Image}}' "$candidate"
printf 'Current remains: '
readlink -f "$root/current"
date -Is


