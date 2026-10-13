const fs = require('fs');
const path = require('path');

const standaloneDir = path.resolve('app/.next/standalone');
const commands = [];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      const target = fs.readlinkSync(fullPath);
      const relLink = path.relative(standaloneDir, fullPath).replace(/\\/g, '/');
      let unixTarget = target.replace(/\\/g, '/');
      if (unixTarget.includes('/app/node_modules/.pnpm/')) {
        const pnpmPart = unixTarget.split('/app/node_modules/.pnpm/')[1];
        const linkDir = path.dirname(fullPath);
        const targetInStandalone = path.join(standaloneDir, 'node_modules/.pnpm', pnpmPart);
        const relFromLinkToTarget = path.relative(linkDir, targetInStandalone).replace(/\\/g, '/');
        commands.push({ link: relLink, target: relFromLinkToTarget });
      } else {
        commands.push({ link: relLink, target: unixTarget });
      }
    } else if (entry.isDirectory()) {
      scanDir(fullPath);
    }
  }
}

scanDir(standaloneDir);

let shContent = '#!/bin/sh\nset -e\ncd /app\n\n# 1. Download and unpack Linux arm64 musl native modules\nmkdir -p /tmp/native\ncd /tmp/native\nwget -q https://registry.npmjs.org/@img/sharp-linuxmusl-arm64/-/sharp-linuxmusl-arm64-0.34.2.tgz\nwget -q https://registry.npmjs.org/@img/sharp-libvips-linuxmusl-arm64/-/sharp-libvips-linuxmusl-arm64-1.1.0.tgz\nwget -q https://registry.npmjs.org/@libsql/linux-arm64-musl/-/linux-arm64-musl-0.4.7.tgz\n\ncd /app\nmkdir -p node_modules/.pnpm/@img+sharp-linuxmusl-arm64@0.34.2/node_modules/@img/sharp-linuxmusl-arm64\ntar -xzf /tmp/native/sharp-linuxmusl-arm64-0.34.2.tgz -C node_modules/.pnpm/@img+sharp-linuxmusl-arm64@0.34.2/node_modules/@img/sharp-linuxmusl-arm64 --strip-components=1\n\nmkdir -p node_modules/.pnpm/@img+sharp-libvips-linuxmusl-arm64@1.1.0/node_modules/@img/sharp-libvips-linuxmusl-arm64\ntar -xzf /tmp/native/sharp-libvips-linuxmusl-arm64-1.1.0.tgz -C node_modules/.pnpm/@img+sharp-libvips-linuxmusl-arm64@1.1.0/node_modules/@img/sharp-libvips-linuxmusl-arm64 --strip-components=1\n\nmkdir -p node_modules/.pnpm/@libsql+linux-arm64-musl@0.4.7/node_modules/@libsql/linux-arm64-musl\ntar -xzf /tmp/native/linux-arm64-musl-0.4.7.tgz -C node_modules/.pnpm/@libsql+linux-arm64-musl@0.4.7/node_modules/@libsql/linux-arm64-musl --strip-components=1\n\nrm -rf /tmp/native\n\n# 2. Re-create all standard symlinks\n';

for (const item of commands) {
  shContent += `mkdir -p "$(dirname "${item.link}")"\n`;
  shContent += `ln -sfn "${item.target}" "${item.link}"\n`;
}

// Add Linux arm64 specific links
shContent += `\n# 3. Add Linux arm64 links\n`;
shContent += `mkdir -p node_modules/.pnpm/sharp@0.34.2/node_modules/@img\n`;
shContent += `ln -sfn ../../../@img+sharp-linuxmusl-arm64@0.34.2/node_modules/@img/sharp-linuxmusl-arm64 node_modules/.pnpm/sharp@0.34.2/node_modules/@img/sharp-linuxmusl-arm64\n`;
shContent += `ln -sfn ../../../@img+sharp-libvips-linuxmusl-arm64@1.1.0/node_modules/@img/sharp-libvips-linuxmusl-arm64 node_modules/.pnpm/sharp@0.34.2/node_modules/@img/sharp-libvips-linuxmusl-arm64\n`;
shContent += `mkdir -p node_modules/@img\n`;
shContent += `ln -sfn ../.pnpm/@img+sharp-linuxmusl-arm64@0.34.2/node_modules/@img/sharp-linuxmusl-arm64 node_modules/@img/sharp-linuxmusl-arm64\n`;
shContent += `ln -sfn ../.pnpm/@img+sharp-libvips-linuxmusl-arm64@1.1.0/node_modules/@img/sharp-libvips-linuxmusl-arm64 node_modules/@img/sharp-libvips-linuxmusl-arm64\n`;

shContent += `mkdir -p node_modules/.pnpm/node_modules/@libsql\n`;
shContent += `ln -sfn ../../@libsql+linux-arm64-musl@0.4.7/node_modules/@libsql/linux-arm64-musl node_modules/.pnpm/node_modules/@libsql/linux-arm64-musl\n`;
shContent += `mkdir -p node_modules/@libsql\n`;
shContent += `ln -sfn ../.pnpm/@libsql+linux-arm64-musl@0.4.7/node_modules/@libsql/linux-arm64-musl node_modules/@libsql/linux-arm64-musl\n`;

fs.writeFileSync('deploy/oracle/relink.sh', shContent, { encoding: 'utf8' });
console.log(`Generated complete relink.sh with Linux ARM64 native packages.`);
