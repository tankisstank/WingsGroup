#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

function getRuntimePlatform() {
  const platform = process.platform;
  const arch = process.arch;
  let libc = '';
  if (platform === 'linux') {
    try {
      const detectLibc = require('detect-libc');
      if (detectLibc.isNonGlibcLinuxSync()) libc = 'musl';
    } catch (_) {
      libc = 'musl';
    }
  }
  return `${platform}${libc}-${arch}`;
}

function resolveModule(moduleName, searchPaths = [], rootDir = null) {
  const candidates = [];
  if (searchPaths && searchPaths.length) candidates.push(...searchPaths);
  if (rootDir) candidates.push(rootDir, path.join(rootDir, 'app'), path.join(rootDir, 'node_modules'));
  const envRoot = process.env.APP_ROOT;
  if (envRoot) candidates.push(envRoot, path.join(envRoot, 'app'), path.join(envRoot, 'node_modules'));
  candidates.push(process.cwd(), '/app');

  for (const p of candidates) {
    try {
      return require.resolve(moduleName, { paths: [p] });
    } catch (_) {}
  }
  throw new Error(`Cannot resolve required module '${moduleName}' in candidate paths: ${candidates.join(', ')}`);
}

function findPackageJson(entryPath) {
  let dir = path.dirname(entryPath);
  while (dir && dir !== path.dirname(dir)) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) return pkgPath;
    dir = path.dirname(dir);
  }
  return null;
}

function assertContextNativeParity({ contextName, sharpEntry, targetPlatform }) {
  const platform = targetPlatform || getRuntimePlatform();
  const sharpPkgPath = findPackageJson(sharpEntry);
  assert(sharpPkgPath, `[${contextName}] Cannot locate package.json for Sharp at ${sharpEntry}`);
  const sharpManifest = JSON.parse(fs.readFileSync(sharpPkgPath, 'utf8'));
  const sharpRequire = createRequire(sharpEntry);

  const nativePkgName = `@img/sharp-${platform}`;
  const libvipsPkgName = `@img/sharp-libvips-${platform}`;
  const expectedNativeVer = sharpManifest.optionalDependencies && sharpManifest.optionalDependencies[nativePkgName];

  if (!expectedNativeVer) {
    throw new Error(`[${contextName}] Sharp manifest at ${sharpPkgPath} does not declare required native dependency '${nativePkgName}' in optionalDependencies`);
  }

  // 1. Resolve native package manifest via exported /package alias (NOT /package.json)
  const nativeManifestPath = sharpRequire.resolve(`${nativePkgName}/package`);
  const nativeManifest = JSON.parse(fs.readFileSync(nativeManifestPath, 'utf8'));
  assert.strictEqual(
    nativeManifest.version,
    expectedNativeVer,
    `[${contextName}] Native manifest version mismatch: Sharp ${sharpManifest.version} expects ${nativePkgName}@${expectedNativeVer}, but resolved @${nativeManifest.version} at ${nativeManifestPath}`
  );

  // 2. Resolve native binary binding and inspect realpath & package boundary
  const nativeBindingPath = sharpRequire.resolve(`${nativePkgName}/sharp.node`);
  const nativeBindingRealpath = fs.realpathSync(nativeBindingPath);
  const realManifestDir = path.dirname(fs.realpathSync(nativeManifestPath));

  const rel = path.relative(realManifestDir, nativeBindingRealpath);
  assert(
    !rel.startsWith('..') && !path.isAbsolute(rel),
    `[${contextName}] Native binding realpath '${nativeBindingRealpath}' is outside package boundary '${realManifestDir}'`
  );

  // 3. Resolve libvips from native package's context if declared
  const expectedLibvipsVer = sharpManifest.optionalDependencies[libvipsPkgName];
  let libvipsManifestPath = null;
  let libvipsVersion = null;
  if (expectedLibvipsVer) {
    const nativeRequire = createRequire(nativeManifestPath);
    libvipsManifestPath = nativeRequire.resolve(`${libvipsPkgName}/package`);
    const libvipsManifest = JSON.parse(fs.readFileSync(libvipsManifestPath, 'utf8'));
    libvipsVersion = libvipsManifest.version;
    assert.strictEqual(
      libvipsVersion,
      expectedLibvipsVer,
      `[${contextName}] Libvips manifest version mismatch: expected ${libvipsPkgName}@${expectedLibvipsVer}, but resolved @${libvipsVersion} at ${libvipsManifestPath}`
    );
  }

  return {
    contextName,
    sharpEntry,
    sharpVersion: sharpManifest.version,
    nativeManifestPath,
    nativeVersion: nativeManifest.version,
    nativeBindingPath,
    nativeBindingRealpath,
    realManifestDir,
    libvipsManifestPath,
    libvipsVersion
  };
}

async function getSourceBuffer(samplePath, rootDir, sharpInstance) {
  if (samplePath && fs.existsSync(samplePath)) {
    return fs.readFileSync(samplePath);
  }
  const bases = [rootDir, process.cwd(), '/app'].filter(Boolean);
  const relativeCandidates = [
    'public/brand/wingsgroup/standards/airlines-and-partners.webp',
    'app/public/brand/wingsgroup/standards/airlines-and-partners.webp',
    'public/website-template-OG.webp',
    'app/public/website-template-OG.webp'
  ];

  for (const b of bases) {
    for (const rel of relativeCandidates) {
      const full = path.resolve(b, rel);
      if (fs.existsSync(full)) return fs.readFileSync(full);
    }
  }

  return sharpInstance({
    create: {
      width: 1440,
      height: 810,
      channels: 3,
      background: { r: 64, g: 128, b: 192 }
    }
  }).webp({ quality: 80 }).toBuffer();
}

async function verifySharpRuntime(options = {}) {
  const rootDir = options.rootDir || null;
  const runtimePlatform = getRuntimePlatform();
  const isTargetArm = runtimePlatform === 'linuxmusl-arm64';

  const result = {
    checkedAt: new Date().toISOString(),
    hostPlatform: `${process.platform}-${process.arch}`,
    verifiedPlatform: runtimePlatform,
    executionType: isTargetArm ? 'arm64-target' : 'host-control',
    nodeVersion: process.version,
    contexts: {},
    transforms: {}
  };

  // 1. Resolve and verify App Sharp
  const appSharpPath = resolveModule('sharp', [], rootDir);
  const appSharp = require(appSharpPath);
  const appParity = assertContextNativeParity({
    contextName: 'app',
    sharpEntry: appSharpPath,
    targetPlatform: runtimePlatform
  });
  result.contexts.app = appParity;

  // 2. Resolve and verify Next Image Optimizer and Next Sharp
  const nextOptimizerPath = resolveModule('next/dist/server/image-optimizer', [], rootDir);
  const nextOptimizer = require(nextOptimizerPath);
  assert(nextOptimizer && typeof nextOptimizer.optimizeImage === 'function', 'Next image-optimizer failed to export optimizeImage');

  const nextSharpPath = resolveModule('sharp', [path.dirname(nextOptimizerPath)], rootDir);
  const nextSharp = require(nextSharpPath);
  const nextParity = assertContextNativeParity({
    contextName: 'next',
    sharpEntry: nextSharpPath,
    targetPlatform: runtimePlatform
  });
  result.contexts.next = nextParity;

  // 3. Inspect and strictly assert loaded .node binaries in require.cache
  const loadedSharpNodes = Object.keys(require.cache)
    .filter(k => k.endsWith('.node') && (k.includes('sharp') || k.includes('@img')))
    .map(k => {
      try {
        return fs.realpathSync(k);
      } catch (_) {
        return k;
      }
    });

  assert(loadedSharpNodes.length > 0, 'No Sharp .node binary found in require.cache after loading Sharp');
  assert(
    loadedSharpNodes.includes(appParity.nativeBindingRealpath),
    `Expected App native binding '${appParity.nativeBindingRealpath}' not found in require.cache: [${loadedSharpNodes.join(', ')}]`
  );
  assert(
    loadedSharpNodes.includes(nextParity.nativeBindingRealpath),
    `Expected Next native binding '${nextParity.nativeBindingRealpath}' not found in require.cache: [${loadedSharpNodes.join(', ')}]`
  );

  const expectedPaths = new Set([appParity.nativeBindingRealpath, nextParity.nativeBindingRealpath]);
  for (const loadedNode of loadedSharpNodes) {
    assert(
      expectedPaths.has(loadedNode),
      `Unexpected Sharp .node in require.cache: '${loadedNode}'. Expected only: [${Array.from(expectedPaths).join(', ')}]`
    );
  }

  result.loadedNativeBindings = loadedSharpNodes;

  // 4. Source image preparation
  const sourceBuffer = await getSourceBuffer(options.samplePath, rootDir, appSharp);
  const srcMeta = await appSharp(sourceBuffer).metadata();
  result.sourceImage = {
    width: srcMeta.width,
    height: srcMeta.height,
    format: srcMeta.format,
    bytes: sourceBuffer.length
  };

  // 5. Mandatory App Sharp 640 resize WebP
  const appResizedWebp = await appSharp(sourceBuffer).resize(640).webp({ quality: 80 }).toBuffer();
  const appWebpMeta = await appSharp(appResizedWebp).metadata();
  assert.strictEqual(appWebpMeta.width, 640, `App Sharp WebP resize failed: expected 640, got ${appWebpMeta.width}`);
  result.transforms.appSharpWebp = {
    width: appWebpMeta.width,
    height: appWebpMeta.height,
    format: appWebpMeta.format,
    bytes: appResizedWebp.length
  };

  // 6. Mandatory App Sharp 640 resize AVIF (P3-4: required for Payload AVIF profiles)
  const appResizedAvif = await appSharp(sourceBuffer).resize(640).avif({ quality: 60 }).toBuffer();
  const appAvifMeta = await appSharp(appResizedAvif).metadata();
  assert.strictEqual(appAvifMeta.width, 640, `App Sharp AVIF resize failed: expected 640, got ${appAvifMeta.width}`);
  assert.strictEqual(appAvifMeta.format, 'heif', `App Sharp AVIF format mismatch: expected heif, got ${appAvifMeta.format}`);
  assert.strictEqual(appAvifMeta.compression, 'av1', `App Sharp AVIF compression mismatch: expected av1, got ${appAvifMeta.compression}`);
  result.transforms.appSharpAvif = {
    width: appAvifMeta.width,
    height: appAvifMeta.height,
    format: appAvifMeta.format,
    compression: appAvifMeta.compression,
    bytes: appResizedAvif.length
  };

  // 7. Mandatory Next Sharp direct 640 resize
  const nextResizedWebp = await nextSharp(sourceBuffer).resize(640).webp({ quality: 80 }).toBuffer();
  const nextWebpMeta = await nextSharp(nextResizedWebp).metadata();
  assert.strictEqual(nextWebpMeta.width, 640, `Next Sharp WebP resize failed: expected 640, got ${nextWebpMeta.width}`);
  result.transforms.nextSharpWebp = {
    width: nextWebpMeta.width,
    height: nextWebpMeta.height,
    format: nextWebpMeta.format,
    bytes: nextResizedWebp.length
  };

  // 8. Mandatory Next.js optimizeImage WebP (width: 640)
  const optWebpBuffer = await nextOptimizer.optimizeImage({
    buffer: sourceBuffer,
    contentType: 'image/webp',
    quality: 80,
    width: 640
  });
  const optWebpMeta = await nextSharp(optWebpBuffer).metadata();
  assert.strictEqual(optWebpMeta.width, 640, `optimizeImage WebP returned width ${optWebpMeta.width} instead of 640`);
  assert.strictEqual(optWebpMeta.format, 'webp');
  result.transforms.optimizeImageWebp = {
    width: optWebpMeta.width,
    height: optWebpMeta.height,
    format: optWebpMeta.format,
    bytes: optWebpBuffer.length
  };

  // 9. Mandatory Next.js optimizeImage PNG (width: 640)
  const optPngBuffer = await nextOptimizer.optimizeImage({
    buffer: sourceBuffer,
    contentType: 'image/png',
    quality: 80,
    width: 640
  });
  const optPngMeta = await nextSharp(optPngBuffer).metadata();
  assert.strictEqual(optPngMeta.width, 640, `optimizeImage PNG returned width ${optPngMeta.width} instead of 640`);
  assert.strictEqual(optPngMeta.format, 'png');
  result.transforms.optimizeImagePng = {
    width: optPngMeta.width,
    height: optPngMeta.height,
    format: optPngMeta.format,
    bytes: optPngBuffer.length
  };

  // 10. Mandatory Next.js optimizeImage AVIF (width: 640)
  const optAvifBuffer = await nextOptimizer.optimizeImage({
    buffer: sourceBuffer,
    contentType: 'image/avif',
    quality: 60,
    width: 640
  });
  const optAvifMeta = await nextSharp(optAvifBuffer).metadata();
  assert.strictEqual(optAvifMeta.width, 640, `optimizeImage AVIF returned width ${optAvifMeta.width} instead of 640`);
  assert.strictEqual(optAvifMeta.format, 'heif');
  assert.strictEqual(optAvifMeta.compression, 'av1');
  result.transforms.optimizeImageAvif = {
    width: optAvifMeta.width,
    height: optAvifMeta.height,
    format: optAvifMeta.format,
    compression: optAvifMeta.compression,
    bytes: optAvifBuffer.length
  };

  result.status = 'pass';
  return result;
}

function parseCliArgs() {
  const args = process.argv.slice(2);
  let rootDir = null;
  let samplePath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root' && args[i + 1]) {
      rootDir = path.resolve(args[++i]);
    } else if (!args[i].startsWith('--') && !samplePath) {
      samplePath = path.resolve(args[i]);
    }
  }

  return { rootDir, samplePath };
}

async function main() {
  const cli = parseCliArgs();
  try {
    console.log('>>> Running Sharp Runtime Verifier...');
    const result = await verifySharpRuntime(cli);
    console.log(JSON.stringify(result, null, 2));
    console.log('>>> Runtime verification SUCCESSFUL!');
    process.exit(0);
  } catch (err) {
    console.error('>>> Runtime verification FAILED:');
    console.error(err.message || err);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  verifySharpRuntime,
  assertContextNativeParity,
  getRuntimePlatform,
  getSourceBuffer,
  resolveModule,
  findPackageJson
};
