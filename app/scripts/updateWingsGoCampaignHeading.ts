import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Payload, PayloadRequest } from 'payload'
import { canonicalJson, hashContent } from './lib/wingsGoCtaHotlineRules'
import {
  acquirePostgresRowLocks,
  findWingsGoSite,
  getOrCreateReq,
  isDraftDifferentFromPublished,
} from './updateWingsGoCtaHotline'

export const TARGET_SITE_CODE = 'wings-go'
export const TARGET_PAGE_PATHNAME = '/campaign'
export const TARGET_LOCALE = 'vi' as const

export const OLD_CAMPAIGN_H1 = 'Tour theo mùa: Khám phá vẻ đẹp bốn mùa châu Á'
export const NEW_CAMPAIGN_H1 = 'Tour theo mùa: Khám phá vẻ đẹp thế giới'

export interface HeadingChangeDetail {
  field: string
  oldValue: string
  newValue: string
}

export interface CampaignHeadingReport {
  version: 1
  siteCode: typeof TARGET_SITE_CODE
  siteID: number | string
  pageID: number | string
  slug: string
  pathname: string
  pageTitle: string
  createdAt: string
  mode: 'dry-run' | 'apply' | 'rollback'
  status: 'planned' | 'updated' | 'noop' | 'rolled-back'
  updatedAt: string
  locale: typeof TARGET_LOCALE
  beforeHeroHash: string
  afterHeroHash: string
  beforeHero: Record<string, unknown>
  afterHero: Record<string, unknown>
  headingChanges: HeadingChangeDetail[]
}

function findH1Nodes(node: unknown, results: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (!node || typeof node !== 'object') return results
  const record = node as Record<string, unknown>
  if (record.type === 'heading' && String(record.tag || '').toLowerCase() === 'h1') results.push(record)
  if (Array.isArray(record.children)) record.children.forEach(child => findH1Nodes(child, results))
  return results
}

export function transformCampaignHero(hero: Record<string, unknown> | null | undefined): {
  updatedHero: Record<string, unknown>
  changed: boolean
  changes: HeadingChangeDetail[]
} {
  if (!hero || typeof hero !== 'object') throw new Error('Hero must be an object')
  const rt = hero.richText as Record<string, unknown> | undefined
  if (!rt || typeof rt !== 'object' || !rt.root || typeof rt.root !== 'object') {
    throw new Error('Hero richText root is missing')
  }

  const h1Nodes = findH1Nodes(rt.root)
  if (h1Nodes.length !== 1) {
    throw new Error(`Expected exactly one H1 heading in campaign hero, found ${h1Nodes.length}`)
  }

  const children = Array.isArray(h1Nodes[0].children) ? h1Nodes[0].children : []
  if (children.length !== 1 || children[0]?.type !== 'text' || typeof children[0].text !== 'string') {
    throw new Error('H1 heading has split or unsupported text; review its formatting in CMS before applying.')
  }
  const combinedText = children[0].text

  if (combinedText === NEW_CAMPAIGN_H1) return { updatedHero: hero, changed: false, changes: [] }
  if (combinedText !== OLD_CAMPAIGN_H1) {
    throw new Error(`Unexpected H1 content '${combinedText}'. Expected '${OLD_CAMPAIGN_H1}' or '${NEW_CAMPAIGN_H1}'. Aborting.`)
  }

  const updatedHero = structuredClone(hero)
  const updatedH1 = findH1Nodes((updatedHero.richText as Record<string, unknown>).root)[0]
  const updatedChildren = updatedH1.children as Record<string, unknown>[]
  updatedChildren[0].text = NEW_CAMPAIGN_H1

  return {
    updatedHero,
    changed: true,
    changes: [{ field: 'hero.richText.h1', oldValue: OLD_CAMPAIGN_H1, newValue: NEW_CAMPAIGN_H1 }],
  }
}

export function validateSnapshotReport(report: CampaignHeadingReport): void {
  if (report.version !== 1 || report.siteCode !== TARGET_SITE_CODE) {
    throw new Error(`Invalid report format: expected version 1 and siteCode '${TARGET_SITE_CODE}'`)
  }
  if (report.pathname !== TARGET_PAGE_PATHNAME) {
    throw new Error(`Snapshot validation failed: expected pathname '${TARGET_PAGE_PATHNAME}', got '${report.pathname}'`)
  }
  if (typeof report.slug !== 'string' || !report.slug.trim()) {
    throw new Error('Snapshot validation failed: invalid report slug (expected non-empty string)')
  }
  if (report.locale !== TARGET_LOCALE) {
    throw new Error(`Invalid report locale: expected '${TARGET_LOCALE}', got '${report.locale}'`)
  }
  if (hashContent(report.beforeHero) !== report.beforeHeroHash) {
    throw new Error(`Snapshot validation failed: beforeHeroHash mismatch for page ${report.pageID}`)
  }
  if (hashContent(report.afterHero) !== report.afterHeroHash) {
    throw new Error(`Snapshot validation failed: afterHeroHash mismatch for page ${report.pageID}`)
  }
  const { updatedHero: expectedAfterHero } = transformCampaignHero(report.beforeHero)
  if (canonicalJson(report.afterHero) !== canonicalJson(expectedAfterHero)) {
    throw new Error(`Snapshot validation failed: afterHero does not match recomputed transformation for page ${report.pageID}`)
  }
  for (const change of report.headingChanges) {
    if (change.oldValue !== OLD_CAMPAIGN_H1 || change.newValue !== NEW_CAMPAIGN_H1) {
      throw new Error(`Forbidden heading delta: expected '${OLD_CAMPAIGN_H1}' -> '${NEW_CAMPAIGN_H1}', got '${change.oldValue}' -> '${change.newValue}'`)
    }
  }
}

async function assertLiveCampaignGuards(
  payload: Payload,
  req: PayloadRequest,
  report: CampaignHeadingReport,
  checkUpdatedAt = true,
) {
  const liveSite = await findWingsGoSite(payload, req)
  if (String(liveSite.id) !== String(report.siteID)) {
    throw new Error(`Live WingsGo siteID '${liveSite.id}' does not match report siteID '${report.siteID}'`)
  }

  const livePage = await payload.findByID({ collection: 'pages', id: report.pageID, depth: 0, overrideAccess: true, req })
  if (!livePage) throw new Error(`Compare-and-stop: Page ${report.pageID} not found.`)

  const livePageSiteId = typeof livePage.site === 'object' && livePage.site ? livePage.site.id : livePage.site
  if (String(livePageSiteId) !== String(report.siteID)) {
    throw new Error(`Security abort: Page ${report.pageID} site does not match WingsGo '${report.siteID}'`)
  }
  if (livePage._status !== 'published') {
    throw new Error(`Safety abort: Page ${report.pageID} status is '${livePage._status}', expected 'published'`)
  }

  if (livePage.slug !== report.slug || livePage.pathname !== TARGET_PAGE_PATHNAME) {
    throw new Error(
      `Security abort: Expected slug '${report.slug}' and pathname '${TARGET_PAGE_PATHNAME}', got slug '${livePage.slug}' and pathname '${livePage.pathname}'`,
    )
  }
  if (checkUpdatedAt && livePage.updatedAt !== report.updatedAt) {
    throw new Error(`Compare-and-stop: Concurrent modification detected on page ${report.pageID}. Expected updatedAt '${report.updatedAt}', got '${livePage.updatedAt}'.`)
  }

  const supportedLocales = liveSite.supportedLocales || [TARGET_LOCALE]
  for (const loc of supportedLocales) {
    const pubDoc = await payload.findByID({ collection: 'pages', id: report.pageID, locale: loc, draft: false, depth: 0, overrideAccess: true, req })
    const draftDoc = await payload.findByID({ collection: 'pages', id: report.pageID, locale: loc, draft: true, depth: 0, overrideAccess: true, req })
    if (isDraftDifferentFromPublished(pubDoc, draftDoc)) {
      throw new Error(`Draft safety abort: Refusing operation on page ${report.pageID} (${loc}): latest draft differs from published version. Preserving editor work.`)
    }
  }

  const targetPubDoc = await payload.findByID({ collection: 'pages', id: report.pageID, locale: TARGET_LOCALE, draft: false, depth: 0, overrideAccess: true, req })
  return { liveSite, livePage, targetPubDoc }
}

async function writeDurableSnapshot(snapshotPath: string, report: CampaignHeadingReport): Promise<void> {
  const resolved = path.resolve(snapshotPath)
  await fs.mkdir(path.dirname(resolved), { recursive: true })
  const handle = await fs.open(resolved, 'wx')
  try {
    await handle.writeFile(JSON.stringify(report, null, 2), 'utf8')
    await handle.sync()
  } finally {
    await handle.close()
  }
}

export async function planWingsGoCampaignHeadingUpdate(
  payload: Payload,
  options?: { req?: PayloadRequest },
): Promise<CampaignHeadingReport> {
  const req = await getOrCreateReq(payload, options?.req, TARGET_LOCALE)
  const site = await findWingsGoSite(payload, req)

  const pagesResult = await payload.find({
    collection: 'pages',
    where: {
      and: [
        { site: { equals: site.id } },
        { pathname: { equals: TARGET_PAGE_PATHNAME } },
        { _status: { equals: 'published' } },
      ],
    },
    depth: 0,
    draft: false,
    fallbackLocale: false,
    limit: 2,
    locale: TARGET_LOCALE,
    overrideAccess: true,
    req,
  })

  if (pagesResult.docs.length !== 1) {
    throw new Error(`Expected exactly one published page with pathname '${TARGET_PAGE_PATHNAME}' on WingsGo, found ${pagesResult.docs.length}`)
  }

  const page = pagesResult.docs[0]
  const pageSlug = typeof page.slug === 'string' ? page.slug.trim() : ''
  if (!pageSlug) {
    throw new Error(`Page ${page.id} has invalid empty slug.`)
  }

  const hero = (page.hero && typeof page.hero === 'object' ? page.hero : {}) as Record<string, unknown>
  const { updatedHero, changed, changes } = transformCampaignHero(hero)

  return {
    version: 1,
    siteCode: TARGET_SITE_CODE,
    siteID: site.id,
    pageID: page.id,
    slug: pageSlug,
    pathname: TARGET_PAGE_PATHNAME,
    pageTitle: page.title || '',
    createdAt: new Date().toISOString(),
    mode: 'dry-run',
    status: changed ? 'planned' : 'noop',
    updatedAt: page.updatedAt || '',
    locale: TARGET_LOCALE,
    beforeHeroHash: hashContent(hero),
    afterHeroHash: hashContent(updatedHero),
    beforeHero: hero,
    afterHero: updatedHero,
    headingChanges: changes,
  }
}

export async function applyWingsGoCampaignHeadingUpdate(
  payload: Payload,
  args: { report: CampaignHeadingReport; snapshotPath: string; req?: PayloadRequest },
): Promise<CampaignHeadingReport> {
  const { report, snapshotPath } = args
  validateSnapshotReport(report)

  if (args.req?.transactionID) {
    throw new Error('Caller-managed transaction not permitted; updater must own its transaction and row locks.')
  }

  await writeDurableSnapshot(snapshotPath, report)

  const req = await getOrCreateReq(payload, args.req, TARGET_LOCALE)
  const transactionID = await acquirePostgresRowLocks(payload, req, report.siteID)

  try {
    const { targetPubDoc } = await assertLiveCampaignGuards(payload, req, report, true)

    if (report.status === 'noop') {
      await payload.db.commitTransaction(transactionID)
      return { ...report, mode: 'apply' }
    }

    const currentHero = (targetPubDoc?.hero && typeof targetPubDoc.hero === 'object' ? targetPubDoc.hero : {}) as Record<string, unknown>
    const currentHeroHash = hashContent(currentHero)
    if (currentHeroHash !== report.beforeHeroHash) {
      throw new Error(`Compare-and-stop: Hero checksum mismatch on page ${report.pageID}. Expected '${report.beforeHeroHash}', got '${currentHeroHash}'.`)
    }

    await payload.update({
      collection: 'pages',
      id: report.pageID,
      locale: TARGET_LOCALE,
      data: {
        hero: report.afterHero,
        pathname: TARGET_PAGE_PATHNAME,
      } as never,
      draft: false,
      overrideAccess: true,
      req,
      context: { disableRevalidate: true, seed: true, us005HeadingUpdate: true },
    })

    await payload.db.commitTransaction(transactionID)

    return { ...report, mode: 'apply', status: 'updated', createdAt: new Date().toISOString() }
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID)
    throw error
  }
}

export async function rollbackWingsGoCampaignHeadingUpdate(
  payload: Payload,
  args: { report: CampaignHeadingReport; req?: PayloadRequest },
): Promise<CampaignHeadingReport> {
  const { report } = args
  validateSnapshotReport(report)

  if (args.req?.transactionID) {
    throw new Error('Caller-managed transaction not permitted; updater must own its transaction and row locks.')
  }

  const req = await getOrCreateReq(payload, args.req, TARGET_LOCALE)
  const transactionID = await acquirePostgresRowLocks(payload, req, report.siteID)

  try {
    const { targetPubDoc } = await assertLiveCampaignGuards(payload, req, report, false)

    const currentHero = (targetPubDoc?.hero && typeof targetPubDoc.hero === 'object' ? targetPubDoc.hero : {}) as Record<string, unknown>
    const currentHeroHash = hashContent(currentHero)

    if (currentHeroHash === report.beforeHeroHash) {
      await payload.db.commitTransaction(transactionID)
      return { ...report, mode: 'rollback', status: 'rolled-back' }
    }

    if (currentHeroHash !== report.afterHeroHash) {
      throw new Error(`Rollback refused for page ${report.pageID}; document hero was modified concurrently after the update was applied.`)
    }

    await payload.update({
      collection: 'pages',
      id: report.pageID,
      locale: TARGET_LOCALE,
      data: {
        hero: report.beforeHero,
        pathname: TARGET_PAGE_PATHNAME,
      } as never,
      draft: false,
      overrideAccess: true,
      req,
      context: { disableRevalidate: true, seed: true, us005HeadingRollback: true },
    })

    await payload.db.commitTransaction(transactionID)

    return { ...report, mode: 'rollback', status: 'rolled-back', createdAt: new Date().toISOString() }
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID)
    throw error
  }
}

// CLI runner
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const run = async () => {
    const { getPayload } = await import('payload')
    const config = (await import('@payload-config')).default
    const payload = await getPayload({ config })

    try {
      const isApply = process.argv.includes('--apply')
      const rollbackIdx = process.argv.indexOf('--rollback')
      const snapshotIdx = process.argv.indexOf('--snapshot')
      const snapshotPath = snapshotIdx !== -1 && process.argv[snapshotIdx + 1] ? process.argv[snapshotIdx + 1] : null

      let report: CampaignHeadingReport

      if (rollbackIdx !== -1) {
        const rollbackFilePath = process.argv[rollbackIdx + 1]
        if (!rollbackFilePath) throw new Error('Flag --rollback requires a path to a previous snapshot/report JSON file.')
        const fileContent = await fs.readFile(path.resolve(rollbackFilePath), 'utf8')
        report = await rollbackWingsGoCampaignHeadingUpdate(payload, { report: JSON.parse(fileContent) as CampaignHeadingReport })
      } else {
        const plan = await planWingsGoCampaignHeadingUpdate(payload)
        if (isApply) {
          if (!snapshotPath) throw new Error('Flag --apply requires --snapshot <path> to durably persist pre-mutation snapshot journal.')
          report = await applyWingsGoCampaignHeadingUpdate(payload, { report: plan, snapshotPath })
        } else {
          report = plan
          if (snapshotPath) await writeDurableSnapshot(snapshotPath, report)
        }
      }

      console.log(JSON.stringify({ mode: report.mode, status: report.status, pageID: report.pageID, pathname: report.pathname, headingChanges: report.headingChanges }, null, 2))
    } finally {
      await payload.destroy()
    }
  }

  run().then(() => {
    process.stdout.write('', () => process.exit(0))
  }).catch((error) => {
    console.error('Fatal error during campaign heading updater execution:', error)
    process.stderr.write('', () => process.exit(1))
  })
}
