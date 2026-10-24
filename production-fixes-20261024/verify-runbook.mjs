import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

// Runs only inside a disposable local container with no network or Docker socket.
assert.equal(process.env.ISOLATED_RUNBOOK_TEST, 'true')
const document = fs.readFileSync('/runbooks/oracle-vps-arm64-deployment.md', 'utf8')
const section = (number) => {
  const text = document.split(`### Bước ${number}:`)[1]
  assert(text)
  const match = text.match(/```bash\r?\n([\s\S]*?)```/)
  assert(match)
  return match[1].replaceAll('\r', '')
}
const root = '/home/ubuntu/wings-travel'
const previousRelease = `${root}/releases/release-old`
const candidate = `${root}/releases/release-next`
const oldImage = `sha256:${'a'.repeat(64)}`
const nextImage = `sha256:${'b'.repeat(64)}`
const state = '/test-state'
const binaryDirectory = '/mock-bin'
fs.mkdirSync(binaryDirectory, { recursive: true })
const executable = (name, source) => {
  fs.writeFileSync(path.join(binaryDirectory, name), source, { mode: 0o755 })
}
executable('sudo', '#!/bin/sh\nexec "$@"\n')
executable('sleep', '#!/bin/sh\nexit 0\n')
executable('unzip', '#!/bin/sh\nexit 0\n')
// Alpine lacks GNU readlink -e; preserve its strict target-exists semantics.
executable('readlink', `#!/usr/local/bin/node
const fs = require('node:fs')
try {
  console.log(fs.realpathSync(process.argv.at(-1)))
} catch {
  process.exit(1)
}
`)
executable('docker', `#!/usr/local/bin/node
const fs = require('node:fs')
const args = process.argv.slice(2)
const oldImage = process.env.OLD_IMAGE
const nextImage = process.env.NEXT_IMAGE
const scenario = process.env.TEST_SCENARIO
const state = '/test-state'
if (args[0] === 'build') {
  fs.writeFileSync('/build-was-attempted', 'yes')
  process.exit(scenario === 'build-failure' ? 9 : 0)
}
if (args[0] === 'image' && args[1] === 'inspect') {
  console.log(args.at(-1))
  process.exit(0)
}
if (args[0] === 'inspect') {
  console.log(fs.readFileSync(state, 'utf8'))
  process.exit(0)
}
if (args[0] === 'compose') {
  const files = args.flatMap((value, index) => value === '-f' ? [args[index + 1]] : [])
  const override = fs.readFileSync(files[1], 'utf8')
  const desired = override.match(/image: (sha256:[a-f0-9]+)/)[1]
  if (desired === nextImage && scenario === 'activation-failure') process.exit(1)
  fs.writeFileSync(state, desired === nextImage && scenario === 'wrong-image' ? oldImage : desired)
  process.exit(0)
}
console.error('Unexpected mock Docker invocation', args)
process.exit(2)
`)
executable('curl', `#!/usr/local/bin/node
const fs = require('node:fs')
const image = fs.readFileSync('/test-state', 'utf8')
const ready = !(process.env.TEST_SCENARIO === 'readiness-failure' && image === process.env.NEXT_IMAGE)
console.log(JSON.stringify({status:ready ? 'ready' : 'starting',checks:{database:'up',redis:'up',leadDelivery:'configured'}}))
`)
executable('python3', `#!/usr/local/bin/node
const assert = require('node:assert/strict')
const fs = require('node:fs')
const data = JSON.parse(fs.readFileSync(process.argv.at(-1), 'utf8'))
if (data.status !== 'ready') process.exit(1)
assert.equal(data.checks.database, 'up')
assert.equal(data.checks.redis, 'up')
assert.equal(data.checks.leadDelivery, 'configured')
`)

const prepare = (scenario) => {
  fs.rmSync(root, { recursive: true, force: true })
  for (const release of [previousRelease, candidate]) {
    fs.mkdirSync(release, { recursive: true })
    fs.writeFileSync(`${release}/docker-compose.production.yml`, 'services:\n  app: {}\n')
    fs.writeFileSync(`${release}/OPS_IMAGE_ID`, oldImage)
  }
  fs.mkdirSync(`${root}/shared`)
  fs.writeFileSync(`${root}/shared/.env`, '')
  fs.writeFileSync(`${previousRelease}/APP_IMAGE_ID`, oldImage)
  fs.writeFileSync(`${candidate}/APP_IMAGE_ID`, nextImage)
  fs.writeFileSync(`${candidate}/relink.sh`, '#!/bin/sh\n')
  fs.writeFileSync(`${candidate}/release-clean.zip`, '')
  fs.symlinkSync(previousRelease, `${root}/current`)
  fs.symlinkSync(previousRelease, `${root}/previous`)
  fs.writeFileSync(state, scenario === 'preflight-mismatch' ? nextImage : oldImage)
  return {
    ...process.env,
    PATH: `${binaryDirectory}:${process.env.PATH}`,
    RELEASE_NAME: 'release-next',
    OLD_IMAGE: oldImage,
    NEXT_IMAGE: nextImage,
    TEST_SCENARIO: scenario,
  }
}

for (const scenario of ['success', 'activation-failure', 'readiness-failure', 'wrong-image', 'preflight-mismatch']) {
  const env = prepare(scenario)
  const result = spawnSync('/bin/sh', ['-c', section(7)], { env, encoding: 'utf8' })
  if (scenario === 'success') {
    assert.equal(result.status, 0, result.stderr)
    assert.equal(fs.realpathSync(`${root}/current`), candidate)
    assert.equal(fs.readFileSync(state, 'utf8'), nextImage)
    assert.equal(fs.readFileSync(`${candidate}/PREVIOUS_RELEASE`, 'utf8').trim(), previousRelease)
    assert.equal(fs.readFileSync(`${candidate}/PREVIOUS_IMAGE_ID`, 'utf8').trim(), oldImage)
  } else {
    assert.notEqual(result.status, 0, scenario)
    assert.equal(fs.realpathSync(`${root}/current`), previousRelease, scenario)
    assert.equal(fs.readFileSync(state, 'utf8'), scenario === 'preflight-mismatch' ? nextImage : oldImage)
    if (scenario === 'preflight-mismatch') {
      assert(!fs.existsSync(`${candidate}/PREVIOUS_IMAGE_ID`), 'Preflight must reject pairing before writing receipts')
    }
  }
  assert.equal(fs.realpathSync(`${root}/previous`), previousRelease, scenario)
  assert(!fs.readdirSync(root).some(name => /\.[0-9]+$/.test(name)), 'Temporary links left behind')
  console.log(JSON.stringify({scenario,pass:true,exitCode:result.status}))
}

const env = prepare('build-failure')
fs.unlinkSync(`${candidate}/APP_IMAGE_ID`)
const build = spawnSync('/bin/sh', ['-c', section(5)], { env, encoding: 'utf8' })
assert.notEqual(build.status, 0)
assert(fs.existsSync('/build-was-attempted'), build.stderr)
assert(!fs.existsSync(`${candidate}/APP_IMAGE_ID`), 'Failed build must not capture stale image')
console.log(JSON.stringify({scenario:'build-failure',pass:true,exitCode:build.status}))
console.log('PASS: 6 isolated runbook scenarios; no production access')
