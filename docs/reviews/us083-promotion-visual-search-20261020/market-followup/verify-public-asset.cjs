const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

async function run() {
  const expected = JSON.parse(fs.readFileSync(path.join(__dirname, 'expected-promotion-asset.json'), 'utf8').replace(/^\uFEFF/, ''))
  const response = await fetch(`https://wingsgo.vn/_next/${expected.assetPath}`, { signal: AbortSignal.timeout(30000) })
  assert.equal(response.status, 200)
  const bytes = Buffer.from(await response.arrayBuffer())
  const actual = crypto.createHash('sha256').update(bytes).digest('hex')
  assert.equal(actual, expected.sha256, 'Public promotion asset differs from verified build')
  assert.ok(bytes.toString('utf8').includes('font-extrabold text-red-600 dark:text-red-400'))
  const proof = { ...expected, timestamp: new Date().toISOString(), actualSHA256: actual, bytes: bytes.length, assertions: 'PASS exact public asset bytes match verified promotion build' }
  fs.writeFileSync(path.join(__dirname, 'production-asset-proof.json'), JSON.stringify(proof, null, 2))
  console.log(JSON.stringify(proof, null, 2))
}

run().catch((error) => { console.error(error); process.exitCode = 1 })
