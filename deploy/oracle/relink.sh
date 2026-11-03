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
wget -q https://registry.npmjs.org/@img/sharp-linuxmusl-arm64/-/sharp-linuxmusl-arm64-0.34.5.tgz
wget -q https://registry.npmjs.org/@img/sharp-libvips-linuxmusl-arm64/-/sharp-libvips-linuxmusl-arm64-1.1.0.tgz
wget -q https://registry.npmjs.org/@img/sharp-libvips-linuxmusl-arm64/-/sharp-libvips-linuxmusl-arm64-1.2.4.tgz
wget -q https://registry.npmjs.org/@libsql/linux-arm64-musl/-/linux-arm64-musl-0.4.7.tgz

cd /app
mkdir -p node_modules/.pnpm/@img+sharp-linuxmusl-arm64@0.34.2/node_modules/@img/sharp-linuxmusl-arm64
tar -xzf /tmp/native/sharp-linuxmusl-arm64-0.34.2.tgz -C node_modules/.pnpm/@img+sharp-linuxmusl-arm64@0.34.2/node_modules/@img/sharp-linuxmusl-arm64 --strip-components=1
mkdir -p node_modules/.pnpm/@img+sharp-linuxmusl-arm64@0.34.5/node_modules/@img/sharp-linuxmusl-arm64
tar -xzf /tmp/native/sharp-linuxmusl-arm64-0.34.5.tgz -C node_modules/.pnpm/@img+sharp-linuxmusl-arm64@0.34.5/node_modules/@img/sharp-linuxmusl-arm64 --strip-components=1
mkdir -p node_modules/.pnpm/@img+sharp-libvips-linuxmusl-arm64@1.1.0/node_modules/@img/sharp-libvips-linuxmusl-arm64
tar -xzf /tmp/native/sharp-libvips-linuxmusl-arm64-1.1.0.tgz -C node_modules/.pnpm/@img+sharp-libvips-linuxmusl-arm64@1.1.0/node_modules/@img/sharp-libvips-linuxmusl-arm64 --strip-components=1
mkdir -p node_modules/.pnpm/@img+sharp-libvips-linuxmusl-arm64@1.2.4/node_modules/@img/sharp-libvips-linuxmusl-arm64
tar -xzf /tmp/native/sharp-libvips-linuxmusl-arm64-1.2.4.tgz -C node_modules/.pnpm/@img+sharp-libvips-linuxmusl-arm64@1.2.4/node_modules/@img/sharp-libvips-linuxmusl-arm64 --strip-components=1
mkdir -p node_modules/.pnpm/@libsql+linux-arm64-musl@0.4.7/node_modules/@libsql/linux-arm64-musl
tar -xzf /tmp/native/linux-arm64-musl-0.4.7.tgz -C node_modules/.pnpm/@libsql+linux-arm64-musl@0.4.7/node_modules/@libsql/linux-arm64-musl --strip-components=1

rm -rf /tmp/native

# 2. Re-create all standard symlinks
safe_link "../../../@libsql+hrana-client@0.7.0/node_modules/@libsql/hrana-client" "node_modules/.pnpm/@libsql+client@0.14.0/node_modules/@libsql/hrana-client"
safe_link "../../libsql@0.4.7/node_modules/libsql" "node_modules/.pnpm/@libsql+client@0.14.0/node_modules/libsql"
safe_link "../../promise-limit@2.7.0/node_modules/promise-limit" "node_modules/.pnpm/@libsql+client@0.14.0/node_modules/promise-limit"
safe_link "../../js-base64@3.7.8/node_modules/js-base64" "node_modules/.pnpm/@libsql+core@0.14.0/node_modules/js-base64"
safe_link "../../../@libsql+isomorphic-fetch@0.3.1/node_modules/@libsql/isomorphic-fetch" "node_modules/.pnpm/@libsql+hrana-client@0.7.0/node_modules/@libsql/isomorphic-fetch"
safe_link "../../../@libsql+isomorphic-ws@0.1.5/node_modules/@libsql/isomorphic-ws" "node_modules/.pnpm/@libsql+hrana-client@0.7.0/node_modules/@libsql/isomorphic-ws"
safe_link "../../js-base64@3.7.8/node_modules/js-base64" "node_modules/.pnpm/@libsql+hrana-client@0.7.0/node_modules/js-base64"
safe_link "../../ws@8.21.0/node_modules/ws" "node_modules/.pnpm/@libsql+isomorphic-ws@0.1.5/node_modules/ws"
safe_link "../../color-name@1.1.4/node_modules/color-name" "node_modules/.pnpm/color-convert@2.0.1/node_modules/color-name"
safe_link "../../color-name@1.1.4/node_modules/color-name" "node_modules/.pnpm/color-string@1.9.1/node_modules/color-name"
safe_link "../../simple-swizzle@0.2.4/node_modules/simple-swizzle" "node_modules/.pnpm/color-string@1.9.1/node_modules/simple-swizzle"
safe_link "../../color-convert@2.0.1/node_modules/color-convert" "node_modules/.pnpm/color@4.2.3/node_modules/color-convert"
safe_link "../../color-string@1.9.1/node_modules/color-string" "node_modules/.pnpm/color@4.2.3/node_modules/color-string"
safe_link "../../../@neon-rs+load@0.0.4/node_modules/@neon-rs/load" "node_modules/.pnpm/libsql@0.4.7/node_modules/@neon-rs/load"
safe_link "../../detect-libc@2.0.2/node_modules/detect-libc" "node_modules/.pnpm/libsql@0.4.7/node_modules/detect-libc"
safe_link "../../../@next+env@16.2.6/node_modules/@next/env" "node_modules/.pnpm/next@16.2.6_@babel+core@7.2_440732d5d08602451f72bddbf6fbd907/node_modules/@next/env"
safe_link "../../../@swc+helpers@0.5.15/node_modules/@swc/helpers" "node_modules/.pnpm/next@16.2.6_@babel+core@7.2_440732d5d08602451f72bddbf6fbd907/node_modules/@swc/helpers"
safe_link "../../baseline-browser-mapping@2.10.32/node_modules/baseline-browser-mapping" "node_modules/.pnpm/next@16.2.6_@babel+core@7.2_440732d5d08602451f72bddbf6fbd907/node_modules/baseline-browser-mapping"
safe_link "../../caniuse-lite@1.0.30001793/node_modules/caniuse-lite" "node_modules/.pnpm/next@16.2.6_@babel+core@7.2_440732d5d08602451f72bddbf6fbd907/node_modules/caniuse-lite"
safe_link "../../postcss@8.4.31/node_modules/postcss" "node_modules/.pnpm/next@16.2.6_@babel+core@7.2_440732d5d08602451f72bddbf6fbd907/node_modules/postcss"
safe_link "../../react@19.2.6/node_modules/react" "node_modules/.pnpm/next@16.2.6_@babel+core@7.2_440732d5d08602451f72bddbf6fbd907/node_modules/react"
safe_link "../../react-dom@19.2.6_react@19.2.6/node_modules/react-dom" "node_modules/.pnpm/next@16.2.6_@babel+core@7.2_440732d5d08602451f72bddbf6fbd907/node_modules/react-dom"
safe_link "../../sass@1.77.4/node_modules/sass" "node_modules/.pnpm/next@16.2.6_@babel+core@7.2_440732d5d08602451f72bddbf6fbd907/node_modules/sass"
safe_link "../../sharp@0.34.5/node_modules/sharp" "node_modules/.pnpm/next@16.2.6_@babel+core@7.2_440732d5d08602451f72bddbf6fbd907/node_modules/sharp"
safe_link "../../styled-jsx@5.1.6_@babel+core@7.29.0_react@19.2.6/node_modules/styled-jsx" "node_modules/.pnpm/next@16.2.6_@babel+core@7.2_440732d5d08602451f72bddbf6fbd907/node_modules/styled-jsx"
safe_link "../../nanoid@3.3.12/node_modules/nanoid" "node_modules/.pnpm/postcss@8.4.31/node_modules/nanoid"
safe_link "../../picocolors@1.1.1/node_modules/picocolors" "node_modules/.pnpm/postcss@8.4.31/node_modules/picocolors"
safe_link "../../source-map-js@1.2.1/node_modules/source-map-js" "node_modules/.pnpm/postcss@8.4.31/node_modules/source-map-js"
safe_link "../../react@19.2.6/node_modules/react" "node_modules/.pnpm/react-dom@19.2.6_react@19.2.6/node_modules/react"
safe_link "../../immutable@4.3.8/node_modules/immutable" "node_modules/.pnpm/sass@1.77.4/node_modules/immutable"
safe_link "../../color@4.2.3/node_modules/color" "node_modules/.pnpm/sharp@0.34.2/node_modules/color"
safe_link "../../detect-libc@2.1.2/node_modules/detect-libc" "node_modules/.pnpm/sharp@0.34.2/node_modules/detect-libc"
safe_link "../../semver@7.8.1/node_modules/semver" "node_modules/.pnpm/sharp@0.34.2/node_modules/semver"
safe_link "../../../@img+colour@1.1.0/node_modules/@img/colour" "node_modules/.pnpm/sharp@0.34.5/node_modules/@img/colour"
safe_link "../../detect-libc@2.1.2/node_modules/detect-libc" "node_modules/.pnpm/sharp@0.34.5/node_modules/detect-libc"
safe_link "../../semver@7.8.1/node_modules/semver" "node_modules/.pnpm/sharp@0.34.5/node_modules/semver"
safe_link "../../is-arrayish@0.3.4/node_modules/is-arrayish" "node_modules/.pnpm/simple-swizzle@0.2.4/node_modules/is-arrayish"
safe_link "../../client-only@0.0.1/node_modules/client-only" "node_modules/.pnpm/styled-jsx@5.1.6_@babel+core@7.29.0_react@19.2.6/node_modules/client-only"
safe_link "../../react@19.2.6/node_modules/react" "node_modules/.pnpm/styled-jsx@5.1.6_@babel+core@7.29.0_react@19.2.6/node_modules/react"
safe_link ".pnpm/graphql@16.14.0/node_modules/graphql" "node_modules/graphql"
safe_link ".pnpm/next@16.2.6_@babel+core@7.2_440732d5d08602451f72bddbf6fbd907/node_modules/next" "node_modules/next"
safe_link ".pnpm/sharp@0.34.2/node_modules/sharp" "node_modules/sharp"

# 3. Add Linux arm64 specific links for each Sharp version
# Sharp 0.34.2 (sharp@0.34.2)
safe_link "../../../@img+sharp-linuxmusl-arm64@0.34.2/node_modules/@img/sharp-linuxmusl-arm64" "node_modules/.pnpm/sharp@0.34.2/node_modules/@img/sharp-linuxmusl-arm64"
safe_link "../../../@img+sharp-libvips-linuxmusl-arm64@1.1.0/node_modules/@img/sharp-libvips-linuxmusl-arm64" "node_modules/.pnpm/sharp@0.34.2/node_modules/@img/sharp-libvips-linuxmusl-arm64"
safe_link "../../../@img+sharp-libvips-linuxmusl-arm64@1.1.0/node_modules/@img/sharp-libvips-linuxmusl-arm64" "node_modules/.pnpm/@img+sharp-linuxmusl-arm64@0.34.2/node_modules/@img/sharp-libvips-linuxmusl-arm64"
# Sharp 0.34.5 (sharp@0.34.5)
safe_link "../../../@img+sharp-linuxmusl-arm64@0.34.5/node_modules/@img/sharp-linuxmusl-arm64" "node_modules/.pnpm/sharp@0.34.5/node_modules/@img/sharp-linuxmusl-arm64"
safe_link "../../../@img+sharp-libvips-linuxmusl-arm64@1.2.4/node_modules/@img/sharp-libvips-linuxmusl-arm64" "node_modules/.pnpm/sharp@0.34.5/node_modules/@img/sharp-libvips-linuxmusl-arm64"
safe_link "../../../@img+sharp-libvips-linuxmusl-arm64@1.2.4/node_modules/@img/sharp-libvips-linuxmusl-arm64" "node_modules/.pnpm/@img+sharp-linuxmusl-arm64@0.34.5/node_modules/@img/sharp-libvips-linuxmusl-arm64"

# 4. Top-level fallback links (mapped consistently to root Sharp)
safe_link "../.pnpm/@img+sharp-linuxmusl-arm64@0.34.2/node_modules/@img/sharp-linuxmusl-arm64" "node_modules/@img/sharp-linuxmusl-arm64"
safe_link "../.pnpm/@img+sharp-libvips-linuxmusl-arm64@1.1.0/node_modules/@img/sharp-libvips-linuxmusl-arm64" "node_modules/@img/sharp-libvips-linuxmusl-arm64"

# 5. Libsql native links
safe_link "../../@libsql+linux-arm64-musl@0.4.7/node_modules/@libsql/linux-arm64-musl" "node_modules/.pnpm/node_modules/@libsql/linux-arm64-musl"
safe_link "../.pnpm/@libsql+linux-arm64-musl@0.4.7/node_modules/@libsql/linux-arm64-musl" "node_modules/@libsql/linux-arm64-musl"
