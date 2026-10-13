#!/bin/sh
set -e
mkdir -p /tmp/extract && cd /tmp/extract
wget -q https://registry.npmjs.org/@img/sharp-linuxmusl-arm64/-/sharp-linuxmusl-arm64-0.34.2.tgz
wget -q https://registry.npmjs.org/@img/sharp-libvips-linuxmusl-arm64/-/sharp-libvips-linuxmusl-arm64-1.1.0.tgz
wget -q https://registry.npmjs.org/@libsql/linux-arm64-musl/-/linux-arm64-musl-0.4.7.tgz

mkdir -p node_modules/@img/sharp-linuxmusl-arm64 && tar -xzf sharp-linuxmusl-arm64-0.34.2.tgz -C node_modules/@img/sharp-linuxmusl-arm64 --strip-components=1
mkdir -p node_modules/@img/sharp-libvips-linuxmusl-arm64 && tar -xzf sharp-libvips-linuxmusl-arm64-1.1.0.tgz -C node_modules/@img/sharp-libvips-linuxmusl-arm64 --strip-components=1
mkdir -p node_modules/@libsql/linux-arm64-musl && tar -xzf linux-arm64-musl-0.4.7.tgz -C node_modules/@libsql/linux-arm64-musl --strip-components=1

echo "Testing require @libsql/linux-arm64-musl:"
node -e "console.log(Object.keys(require('./node_modules/@libsql/linux-arm64-musl')))"
echo "Success!"
