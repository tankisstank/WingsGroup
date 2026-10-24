#!/bin/sh
set -eu
release=/home/ubuntu/wings-travel/releases/release-us085-footer-d6057d4
shared=/home/ubuntu/wings-travel/shared
cd "$release"
sha256sum -c release-checksum.txt
unzip -oq release-clean.zip
rm release-clean.zip
test "$(cat .next/BUILD_ID)" = "$(cat expected-build-id.txt)"
sed -i 's/\r$//' relink.sh
mkdir -p public/media
sudo docker build -f Dockerfile.standalone -t wingstravel-app:release-us085-footer-d6057d4 .
sudo docker image inspect wingstravel-app:release-us085-footer-d6057d4 --format '{{.Id}}' > APP_IMAGE_ID
sudo docker compose -f docker-compose.production.yml -f candidate-compose.yml \
  -p wingstravel --env-file "$shared/.env" run -d --no-deps \
  --name wings-us085-footer-d6057d4 -p 127.0.0.1:3101:3000 app
ready=false
for attempt in $(seq 1 25); do
  if curl -fsS http://127.0.0.1:3101/api/health/ready > candidate-ready.json; then
    if python3 -c 'import json; data=json.load(open("candidate-ready.json")); assert data["status"]=="ready"; assert data["checks"]["database"]=="up"; assert data["checks"]["redis"]=="up"'; then
      ready=true
      break
    fi
  fi
  sleep 2
done
test "$ready" = true
cat candidate-ready.json
sudo docker exec wings-us085-footer-d6057d4 node --input-type=module -e '
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require = createRequire(import.meta.url);
const Database = require("libsql");
const database = new Database(":memory:");
database.exec("CREATE TABLE probe (value TEXT)");
database.prepare("INSERT INTO probe VALUES (?)").run("us085");
assert.equal(database.prepare("SELECT value FROM probe").get().value,"us085");
database.close();
const sharp = (await import("sharp")).default;
const png = await sharp({create:{width:1,height:1,channels:3,background:"white"}}).png().toBuffer();
assert.ok(png.length>50);
console.log("ARM64 libsql/sharp PASS",process.arch,png.length);
'
date -u '+Candidate ready: %Y-%m-%dT%H:%M:%SZ'
