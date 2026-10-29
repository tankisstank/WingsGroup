const fs = require('fs');
const path = require('path');

function scanDir(dir, standaloneDir, commands = []) {
  if (!fs.existsSync(dir)) return commands;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      const target = fs.readlinkSync(fullPath);
      const relLink = path.relative(standaloneDir, fullPath).replace(/\\/g, '/');
      const unixTarget = target.replace(/\\/g, '/');
      const linkDir = path.dirname(fullPath);

      if (unixTarget.includes('/node_modules/.pnpm/')) {
        const pnpmPart = unixTarget.split('/node_modules/.pnpm/')[1];
        const targetInStandalone = path.join(standaloneDir, 'node_modules/.pnpm', pnpmPart);
        const relFromLinkToTarget = path.relative(linkDir, targetInStandalone).replace(/\\/g, '/');
        commands.push({ link: relLink, target: relFromLinkToTarget });
      } else if (path.isAbsolute(target) && target.startsWith(standaloneDir)) {
        const relFromLinkToTarget = path.relative(linkDir, target).replace(/\\/g, '/');
        commands.push({ link: relLink, target: relFromLinkToTarget });
      } else {
        commands.push({ link: relLink, target: unixTarget });
      }
    } else if (entry.isDirectory()) {
      scanDir(fullPath, standaloneDir, commands);
    }
  }
  return commands;
}

function discoverSharpPackages(standaloneDir) {
  const pnpmDir = path.join(standaloneDir, 'node_modules/.pnpm');
  const sharpPackages = [];

  if (fs.existsSync(pnpmDir)) {
    const entries = fs.readdirSync(pnpmDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('sharp@')) {
        let pkgJsonPath = path.join(pnpmDir, entry.name, 'node_modules', 'sharp', 'package.json');
        if (!fs.existsSync(pkgJsonPath)) {
          pkgJsonPath = path.join(pnpmDir, entry.name, 'package.json');
        }
        if (fs.existsSync(pkgJsonPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
          const version = pkg.version;
          const optDeps = pkg.optionalDependencies;

          if (!optDeps || typeof optDeps !== 'object') {
            throw new Error(`Sharp package at ${pkgJsonPath} has no optionalDependencies manifest`);
          }

          const nativeVersion = optDeps['@img/sharp-linuxmusl-arm64'];
          const libvipsVersion = optDeps['@img/sharp-libvips-linuxmusl-arm64'];

          if (!nativeVersion) {
            throw new Error(`Sharp package at ${pkgJsonPath} (v${version}) missing optionalDependency '@img/sharp-linuxmusl-arm64'`);
          }
          if (!libvipsVersion) {
            throw new Error(`Sharp package at ${pkgJsonPath} (v${version}) missing optionalDependency '@img/sharp-libvips-linuxmusl-arm64'`);
          }

          sharpPackages.push({
            pnpmDirName: entry.name,
            version,
            nativePackage: '@img/sharp-linuxmusl-arm64',
            nativeVersion,
            libvipsPackage: '@img/sharp-libvips-linuxmusl-arm64',
            libvipsVersion,
            packageJsonPath: pkgJsonPath
          });
        }
      }
    }
  }

  const rootSharpPkgJson = path.join(standaloneDir, 'node_modules', 'sharp', 'package.json');
  if (sharpPackages.length === 0 && fs.existsSync(rootSharpPkgJson)) {
    const pkg = JSON.parse(fs.readFileSync(rootSharpPkgJson, 'utf8'));
    const optDeps = pkg.optionalDependencies || {};
    const nativeVersion = optDeps['@img/sharp-linuxmusl-arm64'];
    const libvipsVersion = optDeps['@img/sharp-libvips-linuxmusl-arm64'];
    if (!nativeVersion || !libvipsVersion) {
      throw new Error(`Root sharp package at ${rootSharpPkgJson} missing linuxmusl-arm64 optionalDependencies`);
    }
    sharpPackages.push({
      pnpmDirName: `sharp@${pkg.version}`,
      version: pkg.version,
      nativePackage: '@img/sharp-linuxmusl-arm64',
      nativeVersion,
      libvipsPackage: '@img/sharp-libvips-linuxmusl-arm64',
      libvipsVersion,
      packageJsonPath: rootSharpPkgJson
    });
  }

  if (sharpPackages.length === 0) {
    throw new Error(`No bundled Sharp packages discovered in ${standaloneDir}`);
  }

  return sharpPackages;
}

function discoverLibsqlVersion(standaloneDir) {
  const pnpmDir = path.join(standaloneDir, 'node_modules/.pnpm');
  if (fs.existsSync(pnpmDir)) {
    const entries = fs.readdirSync(pnpmDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && (entry.name.startsWith('libsql@') || entry.name.startsWith('@libsql+client@'))) {
        const pkgJsonPath = path.join(pnpmDir, entry.name, 'node_modules', 'libsql', 'package.json');
        if (fs.existsSync(pkgJsonPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
          if (pkg.optionalDependencies && pkg.optionalDependencies['@libsql/linux-arm64-musl']) {
            return pkg.optionalDependencies['@libsql/linux-arm64-musl'];
          }
          if (pkg.version) return pkg.version;
        }
      }
    }
  }
  return '0.4.7';
}

function determineRootSharp(sharpPackages, standaloneDir) {
  const rootSharpPath = path.join(standaloneDir, 'node_modules', 'sharp');
  if (fs.existsSync(rootSharpPath)) {
    try {
      const real = fs.realpathSync(rootSharpPath);
      for (const sp of sharpPackages) {
        if (real.includes(sp.pnpmDirName) || real.includes(`sharp@${sp.version}`)) {
          return sp;
        }
      }
    } catch (_) {}
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(rootSharpPath, 'package.json'), 'utf8'));
      const found = sharpPackages.find(sp => sp.version === pkg.version);
      if (found) return found;
    } catch (_) {}
  }

  const appPkgPath = path.resolve('app/package.json');
  if (fs.existsSync(appPkgPath)) {
    try {
      const appPkg = JSON.parse(fs.readFileSync(appPkgPath, 'utf8'));
      const requested = (appPkg.dependencies && appPkg.dependencies.sharp) || '';
      const cleanVer = requested.replace(/[\^~>=]/g, '');
      const found = sharpPackages.find(sp => sp.version === cleanVer);
      if (found) return found;
    } catch (_) {}
  }

  return sharpPackages[0];
}

function generateRelinkScript({ standaloneDir, commands = [], sharpPackages = [], libsqlVersion = '0.4.7' }) {
  const rootSharp = determineRootSharp(sharpPackages, standaloneDir);
  const uniqueNativeSharpVersions = [...new Set(sharpPackages.map(sp => sp.nativeVersion))];
  const uniqueLibvipsVersions = [...new Set(sharpPackages.map(sp => sp.libvipsVersion))];

  let sh = '#!/bin/sh\nset -e\ncd /app\n\n';
  sh += 'safe_link() {\n';
  sh += '  _target="$1"\n';
  sh += '  _link="$2"\n';
  sh += '  mkdir -p "$(dirname "$_link")"\n';
  sh += '  if [ -L "$_link" ]; then\n';
  sh += '    rm -f "$_link"\n';
  sh += '  elif [ -e "$_link" ]; then\n';
  sh += '    echo "ERROR: Refusing to overwrite non-symlink path: $_link" >&2\n';
  sh += '    exit 1\n';
  sh += '  fi\n';
  sh += '  ln -sfn "$_target" "$_link"\n';
  sh += '}\n\n';

  sh += '# 1. Download and unpack Linux arm64 musl native modules\n';
  sh += 'mkdir -p /tmp/native\ncd /tmp/native\n';

  for (const ver of uniqueNativeSharpVersions) {
    sh += `wget -q https://registry.npmjs.org/@img/sharp-linuxmusl-arm64/-/sharp-linuxmusl-arm64-${ver}.tgz\n`;
  }
  for (const ver of uniqueLibvipsVersions) {
    sh += `wget -q https://registry.npmjs.org/@img/sharp-libvips-linuxmusl-arm64/-/sharp-libvips-linuxmusl-arm64-${ver}.tgz\n`;
  }
  sh += `wget -q https://registry.npmjs.org/@libsql/linux-arm64-musl/-/linux-arm64-musl-${libsqlVersion}.tgz\n\n`;

  sh += 'cd /app\n';
  for (const ver of uniqueNativeSharpVersions) {
    sh += `mkdir -p node_modules/.pnpm/@img+sharp-linuxmusl-arm64@${ver}/node_modules/@img/sharp-linuxmusl-arm64\n`;
    sh += `tar -xzf /tmp/native/sharp-linuxmusl-arm64-${ver}.tgz -C node_modules/.pnpm/@img+sharp-linuxmusl-arm64@${ver}/node_modules/@img/sharp-linuxmusl-arm64 --strip-components=1\n`;
  }
  for (const ver of uniqueLibvipsVersions) {
    sh += `mkdir -p node_modules/.pnpm/@img+sharp-libvips-linuxmusl-arm64@${ver}/node_modules/@img/sharp-libvips-linuxmusl-arm64\n`;
    sh += `tar -xzf /tmp/native/sharp-libvips-linuxmusl-arm64-${ver}.tgz -C node_modules/.pnpm/@img+sharp-libvips-linuxmusl-arm64@${ver}/node_modules/@img/sharp-libvips-linuxmusl-arm64 --strip-components=1\n`;
  }

  sh += `mkdir -p node_modules/.pnpm/@libsql+linux-arm64-musl@${libsqlVersion}/node_modules/@libsql/linux-arm64-musl\n`;
  sh += `tar -xzf /tmp/native/linux-arm64-musl-${libsqlVersion}.tgz -C node_modules/.pnpm/@libsql+linux-arm64-musl@${libsqlVersion}/node_modules/@libsql/linux-arm64-musl --strip-components=1\n\n`;
  sh += 'rm -rf /tmp/native\n\n';

  sh += '# 2. Re-create all standard symlinks\n';
  for (const item of commands) {
    sh += `safe_link "${item.target}" "${item.link}"\n`;
  }

  sh += '\n# 3. Add Linux arm64 specific links for each Sharp version\n';
  for (const sp of sharpPackages) {
    sh += `# Sharp ${sp.version} (${sp.pnpmDirName})\n`;
    sh += `safe_link "../../../@img+sharp-linuxmusl-arm64@${sp.nativeVersion}/node_modules/@img/sharp-linuxmusl-arm64" "node_modules/.pnpm/${sp.pnpmDirName}/node_modules/@img/sharp-linuxmusl-arm64"\n`;
    sh += `safe_link "../../../@img+sharp-libvips-linuxmusl-arm64@${sp.libvipsVersion}/node_modules/@img/sharp-libvips-linuxmusl-arm64" "node_modules/.pnpm/${sp.pnpmDirName}/node_modules/@img/sharp-libvips-linuxmusl-arm64"\n`;
    sh += `safe_link "../../../@img+sharp-libvips-linuxmusl-arm64@${sp.libvipsVersion}/node_modules/@img/sharp-libvips-linuxmusl-arm64" "node_modules/.pnpm/@img+sharp-linuxmusl-arm64@${sp.nativeVersion}/node_modules/@img/sharp-libvips-linuxmusl-arm64"\n`;
  }

  sh += '\n# 4. Top-level fallback links (mapped consistently to root Sharp)\n';
  sh += `safe_link "../.pnpm/@img+sharp-linuxmusl-arm64@${rootSharp.nativeVersion}/node_modules/@img/sharp-linuxmusl-arm64" "node_modules/@img/sharp-linuxmusl-arm64"\n`;
  sh += `safe_link "../.pnpm/@img+sharp-libvips-linuxmusl-arm64@${rootSharp.libvipsVersion}/node_modules/@img/sharp-libvips-linuxmusl-arm64" "node_modules/@img/sharp-libvips-linuxmusl-arm64"\n`;

  sh += '\n# 5. Libsql native links\n';
  sh += `safe_link "../../@libsql+linux-arm64-musl@${libsqlVersion}/node_modules/@libsql/linux-arm64-musl" "node_modules/.pnpm/node_modules/@libsql/linux-arm64-musl"\n`;
  sh += `safe_link "../.pnpm/@libsql+linux-arm64-musl@${libsqlVersion}/node_modules/@libsql/linux-arm64-musl" "node_modules/@libsql/linux-arm64-musl"\n`;

  return sh;
}

function generateSymlinks(options = {}) {
  const standaloneDir = path.resolve(options.standaloneDir || process.argv[2] || 'app/.next/standalone');
  const outputFile = path.resolve(options.outputFile || process.argv[3] || 'deploy/oracle/relink.sh');
  const write = options.write !== false;

  if (!fs.existsSync(standaloneDir)) {
    throw new Error(`Standalone directory not found at: ${standaloneDir}. Build standalone app first or provide custom path.`);
  }

  const commands = scanDir(standaloneDir, standaloneDir, []);
  const sharpPackages = discoverSharpPackages(standaloneDir);
  const libsqlVersion = discoverLibsqlVersion(standaloneDir);

  const shContent = generateRelinkScript({
    standaloneDir,
    commands,
    sharpPackages,
    libsqlVersion
  });

  if (write) {
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, shContent, { encoding: 'utf8' });
    console.log(`Generated complete relink.sh at ${outputFile} for ${sharpPackages.length} Sharp packages.`);
  }

  return {
    shContent,
    commands,
    sharpPackages,
    libsqlVersion,
    outputFile
  };
}

if (require.main === module) {
  try {
    generateSymlinks();
  } catch (err) {
    console.error(`generate-symlinks failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  scanDir,
  discoverSharpPackages,
  discoverLibsqlVersion,
  determineRootSharp,
  generateRelinkScript,
  generateSymlinks
};
