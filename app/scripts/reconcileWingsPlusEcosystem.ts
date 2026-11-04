import assert from 'node:assert/strict'
import fs from 'node:fs'
import { sql } from '@payloadcms/db-postgres'
import { createLocalReq, getPayload } from 'payload'
import config from '../src/payload.config'
import type { Page } from '../src/payload-types'
import { localeCodes } from '../src/utilities/locales'
import { canonicalJson, hashContent } from './lib/wingsGoCtaHotlineRules'
import { acquirePostgresRowLocks, isDraftDifferentFromPublished } from './updateWingsGoCtaHotline'

const previousLabel = 'Du lịch hội nghị - hội thảo'
const desiredLabel = 'Hành trình riêng'

function reconcile(layout: Page['layout']) {
  const next = structuredClone(layout)
  const blocks = next.filter(block => block.blockType === 'wingsGroupEcosystem')
  assert.equal(blocks.length, 1, 'Expected exactly one ecosystem block')
  const profiles = blocks[0].profiles.filter(profile => profile.brandKey === 'wingsplus')
  assert.equal(profiles.length, 1, 'Expected exactly one WingsPlus profile')
  assert.ok(profiles[0].serviceScope.length > 0, 'Service scope is missing')
  const label = profiles[0].serviceScope[0].label
  assert.ok(label === previousLabel || label === desiredLabel, 'Unexpected editor label; stop')
  profiles[0].serviceScope[0].label = desiredLabel
  return next
}

if (process.argv.includes('--self-test')) {
  const fixture = [{ blockType: 'wingsGroupEcosystem', profiles: [{ brandKey: 'wingsplus', serviceScope: [{ label: previousLabel }, { label: 'Company Trip' }] }] }] as Page['layout']
  const expected = structuredClone(fixture)
  const block = expected[0]
  assert.equal(block.blockType, 'wingsGroupEcosystem')
  if (block.blockType === 'wingsGroupEcosystem') block.profiles[0].serviceScope[0].label = desiredLabel
  assert.deepEqual(reconcile(fixture), expected)
  assert.deepEqual(reconcile(expected), expected)
  assert.equal(hashContent(fixture), hashContent(structuredClone(fixture)))
  const unexpected = structuredClone(expected)
  if (unexpected[0].blockType === 'wingsGroupEcosystem') unexpected[0].profiles[0].serviceScope[0].label = 'Editor change'
  assert.throws(() => reconcile(unexpected), /Unexpected editor/)
  assert.throws(() => reconcile([]), /exactly one/)
  console.log('WingsPlus bounded label transformation: self-test passed')
} else {
  const payload = await getPayload({ config })
  let transactionID: string | number | undefined
  let committed = false
  try {
    const user = (await payload.find({ collection: 'users', overrideAccess: true, limit: 1, where: { role: { equals: 'super-admin' } } })).docs[0]
    assert.ok(user, 'Super-admin required')
    const req = await createLocalReq({ user, context: { disableRevalidate: true } }, payload)
    const read = (id: number, locale: (typeof localeCodes)[number], draft = false) => payload.findByID({ collection: 'pages', id, locale, fallbackLocale: false, depth: 0, draft, overrideAccess: false, req })
    const home = await read(191, 'vi')
    const site = await payload.findByID({ collection: 'sites', id: Number(home.site), overrideAccess: false, req })
    assert.equal(site.code, 'wings-group')
    assert.equal(home.pathname, '/')
    const control = await read(181, 'vi')
    assert.equal(control.site, home.site)
    assert.equal(control.pathname, '/he-sinh-thai')
    const controlBlock = control.layout.find(block => block.blockType === 'wingsGroupEcosystem')
    assert.equal(controlBlock?.blockType, 'wingsGroupEcosystem')
    if (controlBlock?.blockType === 'wingsGroupEcosystem') {
      assert.equal(controlBlock.profiles.find(profile => profile.brandKey === 'wingsplus')?.serviceScope[0]?.label, desiredLabel)
    }
    const afterLayout = reconcile(home.layout)
    if (canonicalJson(home.layout) === canonicalJson(afterLayout)) {
      console.log(JSON.stringify({ status: 'noop', pageID: 191, label: desiredLabel }))
    } else if (!process.argv.includes('--apply')) {
      console.log(JSON.stringify({ status: 'planned', pageID: 191, locale: 'vi', before: previousLabel, after: desiredLabel, beforeHash: hashContent(home.layout) }))
    } else {
      const snapshotPath = process.argv[process.argv.indexOf('--snapshot') + 1]
      assert.ok(process.argv.includes('--snapshot') && snapshotPath, '--snapshot path required')
      transactionID = await acquirePostgresRowLocks(payload, req, site.id)
      const session = (payload.db as unknown as { sessions: Record<string, { db: { execute: (statement: unknown) => Promise<unknown> } }> }).sessions[transactionID]
      await session.db.execute(sql`LOCK TABLE _pages_v IN SHARE ROW EXCLUSIVE MODE`)
      const current = await read(191, 'vi')
      assert.equal(hashContent(current), hashContent(home), 'Concurrent page change; stop')
      const currentControl = await read(181, 'vi')
      assert.equal(hashContent(currentControl), hashContent(control), 'Concurrent control change; stop')
      const before = []
      for (const locale of localeCodes) {
        const published = await read(191, locale)
        const draft = await read(191, locale, true)
        assert.equal(isDraftDifferentFromPublished(published, draft), false, `Pending editor draft (${locale}); stop`)
        before.push({ locale, published, draft })
      }
      const descriptor = fs.openSync(snapshotPath, 'wx', 0o600)
      try {
        fs.writeFileSync(descriptor, JSON.stringify({ capturedAt: new Date().toISOString(), before, afterLayout }, null, 2))
        fs.fsyncSync(descriptor)
      } finally {
        fs.closeSync(descriptor)
      }
      await payload.update({ collection: 'pages', id: 191, locale: 'vi', draft: false, overrideAccess: false, req, data: { layout: afterLayout } })
      for (const entry of before) {
        const after = await read(191, entry.locale)
        const expected = structuredClone(entry.published)
        if (entry.locale === 'vi') expected.layout = afterLayout
        for (const document of [after, expected]) {
          delete (document as Partial<Page>).updatedAt
        }
        assert.equal(canonicalJson(after), canonicalJson(expected), `Unexpected write (${entry.locale})`)
      }
      assert.equal(hashContent(await read(181, 'vi')), hashContent(control), 'Control page changed')
      await payload.db.commitTransaction(transactionID)
      committed = true
      console.log(JSON.stringify({ status: 'applied', pageID: 191, locale: 'vi', label: desiredLabel, snapshotPath }))
    }
  } finally {
    if (transactionID && !committed) await payload.db.rollbackTransaction(transactionID)
    await payload.destroy()
  }
  process.exit(0)
}
