import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { it } from 'vitest'

it('preserves traced scope packages while supplementing missing standalone dependencies', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'standalone-scope-'))
  const writeFixture = (relative: string, content: string) => {
    const destination = path.join(temporary, relative)
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    fs.writeFileSync(destination, content)
  }
  try {
    writeFixture('scripts/prepare-standalone.mjs', fs.readFileSync(path.resolve('scripts/prepare-standalone.mjs'), 'utf8'))
    writeFixture('.next/standalone/node_modules/@libsql/client/package.json', '{"name":"@libsql/client"}')
    writeFixture('.next/standalone/node_modules/@libsql/core/traced.txt', 'preserve traced package')
    writeFixture('node_modules/.pnpm/node_modules/@libsql/core/replacement.txt', 'must not replace traced package')
    writeFixture('node_modules/.pnpm/node_modules/@libsql/hrana-client/package.json', '{"name":"@libsql/hrana-client"}')
    writeFixture('node_modules/.pnpm/node_modules/@neon-rs/load/package.json', '{"name":"@neon-rs/load"}')
    writeFixture('node_modules/.pnpm/node_modules/libsql/package.json', '{"name":"libsql"}')
    writeFixture('node_modules/.pnpm/node_modules/promise-limit/package.json', '{"name":"promise-limit"}')
    writeFixture('node_modules/.pnpm/node_modules/js-base64/package.json', '{"name":"js-base64"}')
    writeFixture('node_modules/.pnpm/node_modules/ws/package.json', '{"name":"ws"}')
    writeFixture('.next/standalone/node_modules/libsql/stale.txt', 'old package file')
    for (let repeat = 0; repeat < 2; repeat += 1) {
      const run = spawnSync(process.execPath, ['scripts/prepare-standalone.mjs'], { cwd: temporary, encoding: 'utf8' })
      assert.equal(run.status, 0, run.stderr)
      const standalone = path.join(temporary, '.next/standalone/node_modules')
      assert.ok(fs.existsSync(path.join(standalone, '@libsql/client/package.json')))
      assert.equal(fs.readFileSync(path.join(standalone, '@libsql/core/traced.txt'), 'utf8'), 'preserve traced package')
      assert.equal(fs.existsSync(path.join(standalone, '@libsql/core/replacement.txt')), false)
      assert.ok(fs.existsSync(path.join(standalone, '@libsql/hrana-client/package.json')))
      assert.ok(fs.existsSync(path.join(standalone, '@neon-rs/load/package.json')))
      assert.ok(fs.existsSync(path.join(standalone, 'libsql/package.json')))
      assert.ok(fs.existsSync(path.join(standalone, 'promise-limit/package.json')))
      assert.ok(fs.existsSync(path.join(standalone, 'js-base64/package.json')))
      assert.ok(fs.existsSync(path.join(standalone, 'ws/package.json')))
      assert.equal(fs.existsSync(path.join(standalone, 'libsql/stale.txt')), false)
    }
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true })
  }
})
