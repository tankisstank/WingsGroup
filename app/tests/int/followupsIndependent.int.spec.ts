import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import configPromise from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, it } from 'vitest'
import {
  applyWingsGoCtaHotlineUpdates,
  planWingsGoCtaHotlineUpdates,
  rollbackWingsGoCtaHotlineUpdates,
  type CtaHotlineReport,
} from '../../scripts/updateWingsGoCtaHotline'
import { hashContent } from '../../scripts/lib/wingsGoCtaHotlineRules'
import { richText } from '../../scripts/lib/payloadSeedBuilders'

const context = { disableRevalidate: true, seed: true }
const evidenceRoot = path.resolve('../..')
const suffix = Date.now().toString()
let payload: Payload
let siteID: number
let otherSiteID: number
const createdIDs: number[] = []

function cta() {
  return {
    blockType: 'cta' as const,
    richText: richText('Tư vấn', 'Hotline 0912 910 101; phụ 0915 250 101 và 0915 260 101.'),
    links: [
      { link: { type: 'custom' as const, label: 'Gọi 0912910101', url: 'tel:0912910101' } },
      { link: { type: 'custom' as const, label: 'Gửi yêu cầu', url: '/lien-he#contact-form' } },
    ],
  }
}

async function page(name: string, site = siteID) {
  const document = await payload.create({
    collection: 'pages',
    locale: 'vi',
    context,
    overrideAccess: true,
    data: {
      site,
      title: name,
      slug: name + '-' + suffix,
      _status: 'published',
      hero: { type: 'none' },
      layout: [cta()],
    },
  })
  createdIDs.push(document.id)
  return document
}

async function read(id: number, locale: 'vi' | 'en' = 'vi', draft = false) {
  return payload.findByID({
    collection: 'pages', id, locale, draft, fallbackLocale: false,
    depth: 0, overrideAccess: true,
  })
}

async function planFor(ids: number[]) {
  const report = await planWingsGoCtaHotlineUpdates(payload)
  return { ...report, pages: report.pages.filter(item => ids.includes(Number(item.pageID))) }
}

async function apply(report: CtaHotlineReport, label: string) {
  return applyWingsGoCtaHotlineUpdates(payload, {
    report,
    snapshotPath: path.join(evidenceRoot, 'pg-' + label + '-' + suffix + '.json'),
  })
}

const isLocalProofDatabase = /@127\.0\.0\.1:(55488\/followups|55489\/us095_test)$/.test(process.env.DATABASE_URL || '')

describe.runIf(isLocalProofDatabase)('Independent follow-up PostgreSQL proof', () => {
  beforeAll(async () => {
    assert.ok(isLocalProofDatabase, 'Only the dedicated loopback proof databases may be mutated')
    const config = await configPromise
    config.typescript.autoGenerate = false
    payload = await getPayload({ config })
    const sites = await payload.find({
      collection: 'sites', overrideAccess: true,
      where: { code: { equals: 'wings-go' } }, limit: 1,
    })
    const wingsGo = sites.docs[0] || await payload.create({
      collection: 'sites', context, overrideAccess: true,
      data: {
        code: 'wings-go', name: 'WingsGo local proof', primaryDomain: 'wingsgo.localhost',
        supportedLocales: ['vi', 'en'], defaultLocale: 'vi',
      },
    })
    siteID = wingsGo.id
    const other = await payload.create({
      collection: 'sites', context, overrideAccess: true,
      data: {
        code: 'followup-other-' + suffix, name: 'Other proof',
        primaryDomain: 'other-' + suffix + '.invalid',
        supportedLocales: ['vi', 'en'], defaultLocale: 'vi',
      },
    })
    otherSiteID = other.id
  }, 60_000)

  afterAll(async () => {
    if (payload) await payload.destroy()
  })

  it('rehearses two locales, atomic conflict, boundary validation, drafts and rollback', async () => {
    const target = await page('target')
    await payload.update({
      collection: 'pages', id: target.id, locale: 'en', context,
      overrideAccess: true, data: { title: 'English target', layout: [cta()] },
    })
    const other = await page('untouched-other', otherSiteID)
    const otherBefore = await read(other.id)
    const draftOnly = await payload.create({
      collection: 'pages', locale: 'vi', draft: true, context, overrideAccess: true,
      data: {
        site: siteID, title: 'draft-only', slug: 'draft-only-' + suffix,
        _status: 'draft', hero: { type: 'none' }, layout: [cta()],
      },
    })
    const before = await read(target.id)
    const inventory = await planWingsGoCtaHotlineUpdates(payload)
    assert.ok(!inventory.pages.some(item => item.pageID === other.id))
    assert.ok(!inventory.pages.some(item => item.pageID === draftOnly.id))
    assert.equal(hashContent((await read(target.id)).layout), hashContent(before.layout))

    const planned = await planFor([target.id])
    assert.ok(planned.pages[0].locales.vi!.blockChanges.length > 0)
    assert.ok(planned.pages[0].locales.en!.blockChanges.length > 0)

    const forged = structuredClone(planned)
    const viPlan = forged.pages[0].locales.vi!
    viPlan.afterLayout[0].eyebrow = 'Unexpected content'
    viPlan.afterLayoutHash = hashContent(viPlan.afterLayout)
    await assert.rejects(apply(forged, 'forged'), /snapshot|delta|transform|allowed/i)
    assert.equal(hashContent((await read(target.id)).layout), hashContent(before.layout))

    const wrongTenant = structuredClone(planned)
    wrongTenant.pages[0].pageID = other.id
    await assert.rejects(apply(wrongTenant, 'wrong-tenant'), /site|tenant|WingsGo/i)
    assert.equal(hashContent((await read(other.id)).layout), hashContent(otherBefore.layout))

    await apply(planned, 'apply')
    const journalPath = path.join(evidenceRoot, 'pg-apply-' + suffix + '.json')
    const journalBytes = await fs.readFile(journalPath, 'utf8')
    await assert.rejects(apply(planned, 'apply'), /EEXIST|exist/i)
    assert.equal(await fs.readFile(journalPath, 'utf8'), journalBytes)
    const viUpdated = await read(target.id)
    const enUpdated = await read(target.id, 'en')
    for (const document of [viUpdated, enUpdated]) {
      const serialized = JSON.stringify(document.layout)
      assert.ok(serialized.includes('0948 786 775'))
      assert.ok(serialized.includes('tel:0948786775'))
      assert.ok(!serialized.includes('0912910101'))
      assert.ok(serialized.includes('0915 250 101'))
      assert.ok(serialized.includes('0915 260 101'))
      assert.ok(serialized.includes('/lien-he#contact-form'))
    }
    const rerun = await planFor([target.id])
    assert.ok(rerun.pages.every(item => item.status !== 'planned'))
    await apply(rerun, 'noop')
    const recoveryJournal = JSON.parse(journalBytes) as CtaHotlineReport
    assert.equal(recoveryJournal.mode, 'dry-run')
    const rolledBack = await rollbackWingsGoCtaHotlineUpdates(payload, { report: recoveryJournal })
    assert.ok(rolledBack.summary.pagesRolledBack > 0)
    assert.equal(hashContent((await read(target.id)).layout), hashContent(before.layout))

    const pending = await page('pending-editor')
    await payload.update({
      collection: 'pages', id: pending.id, locale: 'vi', draft: true,
      context, overrideAccess: true, data: { title: 'Unsaved release title', _status: 'draft' },
    })
    const pendingPublished = await read(pending.id)
    const pendingDraft = await read(pending.id, 'vi', true)
    await assert.rejects(apply(await planFor([pending.id]), 'draft'), /draft|editor/i)
    assert.equal(hashContent((await read(pending.id)).layout), hashContent(pendingPublished.layout))
    assert.equal((await read(pending.id, 'vi', true)).title, pendingDraft.title)

    const crossLocale = await page('cross-locale-draft')
    await payload.update({
      collection: 'pages', id: crossLocale.id, locale: 'en', context, overrideAccess: true,
      data: { title: 'Published English', layout: [{ ...cta(), richText: richText('English', 'No hotline change'), links: [{ link: { type: 'custom', label: 'Request', url: '/contact' } }] }] },
    })
    await payload.update({
      collection: 'pages', id: crossLocale.id, locale: 'en', draft: true,
      context, overrideAccess: true, data: { title: 'Pending untouched-locale draft', _status: 'draft' },
    })
    const viOnly = await planFor([crossLocale.id])
    assert.equal(viOnly.pages[0].locales.en?.blockChanges.length, 0)
    await assert.rejects(apply(viOnly, 'cross-locale-draft'), /draft/i)
    assert.equal((await read(crossLocale.id, 'en', true)).title, 'Pending untouched-locale draft')

    const first = await page('atomic-first')
    const second = await page('atomic-second')
    const conflictPlan = await planFor([first.id, second.id])
    const firstBefore = await read(first.id)
    await payload.update({
      collection: 'pages', id: second.id, context, overrideAccess: true,
      data: { title: 'Concurrent title change' },
    })
    await assert.rejects(apply(conflictPlan, 'conflict'), /concurrent|compare|mismatch/i)
    assert.equal(hashContent((await read(first.id)).layout), hashContent(firstBefore.layout))

    const rollbackTarget = await page('rollback-editor')
    const rollbackApplied = await apply(await planFor([rollbackTarget.id]), 'rollback-apply')
    await payload.update({
      collection: 'pages', id: rollbackTarget.id, draft: true, locale: 'vi',
      context, overrideAccess: true, data: { title: 'Draft after apply', _status: 'draft' },
    })
    await assert.rejects(
      rollbackWingsGoCtaHotlineUpdates(payload, { report: rollbackApplied }),
      /draft|editor/i,
    )
    assert.equal((await read(rollbackTarget.id, 'vi', true)).title, 'Draft after apply')
    assert.equal(hashContent((await read(other.id)).layout), hashContent(otherBefore.layout))
    await fs.writeFile(path.join(evidenceRoot, 'us081-independent-pg-proof.json'), JSON.stringify({
      verifiedAt: new Date().toISOString(),
      target: target.id,
      checks: ['dry-run', 'VI+EN same document', 'forged delta refused', 'tenant isolation',
        'secondary hotlines preserved', 'form href preserved', 'rerun noop', 'rollback',
        'pending title draft preserved', 'atomic conflict rollback', 'rollback draft refusal'],
    }, null, 2))
  }, 60_000)

  it('blocks an editor draft save between the final check and write', async () => {
    const target = await page('draft-race')
    const plan = await planFor([target.id])
    const findByID = payload.findByID.bind(payload)
    let editorWrite: Promise<unknown> | undefined
    let editorFinished = false
    payload.findByID = (async (args: Parameters<Payload['findByID']>[0]) => {
      const result = await findByID(args)
      if (args.id === target.id && args.draft === true && args.req?.transactionID && !editorWrite) {
        editorWrite = payload.update({
          collection: 'pages', id: target.id, locale: 'vi', draft: true,
          context, overrideAccess: true,
          data: { title: 'Editor draft during apply', _status: 'draft' },
        }).then(() => { editorFinished = true })
        await new Promise(resolve => setTimeout(resolve, 150))
        assert.equal(editorFinished, false, 'Concurrent draft must wait for updater transaction')
      }
      return result
    }) as Payload['findByID']
    try {
      await apply(plan, 'draft-race')
    } finally {
      payload.findByID = findByID
      await editorWrite
    }
    assert.equal((await read(target.id, 'vi', true)).title, 'Editor draft during apply')
    assert.notEqual((await read(target.id)).title, 'Editor draft during apply')
  }, 30_000)
})
