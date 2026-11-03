#!/bin/sh
set -e
cd /app

safe_link() {
  _target="$1"
  _link="$2"
  mkdir -p "$(dirname "$_link")"
  if [ -L "$_link" ]; then
    rm -f "$_link"
  elif [ -e "$_link" ]; then
    echo "ERROR: Refusing to overwrite non-symlink path: $_link" >&2
    exit 1
  fi
  ln -sfn "$_target" "$_link"
}

# 1. Download and unpack Linux arm64 musl native modules
mkdir -p /tmp/native
cd /tmp/native
wget -q https://registry.npmjs.org/@img/sharp-linuxmusl-arm64/-/sharp-linuxmusl-arm64-0.34.2.tgz
wget -q https://registry.npmjs.org/@img/sharp-libvips-linuxmusl-arm64/-/sharp-libvips-linuxmusl-arm64-1.1.0.tgz
wget -q https://registry.npmjs.org/@libsql/linux-arm64-musl/-/linux-arm64-musl-0.4.7.tgz

cd /app
mkdir -p node_modules/.pnpm/@img+sharp-linuxmusl-arm64@0.34.2/node_modules/@img/sharp-linuxmusl-arm64
tar -xzf /tmp/native/sharp-linuxmusl-arm64-0.34.2.tgz -C node_modules/.pnpm/@img+sharp-linuxmusl-arm64@0.34.2/node_modules/@img/sharp-linuxmusl-arm64 --strip-components=1
mkdir -p node_modules/.pnpm/@img+sharp-libvips-linuxmusl-arm64@1.1.0/node_modules/@img/sharp-libvips-linuxmusl-arm64
tar -xzf /tmp/native/sharp-libvips-linuxmusl-arm64-1.1.0.tgz -C node_modules/.pnpm/@img+sharp-libvips-linuxmusl-arm64@1.1.0/node_modules/@img/sharp-libvips-linuxmusl-arm64 --strip-components=1
mkdir -p node_modules/.pnpm/@libsql+linux-arm64-musl@0.4.7/node_modules/@libsql/linux-arm64-musl
tar -xzf /tmp/native/linux-arm64-musl-0.4.7.tgz -C node_modules/.pnpm/@libsql+linux-arm64-musl@0.4.7/node_modules/@libsql/linux-arm64-musl --strip-components=1

rm -rf /tmp/native

# 2. Re-create all standard symlinks
safe_link ".pnpm/graphql@16.14.0/node_modules/graphql" "node_modules/graphql"
safe_link ".pnpm/next@16.2.6_@babel+core@7.2_440732d5d08602451f72bddbf6fbd907/node_modules/next" "node_modules/next"
safe_link ".pnpm/sharp@0.34.2/node_modules/sharp" "node_modules/sharp"

# 3. Add Linux arm64 specific links for each Sharp version
# Sharp 0.34.2 (sharp@0.34.2)
safe_link "../../../@img+sharp-linuxmusl-arm64@0.34.2/node_modules/@img/sharp-linuxmusl-arm64" "node_modules/.pnpm/sharp@0.34.2/node_modules/@img/sharp-linuxmusl-arm64"
safe_link "../../../@img+sharp-libvips-linuxmusl-arm64@1.1.0/node_modules/@img/sharp-libvips-linuxmusl-arm64" "node_modules/.pnpm/sharp@0.34.2/node_modules/@img/sharp-libvips-linuxmusl-arm64"
safe_link "../../../@img+sharp-libvips-linuxmusl-arm64@1.1.0/node_modules/@img/sharp-libvips-linuxmusl-arm64" "node_modules/.pnpm/@img+sharp-linuxmusl-arm64@0.34.2/node_modules/@img/sharp-libvips-linuxmusl-arm64"

# 4. Top-level fallback links (mapped consistently to root Sharp)
safe_link "../.pnpm/@img+sharp-linuxmusl-arm64@0.34.2/node_modules/@img/sharp-linuxmusl-arm64" "node_modules/@img/sharp-linuxmusl-arm64"
safe_link "../.pnpm/@img+sharp-libvips-linuxmusl-arm64@1.1.0/node_modules/@img/sharp-libvips-linuxmusl-arm64" "node_modules/@img/sharp-libvips-linuxmusl-arm64"

# 5. Libsql native links
safe_link "../../@libsql+linux-arm64-musl@0.4.7/node_modules/@libsql/linux-arm64-musl" "node_modules/.pnpm/node_modules/@libsql/linux-arm64-musl"
safe_link "../.pnpm/@libsql+linux-arm64-musl@0.4.7/node_modules/@libsql/linux-arm64-musl" "node_modules/@libsql/linux-arm64-musl"
