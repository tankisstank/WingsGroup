import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { updateWingsGoHotlineInPayload } from './candidate/app/scripts/updateWingsGoHotline'

const requireFromApp = createRequire(new URL('./candidate/app/package.json', import.meta.url))
requireFromApp('dotenv').config({ quiet: true })
const expectedDatabase = fileURLToPath(new URL('./candidate/app/payload-tourplatform.db', import.meta.url))
assert.equal(path.resolve(process.env.DATABASE_URL!.slice(5)), expectedDatabase)
assert.equal(process.env.PAYLOAD_DB_PUSH, 'false')
assert.equal(process.env.REDIS_URL, '')

const { getPayload } = await import(pathToFileURL(requireFromApp.resolve('payload')).href)
const config = (await import('./candidate/app/src/payload.config')).default
const payload = await getPayload({ config })
try {
  const sites = await payload.find({ collection: 'sites', where: { code: { equals: 'wings-go' } }, depth: 0 })
  assert.equal(sites.docs.length, 1)
  const settings = await payload.find({ collection: 'site-settings', where: { site: { equals: sites.docs[0].id } }, depth: 0 })
  assert.equal(settings.docs.length, 1)
  const target = settings.docs[0]
  // Reproduce the production old value only in this disposable local snapshot.
  await payload.update({ collection: 'site-settings', id: target.id, data: { supportPhone: '0912910101' }, context: { seed: true }, overrideAccess: true })
  const readAll = async () => (await payload.find({ collection: 'site-settings', depth: 0, limit: 100, sort: 'id', overrideAccess: true })).docs
  const before = await readAll()
  assert.ok(before.length >= 2)
  const plan = await updateWingsGoHotlineInPayload(payload)
  assert.equal(plan.status, 'planned')
  assert.deepEqual(await readAll(), before)
  const apply = await updateWingsGoHotlineInPayload(payload, { apply: true })
  assert.equal(apply.status, 'updated')
  const after = await readAll()
  const comparable = (documents) => documents.map((document) => {
    if (document.id !== target.id) return document
    const { supportPhone, updatedAt, ...rest } = document
    return rest
  })
  assert.deepEqual(comparable(after), comparable(before))
  assert.equal(after.find(document => document.id === target.id)?.supportPhone, '0948786775')
  const repeat = await updateWingsGoHotlineInPayload(payload, { apply: true })
  assert.equal(repeat.status, 'noop')
  assert.deepEqual(await readAll(), after)
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    status: 'PASS',
    environment: 'owned local SQLite snapshot only',
    originalFixturePhone: target.supportPhone,
    reproducedProductionPhone: '0912910101',
    settingsCompared: after.length,
    plan, apply, repeat,
    otherFieldsAndTenantsUnchanged: true,
    repeatDoesNotChangeUpdatedAt: true,
  }, null, 2))
} finally {
  await payload.destroy()
}
