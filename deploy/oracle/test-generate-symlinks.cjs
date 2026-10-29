const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { generateSymlinks, discoverSharpPackages } = require('./generate-symlinks.js');
const { assertContextNativeParity } = require('./verify-sharp-arm64.cjs');

function createFixtureDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `wingstravel-symlink-test-${prefix}-`));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function testDualSharpGeneration() {
  const fixtureDir = createFixtureDir('dual-sharp');
  const relinkOutput = path.join(fixtureDir, 'relink.sh');

  try {
    writeJson(path.join(fixtureDir, 'node_modules/.pnpm/sharp@0.34.2/node_modules/sharp/package.json'), {
      name: 'sharp',
      version: '0.34.2',
      optionalDependencies: {
        '@img/sharp-linuxmusl-arm64': '0.34.2',
        '@img/sharp-libvips-linuxmusl-arm64': '1.1.0'
      }
    });

    writeJson(path.join(fixtureDir, 'node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/package.json'), {
      name: 'sharp',
      version: '0.34.5',
      optionalDependencies: {
        '@img/sharp-linuxmusl-arm64': '0.34.5',
        '@img/sharp-libvips-linuxmusl-arm64': '1.2.4'
      }
    });

    writeJson(path.join(fixtureDir, 'package.json'), {
      name: 'wingstravel-standalone',
      dependencies: {
        sharp: '0.34.2'
      }
    });
    fs.mkdirSync(path.join(fixtureDir, 'node_modules'), { recursive: true });
    writeJson(path.join(fixtureDir, 'node_modules/sharp/package.json'), {
      name: 'sharp',
      version: '0.34.2'
    });

    writeJson(path.join(fixtureDir, 'node_modules/.pnpm/libsql@0.4.7/node_modules/libsql/package.json'), {
      name: 'libsql',
      version: '0.4.7',
      optionalDependencies: {
        '@libsql/linux-arm64-musl': '0.4.7'
      }
    });

    const result = generateSymlinks({
      standaloneDir: fixtureDir,
      outputFile: relinkOutput,
      write: true
    });

    const sh = fs.readFileSync(relinkOutput, 'utf8');

    // 1. Download section contains exact native and libvips versions for BOTH Sharp 0.34.2 and 0.34.5
    assert(sh.includes('sharp-linuxmusl-arm64-0.34.2.tgz'), 'Must download sharp-linuxmusl-arm64-0.34.2.tgz');
    assert(sh.includes('sharp-linuxmusl-arm64-0.34.5.tgz'), 'Must download sharp-linuxmusl-arm64-0.34.5.tgz');
    assert(sh.includes('sharp-libvips-linuxmusl-arm64-1.1.0.tgz'), 'Must download sharp-libvips-linuxmusl-arm64-1.1.0.tgz');
    assert(sh.includes('sharp-libvips-linuxmusl-arm64-1.2.4.tgz'), 'Must download sharp-libvips-linuxmusl-arm64-1.2.4.tgz');

    // 2. Libsql retained
    assert(sh.includes('linux-arm64-musl-0.4.7.tgz'), 'Must retain and download libsql 0.4.7');
    assert(sh.includes('@libsql+linux-arm64-musl@0.4.7/node_modules/@libsql/linux-arm64-musl'), 'Must unpack libsql 0.4.7');
    assert(sh.includes('safe_link "../../@libsql+linux-arm64-musl@0.4.7/node_modules/@libsql/linux-arm64-musl" "node_modules/.pnpm/node_modules/@libsql/linux-arm64-musl"'), 'Must link libsql in .pnpm/node_modules');
    assert(sh.includes('safe_link "../.pnpm/@libsql+linux-arm64-musl@0.4.7/node_modules/@libsql/linux-arm64-musl" "node_modules/@libsql/linux-arm64-musl"'), 'Must link libsql in root node_modules');

    // 3. Own version linkage for Sharp 0.34.2
    assert(sh.includes('safe_link "../../../@img+sharp-linuxmusl-arm64@0.34.2/node_modules/@img/sharp-linuxmusl-arm64" "node_modules/.pnpm/sharp@0.34.2/node_modules/@img/sharp-linuxmusl-arm64"'), 'Sharp 0.34.2 must link native 0.34.2');
    assert(sh.includes('safe_link "../../../@img+sharp-libvips-linuxmusl-arm64@1.1.0/node_modules/@img/sharp-libvips-linuxmusl-arm64" "node_modules/.pnpm/sharp@0.34.2/node_modules/@img/sharp-libvips-linuxmusl-arm64"'), 'Sharp 0.34.2 must link libvips 1.1.0');

    // 4. Own version linkage for Sharp 0.34.5
    assert(sh.includes('safe_link "../../../@img+sharp-linuxmusl-arm64@0.34.5/node_modules/@img/sharp-linuxmusl-arm64" "node_modules/.pnpm/sharp@0.34.5/node_modules/@img/sharp-linuxmusl-arm64"'), 'Sharp 0.34.5 must link native 0.34.5');
    assert(sh.includes('safe_link "../../../@img+sharp-libvips-linuxmusl-arm64@1.2.4/node_modules/@img/sharp-libvips-linuxmusl-arm64" "node_modules/.pnpm/sharp@0.34.5/node_modules/@img/sharp-libvips-linuxmusl-arm64"'), 'Sharp 0.34.5 must link libvips 1.2.4');

    // 5. No cross-version fallback
    assert(!sh.includes('sharp-linuxmusl-arm64@0.34.2/node_modules/@img/sharp-linuxmusl-arm64" "node_modules/.pnpm/sharp@0.34.5'), 'Sharp 0.34.5 must never link native 0.34.2');
    assert(!sh.includes('sharp-libvips-linuxmusl-arm64@1.1.0/node_modules/@img/sharp-libvips-linuxmusl-arm64" "node_modules/.pnpm/sharp@0.34.5'), 'Sharp 0.34.5 must never link libvips 1.1.0');
    assert(!sh.includes('sharp-linuxmusl-arm64@0.34.5/node_modules/@img/sharp-linuxmusl-arm64" "node_modules/.pnpm/sharp@0.34.2'), 'Sharp 0.34.2 must never link native 0.34.5');
    assert(!sh.includes('sharp-libvips-linuxmusl-arm64@1.2.4/node_modules/@img/sharp-libvips-linuxmusl-arm64" "node_modules/.pnpm/sharp@0.34.2'), 'Sharp 0.34.2 must never link libvips 1.2.4');

    // 6. Root mapping consistently maps root Sharp (0.34.2)
    assert(sh.includes('safe_link "../.pnpm/@img+sharp-linuxmusl-arm64@0.34.2/node_modules/@img/sharp-linuxmusl-arm64" "node_modules/@img/sharp-linuxmusl-arm64"'), 'Top-level fallback must map to root Sharp native 0.34.2');
    assert(sh.includes('safe_link "../.pnpm/@img+sharp-libvips-linuxmusl-arm64@1.1.0/node_modules/@img/sharp-libvips-linuxmusl-arm64" "node_modules/@img/sharp-libvips-linuxmusl-arm64"'), 'Top-level fallback must map to root Sharp libvips 1.1.0');

    // 7. safe_link never uses rm -rf on link paths and fails closed on non-symlink collision
    assert(!sh.includes('rm -rf "$_link"'), 'safe_link must never rm -rf on link target');
    assert(sh.includes('Refusing to overwrite non-symlink path'), 'safe_link must fail closed on non-symlink collision');

    return {
      status: 'pass',
      discoveredCount: result.sharpPackages.length,
      packages: result.sharpPackages
    };
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
}

function testUnresolvedManifestFailClosed() {
  const fixtureDir = createFixtureDir('fail-closed');
  try {
    writeJson(path.join(fixtureDir, 'node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/package.json'), {
      name: 'sharp',
      version: '0.34.5',
      optionalDependencies: {
        '@img/sharp-linuxmusl-arm64': '0.34.5'
      }
    });

    let threw = false;
    try {
      discoverSharpPackages(fixtureDir);
    } catch (err) {
      threw = true;
      assert(err.message.includes('missing optionalDependency'), `Expected error message about missing optionalDependency, got: ${err.message}`);
    }

    assert(threw, 'discoverSharpPackages must fail closed when optionalDependency is missing');
    return { status: 'pass' };
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
}

function testDeploymentCallersConfigured() {
  const dockerfilePath = path.resolve('deploy/oracle/Dockerfile.standalone');
  assert(fs.existsSync(dockerfilePath), 'Dockerfile.standalone must exist');
  const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');

  assert(!dockerfileContent.includes('LD_LIBRARY_PATH'), 'Dockerfile.standalone must not set hardcoded global LD_LIBRARY_PATH');
  assert(dockerfileContent.includes('verify-sharp-arm64.cjs'), 'Dockerfile.standalone must include verify-sharp-arm64.cjs');
  assert(dockerfileContent.includes('node verify-sharp-arm64.cjs'), 'Dockerfile.standalone must execute node verify-sharp-arm64.cjs');

  const packagePs1Path = path.resolve('deploy/oracle/package-release.ps1');
  assert(fs.existsSync(packagePs1Path), 'package-release.ps1 must exist');
  const packagePs1Content = fs.readFileSync(packagePs1Path, 'utf8');
  assert(packagePs1Content.includes('verify-sharp-arm64.cjs'), 'package-release.ps1 must copy verify-sharp-arm64.cjs');
  assert(packagePs1Content.includes('LASTEXITCODE'), 'package-release.ps1 must check LASTEXITCODE after node generate-symlinks.js');

  return { status: 'pass' };
}

function testNativeManifestParityMismatch() {
  const fixtureDir = createFixtureDir('parity-mismatch');
  try {
    const sharpDir = path.join(fixtureDir, 'node_modules/sharp');
    const sharpEntry = path.join(sharpDir, 'lib/index.js');
    fs.mkdirSync(path.dirname(sharpEntry), { recursive: true });
    fs.writeFileSync(sharpEntry, '// mock entry', 'utf8');

    // Sharp claims 0.34.5 in JS
    writeJson(path.join(sharpDir, 'package.json'), {
      name: 'sharp',
      version: '0.34.5',
      main: 'lib/index.js',
      optionalDependencies: {
        '@img/sharp-linuxmusl-arm64': '0.34.5',
        '@img/sharp-libvips-linuxmusl-arm64': '1.2.4'
      }
    });

    const nativePkgDir = path.join(sharpDir, 'node_modules/@img/sharp-linuxmusl-arm64');
    const inertNodePath = path.join(nativePkgDir, 'lib/sharp-linuxmusl-arm64.node');
    fs.mkdirSync(path.dirname(inertNodePath), { recursive: true });
    fs.writeFileSync(inertNodePath, Buffer.from([0x7f, 0x45, 0x4c, 0x46])); // Inert ELF header

    // Case 1 (Negative): Resolved native package is 0.34.2 (Exact production fault: JS 0.34.5 resolves native 0.34.2)
    writeJson(path.join(nativePkgDir, 'package.json'), {
      name: '@img/sharp-linuxmusl-arm64',
      version: '0.34.2',
      exports: {
        './package': './package.json',
        './sharp.node': './lib/sharp-linuxmusl-arm64.node'
      }
    });

    let threwMismatch = false;
    try {
      assertContextNativeParity({
        contextName: 'test-negative-mismatch',
        sharpEntry,
        targetPlatform: 'linuxmusl-arm64'
      });
    } catch (err) {
      threwMismatch = true;
      assert(err.message.includes('Native manifest version mismatch'), `Expected mismatch error, got: ${err.message}`);
    }
    assert(threwMismatch, 'assertContextNativeParity must fail closed when resolved native package version differs from Sharp optionalDependencies');

    // Case 2 (Negative): Missing .node binary file
    writeJson(path.join(nativePkgDir, 'package.json'), {
      name: '@img/sharp-linuxmusl-arm64',
      version: '0.34.5',
      exports: {
        './package': './package.json',
        './sharp.node': './lib/nonexistent-binary.node'
      }
    });

    let threwMissingBinary = false;
    try {
      assertContextNativeParity({
        contextName: 'test-negative-missing-binary',
        sharpEntry,
        targetPlatform: 'linuxmusl-arm64'
      });
    } catch (err) {
      threwMissingBinary = true;
      assert(err.message.includes('Cannot find module') || err.message.includes('ENOENT'), `Expected missing binary error, got: ${err.message}`);
    }
    assert(threwMissingBinary, 'assertContextNativeParity must fail closed when native .node binary is missing');

    // Case 3 (Positive): Matching native package 0.34.5 + libvips 1.2.4 + existing real binary
    writeJson(path.join(nativePkgDir, 'package.json'), {
      name: '@img/sharp-linuxmusl-arm64',
      version: '0.34.5',
      exports: {
        './package': './package.json',
        './sharp.node': './lib/sharp-linuxmusl-arm64.node'
      }
    });

    const libvipsPkgDir = path.join(nativePkgDir, 'node_modules/@img/sharp-libvips-linuxmusl-arm64');
    writeJson(path.join(libvipsPkgDir, 'package.json'), {
      name: '@img/sharp-libvips-linuxmusl-arm64',
      version: '1.2.4',
      exports: {
        './package': './package.json'
      }
    });

    const positiveResult = assertContextNativeParity({
      contextName: 'test-positive',
      sharpEntry,
      targetPlatform: 'linuxmusl-arm64'
    });
    assert.strictEqual(positiveResult.nativeVersion, '0.34.5');
    assert.strictEqual(positiveResult.libvipsVersion, '1.2.4');
    assert(positiveResult.nativeBindingRealpath.endsWith('sharp-linuxmusl-arm64.node'));

    return { status: 'pass' };
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
}

function getEvidencePath() {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--evidence' && args[i + 1]) {
      return path.resolve(args[i + 1]);
    }
  }
  if (process.env.EVIDENCE_FILE) {
    return path.resolve(process.env.EVIDENCE_FILE);
  }
  if (process.env.EVIDENCE_DIR) {
    return path.join(path.resolve(process.env.EVIDENCE_DIR), 'test-result.json');
  }
  return null;
}

function main() {
  console.log('>>> Running generate-symlinks self-tests...');
  const results = {};

  const dualResult = testDualSharpGeneration();
  console.log('✓ Dual Sharp generation & own version linkage asserted.');
  results.dualSharp = dualResult;

  const failClosedResult = testUnresolvedManifestFailClosed();
  console.log('✓ Unresolved manifest fail-closed asserted.');
  results.failClosed = failClosedResult;

  const callersResult = testDeploymentCallersConfigured();
  console.log('✓ Deployment callers (Dockerfile.standalone and package-release.ps1) asserted.');
  results.deploymentCallers = callersResult;

  const parityMismatchResult = testNativeManifestParityMismatch();
  console.log('✓ P2-1 Native manifest mismatch, missing binary, and matching cases asserted.');
  results.nativeManifestParityMismatch = parityMismatchResult;

  const summary = {
    timestamp: new Date().toISOString(),
    status: 'passed',
    checks: results
  };

  const evidencePath = getEvidencePath();
  if (evidencePath) {
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    fs.writeFileSync(evidencePath, JSON.stringify(summary, null, 2), 'utf8');
    console.log(`>>> All self-tests PASSED! Evidence written to ${evidencePath}`);
  } else {
    console.log('>>> All self-tests PASSED!');
    console.log(JSON.stringify(summary, null, 2));
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  testDualSharpGeneration,
  testUnresolvedManifestFailClosed,
  testDeploymentCallersConfigured,
  testNativeManifestParityMismatch
};
