import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { it } from 'vitest'
import {
  applyWingsGoCampaignHeadingUpdate as apply,
  planWingsGoCampaignHeadingUpdate as plan,
  rollbackWingsGoCampaignHeadingUpdate as rollback,
  NEW_CAMPAIGN_H1,
  OLD_CAMPAIGN_H1,
} from '../../scripts/updateWingsGoCampaignHeading'
import { applyWingsGoCtaHotlineUpdates, planWingsGoCtaHotlineUpdates } from '../../scripts/updateWingsGoCtaHotline'
import { canonicalJson, hashContent } from '../../scripts/lib/wingsGoCtaHotlineRules'
import { richText } from '../../scripts/lib/payloadSeedBuilders'

const root = path.resolve('../..')
const context = { seed: true, disableRevalidate: true }
const suffix = Date.now().toString()

it.skipIf(!process.env.DATABASE_URL?.includes('127.0.0.1:55488/followups'))('independently rehearses guarded campaign changes and leaves browser candidate', async () => {
  const config = await configPromise
  config.typescript.autoGenerate = false
  const payload = await getPayload({ config })
  try {
    const ids = JSON.parse(await fs.readFile(path.join(root, 'browser-fixture-ids.json'), 'utf8')) as { campaign: number; control: number; media: number }
    const read = (id: number, locale: 'vi' | 'en' = 'vi', draft = false) => payload.findByID({ collection: 'pages', id, locale, fallbackLocale: false, depth: 0, draft, overrideAccess: true })
    const seeded = await read(ids.campaign)
    assert.equal(seeded.title, 'Campaign local proof')
    await payload.update({ collection: 'pages', id: ids.campaign, locale: 'vi', context, overrideAccess: true, data: { hero: { ...seeded.hero, richText: richText(OLD_CAMPAIGN_H1, '', 'h1') } } })
    const mediaBefore = await payload.findByID({ collection: 'media', id: ids.media, depth: 0, overrideAccess: true })
    const controlBefore = await read(ids.control)
    const cta = await planWingsGoCtaHotlineUpdates(payload)
    cta.pages = cta.pages.filter(page => [ids.campaign, ids.control].includes(Number(page.pageID)))
    await applyWingsGoCtaHotlineUpdates(payload, { report: cta, snapshotPath: path.join(root, 'browser-cta-' + suffix + '.json') })
    const original = await read(ids.campaign)
    const english = await read(ids.campaign, 'en')
    const originalPlan = await plan(payload)
    assert.equal(originalPlan.status, 'planned')
    assert.ok(canonicalJson(originalPlan.beforeHero).includes(OLD_CAMPAIGN_H1))
    assert.equal(hashContent((await read(ids.campaign)).hero), hashContent(original.hero), 'planning does not write')
    const execute = (report: typeof originalPlan, label: string) => apply(payload, { report, snapshotPath: path.join(root, 'heading-' + label + '-' + suffix + '.json') })

    const forged = structuredClone(originalPlan)
    forged.afterHero.links = []
    forged.afterHeroHash = hashContent(forged.afterHero)
    await assert.rejects(execute(forged, 'tampered'), /snapshot|transform/i)
    await assert.rejects(execute({ ...originalPlan, pageID: ids.control }, 'wrong-route'), /campaign|path|scope/i)

    await payload.update({ collection: 'pages', id: ids.campaign, locale: 'vi', context, overrideAccess: true, data: { title: 'Concurrent editor title' } })
    await assert.rejects(execute(originalPlan, 'stale'), /concurrent|updatedAt/i)
    await payload.update({ collection: 'pages', id: ids.campaign, locale: 'vi', context, overrideAccess: true, data: { title: original.title } })

    await payload.update({ collection: 'pages', id: ids.campaign, locale: 'en', draft: true, context, overrideAccess: true, data: { title: 'Pending English editor draft', _status: 'draft' } })
    const draftPlan = await plan(payload)
    await assert.rejects(execute(draftPlan, 'editor-draft'), /draft/i)
    assert.equal((await read(ids.campaign, 'en', true)).title, 'Pending English editor draft')
    const restoreEnglish = () => payload.update({ collection: 'pages', id: ids.campaign, locale: 'en', context, overrideAccess: true, data: { title: english.title, hero: english.hero, layout: english.layout, meta: english.meta, _status: 'published' } })
    await restoreEnglish()

    const fresh = await plan(payload)
    const journalPath = path.join(root, 'heading-apply-' + suffix + '.json')
    await execute(fresh, 'apply')
    const journalBytes = await fs.readFile(journalPath, 'utf8')
    assert.ok(canonicalJson((await read(ids.campaign)).hero).includes(NEW_CAMPAIGN_H1))
    assert.equal(hashContent((await read(ids.campaign, 'en')).hero), hashContent(english.hero))
    assert.equal(hashContent((await read(ids.campaign)).layout), hashContent(original.layout))
    assert.equal((await plan(payload)).status, 'noop')
    await assert.rejects(apply(payload, { report: await plan(payload), snapshotPath: journalPath }), /EEXIST/)
    assert.equal(await fs.readFile(journalPath, 'utf8'), journalBytes)

    const journal = JSON.parse(journalBytes)
    await rollback(payload, { report: journal })
    assert.equal(hashContent((await read(ids.campaign)).hero), hashContent(original.hero))
    await rollback(payload, { report: journal })
    const finalPlan = await plan(payload)
    await execute(finalPlan, 'candidate')
    await payload.update({ collection: 'pages', id: ids.campaign, locale: 'en', draft: true, context, overrideAccess: true, data: { title: 'Rollback must preserve draft', _status: 'draft' } })
    await assert.rejects(rollback(payload, { report: finalPlan }), /draft/i)
    assert.equal((await read(ids.campaign, 'en', true)).title, 'Rollback must preserve draft')
    await restoreEnglish()
    const candidate = await read(ids.campaign)
    await payload.update({ collection: 'pages', id: ids.campaign, locale: 'vi', context, overrideAccess: true, data: { hero: { ...candidate.hero, links: [] } } })
    await assert.rejects(rollback(payload, { report: finalPlan }), /concurrent|modified/i)
    assert.deepEqual((await read(ids.campaign)).hero.links, [])
    await payload.update({ collection: 'pages', id: ids.campaign, locale: 'vi', context, overrideAccess: true, data: { hero: candidate.hero } })
    assert.equal(hashContent((await read(ids.control)).hero), hashContent(controlBefore.hero))
    const mediaAfter = await payload.findByID({ collection: 'media', id: ids.media, depth: 0, overrideAccess: true })
    assert.equal(hashContent(mediaAfter.caption), hashContent(mediaBefore.caption))
    await fs.writeFile(path.join(root, 'us005-independent-pg-proof.json'), JSON.stringify({
      at: new Date().toISOString(), pageID: ids.campaign, status: 'PASS', checked: ['dry-run', 'exact VI heading', 'scope', 'tampered snapshot', 'stale version', 'EN draft preservation', 'EN hero unchanged', 'layout unchanged', 'shared caption unchanged', 'noop', 'immutable journal', 'targeted rollback', 'rollback draft conflict'],
    }, null, 2))
  } finally {
    await payload.destroy()
  }
}, 60_000)
