import assert from 'node:assert/strict'
import { createLocalReq, getPayload, type Payload } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import config from '@payload-config'
import { updateWingsGroupHotlineInPayload } from './updateWingsGroupHotline'
import { invalidateSettingsCache } from '../src/infrastructure/cache/tenantCache'

const releaseSha = '6a0dac015340f7279bfe352e377193c38b3d0d91'
const mode = process.argv[2] || 'inspect'
assert.equal(process.env.WINGSTRAVEL_RELEASE_SHA, releaseSha)
assert.equal(process.env.PAYLOAD_DB_PUSH, 'false')
const database = new URL(process.env.DATABASE_URL!)
assert.equal(database.hostname, 'postgres')
const targetDatabase = database.pathname.slice(1)
assert.ok(['wingstravel', 'us085_restore_6a0dac0'].includes(targetDatabase))
assert.ok(['inspect', 'apply', 'rehearse'].includes(mode))
if (mode === 'apply') assert.equal(targetDatabase, 'wingstravel')
if (mode === 'rehearse') assert.equal(targetDatabase, 'us085_restore_6a0dac0')
const payload = await getPayload({ config })
let transactionID: string | number | null = null
try {
  const req = await createLocalReq({ locale: 'vi' }, payload)
  const sites = await payload.find({ collection: 'sites', limit: 100, depth: 0, req })
  const groupSites = sites.docs.filter((site) => site.code === 'wings-group')
  assert.equal(groupSites.length, 1)
  const groupSite = groupSites[0]
  if (mode !== 'inspect') {
    transactionID = await payload.db.beginTransaction()
    assert.ok(transactionID)
    req.transactionID = transactionID
    const transaction = payload.db.sessions[transactionID].db
    await transaction.execute(sql`SET LOCAL lock_timeout = '5s'`)
    await transaction.execute(sql`SELECT id FROM site_settings WHERE site_id = ${groupSite.id} FOR UPDATE`)
  }
  const readSettings = async () => (await payload.find({
    collection: 'site-settings', locale: 'all', depth: 0, limit: 100,
    sort: 'id', overrideAccess: true, req,
  })).docs
  const before = await readSettings()
  const groupRows = before.filter((settings) => settings.site === groupSite.id)
  assert.equal(groupRows.length, 1)
  const group = groupRows[0]
  let result: unknown = null
  if (mode !== 'inspect') {
    assert.equal(group.supportPhone?.replace(/[\s.\-()]/g, ''), '0912910101')
    let writes = 0
    const scoped = Object.create(payload) as Payload
    scoped.find = ((args: object) => payload.find({ ...args, req } as never)) as Payload['find']
    scoped.update = ((args: object) => {
      writes += 1
      return payload.update({ ...args, req } as never)
    }) as Payload['update']
    result = await updateWingsGroupHotlineInPayload(scoped)
    assert.equal(writes, 1)
    const after = await readSettings()
    const expected = structuredClone(before)
    const expectedGroup = expected.find((settings) => settings.id === group.id)!
    expectedGroup.supportPhone = '0948786775'
    expectedGroup.updatedAt = after.find((settings) => settings.id === group.id)!.updatedAt
    assert.deepEqual(after, expected, 'Only target supportPhone and updatedAt may change')
    assert.equal((await updateWingsGroupHotlineInPayload(scoped)).status, 'noop')
    assert.equal(writes, 1, 'Second updater execution must not write')
    await payload.db.commitTransaction(transactionID!)
    transactionID = null
    delete req.transactionID
    await invalidateSettingsCache(groupSite.id)
    assert.equal((await payload.findByID({ collection: 'site-settings', id: group.id, depth: 0 })).supportPhone, '0948786775')
  }
  console.log(JSON.stringify({
    status: 'verified', mode, releaseSha, targetDatabase,
    timestamp: new Date().toISOString(), siteID: groupSite.id, settingsID: group.id,
    sitesVerified: sites.docs.length, settingsVerified: before.length,
    beforePhone: group.supportPhone, result,
    additionalHotlines: group.additionalHotlines,
    otherTenantsAndFieldsUnchanged: mode !== 'inspect',
    rowLockUsed: mode !== 'inspect', idempotencyVerified: mode !== 'inspect',
  }))
} catch (error) {
  if (transactionID) await payload.db.rollbackTransaction(transactionID)
  throw error
} finally {
  await payload.destroy()
}
process.exit(0)
