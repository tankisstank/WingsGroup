import assert from 'node:assert/strict'
import crypto from 'node:crypto'

import { createLocalReq, getPayload, type Payload } from 'payload'
import { sql } from '@payloadcms/db-postgres'

import config from '@payload-config'
import { updateWingsGoHotlineInPayload } from './updateWingsGoHotline'
import { invalidateSettingsCache } from '../src/infrastructure/cache/tenantCache'

const releaseSha = process.env.WINGSTRAVEL_RELEASE_SHA || ''
const mode = process.argv[2] || 'inspect'
assert.match(releaseSha, /^[0-9a-f]{40}$/u, 'WINGSTRAVEL_RELEASE_SHA must be a 40-character commit SHA')
assert.equal(process.env.PAYLOAD_DB_PUSH, 'false')
assert.ok(['inspect', 'rehearse', 'apply'].includes(mode), `Unsupported mode: ${mode}`)

const digest = (value: unknown) =>
  crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')

const withoutMutableFields = (value: Record<string, unknown>, includePhone: boolean) => {
  const copy = structuredClone(value)
  delete copy.updatedAt
  if (includePhone) delete copy.supportPhone
  return copy
}

const injectRequest = (payload: Payload, req: Awaited<ReturnType<typeof createLocalReq>>) => {
  const scoped = Object.create(payload) as Payload
  scoped.find = ((args: object) => payload.find({ ...args, req } as never)) as Payload['find']
  scoped.update = ((args: object) => payload.update({ ...args, req } as never)) as Payload['update']
  return scoped
}

const payload = await getPayload({ config })
let transactionID: string | number | null = null

try {
  const req = await createLocalReq({ locale: 'vi' }, payload)
  const sites = await payload.find({ collection: 'sites', depth: 0, limit: 100, req, overrideAccess: true })
  const wingsGoSites = sites.docs.filter((site) => site.code === 'wings-go')
  assert.equal(wingsGoSites.length, 1, 'Expected exactly one active WingsGo site')
  const wingsGoSite = wingsGoSites[0]

  if (mode !== 'inspect') {
    transactionID = await payload.db.beginTransaction()
    assert.ok(transactionID)
    req.transactionID = transactionID
    const transaction = payload.db.sessions[transactionID].db
    await transaction.execute(sql`SET LOCAL lock_timeout = '5s'`)
    await transaction.execute(sql`SELECT id FROM site_settings WHERE site_id = ${wingsGoSite.id} FOR UPDATE`)
  }

  const readSettings = async () => (await payload.find({
    collection: 'site-settings',
    depth: 0,
    limit: 100,
    locale: 'all',
    overrideAccess: true,
    req,
    sort: 'id',
  })).docs

  const before = await readSettings()
  const beforeTarget = before.find((setting) => setting.site === wingsGoSite.id)
  assert.ok(beforeTarget, 'WingsGo settings document is missing')
  const beforeDigest = digest(
    before.map((setting) => withoutMutableFields(setting, setting.site === wingsGoSite.id)),
  )
  let writes = 0
  let result: unknown = null

  if (mode !== 'inspect') {
    const scoped = injectRequest(payload, req)
    const originalUpdate = scoped.update
    scoped.update = (async (args: object) => {
      writes += 1
      return originalUpdate(args as never)
    }) as Payload['update']
    result = await updateWingsGoHotlineInPayload(scoped, { apply: true })
    assert.equal(writes, 1, 'The first operation must write exactly once')

    const after = await readSettings()
    const afterTarget = after.find((setting) => setting.site === wingsGoSite.id)
    assert.ok(afterTarget, 'WingsGo settings disappeared after update')
    assert.deepEqual(
      after.map((setting) => withoutMutableFields(setting, setting.site === wingsGoSite.id)),
      before.map((setting) => withoutMutableFields(setting, setting.site === wingsGoSite.id)),
      'Only WingsGo supportPhone and updatedAt may change',
    )
    assert.equal(afterTarget.supportPhone, '0948786775')
    assert.equal(
      digest(after.map((setting) => withoutMutableFields(setting, setting.site === wingsGoSite.id))),
      beforeDigest,
    )

    const repeat = await updateWingsGoHotlineInPayload(scoped, { apply: true })
    assert.equal(repeat.status, 'noop', 'The repeat operation must be idempotent')
    assert.equal(writes, 1, 'The repeat operation must not write')
    await payload.db.commitTransaction(transactionID)
    transactionID = null
    delete req.transactionID
    await invalidateSettingsCache(wingsGoSite.id)
  }

  console.log(JSON.stringify({
    beforePhone: beforeTarget.supportPhone,
    mode,
    otherSettingsUnchanged: true,
    releaseSha,
    result,
    rowLockUsed: mode !== 'inspect',
    settingsCompared: before.length,
    siteCode: wingsGoSite.code,
    status: 'verified',
    writes,
  }))
} catch (error) {
  if (transactionID) await payload.db.rollbackTransaction(transactionID)
  throw error
} finally {
  await payload.destroy()
}
