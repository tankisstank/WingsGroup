import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createLocalReq, type Payload, type PayloadRequest } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import { localeCodes, type SupportedLocaleCode } from '../src/utilities/locales'
import type { User } from '../src/payload-types'
import {
  canonicalJson,
  hashContent,
  TARGET_SITE_CODE,
  transformCtaBlock,
  validateAllowedDelta,
  type CtaChangeDetail,
} from './lib/wingsGoCtaHotlineRules'

export function isValidLocale(code: string): code is SupportedLocaleCode {
  return (localeCodes as readonly string[]).includes(code)
}

export interface CtaBlockChangeRecord {
  blockIndex: number
  changes: CtaChangeDetail[]
}

export interface CtaLocalePlan {
  locale: SupportedLocaleCode
  beforeLayoutHash: string
  afterLayoutHash: string
  beforeLayout: Array<Record<string, unknown>>
  afterLayout: Array<Record<string, unknown>>
  blockChanges: CtaBlockChangeRecord[]
}

export interface CtaPagePlan {
  pageID: number | string
  slug: string
  pathname: string
  pageTitle: string
  status: 'planned' | 'updated' | 'noop' | 'rolled-back' | 'skipped'
  updatedAt: string
  locales: Partial<Record<SupportedLocaleCode, CtaLocalePlan>>
}

export interface CtaHotlineReport {
  version: 1
  siteCode: typeof TARGET_SITE_CODE
  siteID: number | string
  createdAt: string
  mode: 'dry-run' | 'apply' | 'rollback'
  summary: {
    totalPagesScanned: number
    totalCtaBlocksFound: number
    pagesWithChanges: number
    pagesNoop: number
    pagesUpdated: number
    pagesRolledBack: number
  }
  pages: CtaPagePlan[]
}

const syntheticAdminUser = {
  collection: 'users' as const,
  createdAt: new Date(0).toISOString(),
  email: 'wingsgo-cta-updater@internal.invalid',
  id: 0,
  role: 'super-admin' as const,
  sites: [],
  updatedAt: new Date(0).toISOString(),
} satisfies User & { collection: 'users' }

type DraftContent = {
  _status?: unknown
  title?: unknown
  hero?: unknown
  layout?: unknown
  meta?: unknown
}

export function isDraftDifferentFromPublished(publishedDoc: DraftContent, draftDoc?: DraftContent | null): boolean {
  if (!draftDoc) return false
  if (draftDoc._status === 'draft') return true
  if (draftDoc.title !== publishedDoc.title) return true
  if (canonicalJson(draftDoc.hero || {}) !== canonicalJson(publishedDoc.hero || {})) return true
  if (canonicalJson(draftDoc.layout || []) !== canonicalJson(publishedDoc.layout || [])) return true
  if (canonicalJson(draftDoc.meta || {}) !== canonicalJson(publishedDoc.meta || {})) return true
  return false
}

export async function getOrCreateReq(
  payload: Payload,
  req?: PayloadRequest,
  locale: SupportedLocaleCode = 'vi',
): Promise<PayloadRequest> {
  if (req) {
    if (!req.user) req.user = syntheticAdminUser
    req.context = {
      ...req.context,
      disableRevalidate: true,
      seed: true,
    }
    return req
  }
  return await createLocalReq(
    {
      context: { disableRevalidate: true, seed: true },
      locale,
      user: syntheticAdminUser,
    },
    payload,
  )
}

export async function findWingsGoSite(
  payload: Payload,
  req?: PayloadRequest,
): Promise<{ id: number | string; code: string; defaultLocale: SupportedLocaleCode; supportedLocales: SupportedLocaleCode[] }> {
  const sites = await payload.find({
    collection: 'sites',
    where: { code: { equals: TARGET_SITE_CODE } },
    depth: 0,
    limit: 2,
    overrideAccess: true,
    req,
  })
  if (sites.docs.length !== 1) {
    throw new Error(`Expected exactly one site with code '${TARGET_SITE_CODE}', found ${sites.docs.length}`)
  }
  const site = sites.docs[0]
  const defaultLocale: SupportedLocaleCode = isValidLocale(site.defaultLocale || '')
    ? (site.defaultLocale as SupportedLocaleCode)
    : 'vi'
  const rawLocales = Array.isArray(site.supportedLocales)
    ? (site.supportedLocales as string[])
    : [defaultLocale, 'en']
  const supportedLocales: SupportedLocaleCode[] = rawLocales.filter(isValidLocale)
  if (!supportedLocales.includes(defaultLocale)) {
    supportedLocales.unshift(defaultLocale)
  }
  return {
    id: site.id,
    code: site.code,
    defaultLocale,
    supportedLocales,
  }
}

export async function planWingsGoCtaHotlineUpdates(
  payload: Payload,
  options?: { locale?: SupportedLocaleCode; req?: PayloadRequest },
): Promise<CtaHotlineReport> {
  const req = await getOrCreateReq(payload, options?.req, 'vi')
  const site = await findWingsGoSite(payload, req)
  const locales: SupportedLocaleCode[] = options?.locale
    ? [options.locale]
    : site.supportedLocales

  const pageMap = new Map<number | string, CtaPagePlan>()
  let totalCtaBlocks = 0

  for (const locale of locales) {
    const pagesResult = await payload.find({
      collection: 'pages',
      where: {
        and: [
          { site: { equals: site.id } },
          { _status: { equals: 'published' } },
        ],
      },
      depth: 0,
      fallbackLocale: false,
      limit: 1000,
      locale,
      pagination: false,
      overrideAccess: true,
      req,
    })

    for (const page of pagesResult.docs) {
      const pageID = page.id
      let pagePlan = pageMap.get(pageID)
      if (!pagePlan) {
        pagePlan = {
          pageID,
          slug: page.slug || '',
          pathname: page.pathname || `/${page.slug || ''}`,
          pageTitle: page.title || '',
          status: 'skipped',
          updatedAt: page.updatedAt || '',
          locales: {},
        }
        pageMap.set(pageID, pagePlan)
      }

      const layout = Array.isArray(page.layout)
        ? (page.layout as unknown as Array<Record<string, unknown>>)
        : []
      const ctaBlocksInLayout = layout.filter((b) => b && b.blockType === 'cta')
      totalCtaBlocks += ctaBlocksInLayout.length

      let localeModified = false
      const blockChanges: CtaBlockChangeRecord[] = []

      const updatedLayout = layout.map((block, idx) => {
        if (!block || block.blockType !== 'cta') return block
        const { updatedBlock, changed, changes } = transformCtaBlock(block)
        if (changed) {
          localeModified = true
          blockChanges.push({ blockIndex: idx, changes })
          return updatedBlock
        }
        return block
      })

      const beforeHash = hashContent(layout)
      const afterHash = hashContent(updatedLayout)

      pagePlan.locales[locale] = {
        locale,
        beforeLayoutHash: beforeHash,
        afterLayoutHash: afterHash,
        beforeLayout: layout,
        afterLayout: updatedLayout,
        blockChanges,
      }

      if (localeModified) {
        pagePlan.status = 'planned'
      } else if (ctaBlocksInLayout.length > 0 && pagePlan.status !== 'planned') {
        pagePlan.status = 'noop'
      }
    }
  }

  const pages = Array.from(pageMap.values())
  const pagesWithChanges = pages.filter((p) => p.status === 'planned').length
  const pagesNoop = pages.filter((p) => p.status === 'noop').length

  return {
    version: 1,
    siteCode: TARGET_SITE_CODE,
    siteID: site.id,
    createdAt: new Date().toISOString(),
    mode: 'dry-run',
    summary: {
      totalPagesScanned: pages.length,
      totalCtaBlocksFound: totalCtaBlocks,
      pagesWithChanges,
      pagesNoop,
      pagesUpdated: 0,
      pagesRolledBack: 0,
    },
    pages,
  }
}

/**
 * Validates snapshot hashes, recomputes transformations from beforeLayout,
 * deep-compares against afterLayout, and checks allowed delta.
 */
export function validateSnapshotReport(report: CtaHotlineReport): void {
  if (report.version !== 1 || report.siteCode !== TARGET_SITE_CODE) {
    throw new Error(`Invalid report format: expected version 1 and siteCode '${TARGET_SITE_CODE}'`)
  }
  for (const page of report.pages) {
    for (const [locale, locPlan] of Object.entries(page.locales)) {
      if (!locPlan) continue
      if (locPlan.locale !== locale) {
        throw new Error(`Mismatched locale key '${locale}' vs plan '${locPlan.locale}' on page ${page.pageID}`)
      }
      const recomputedBeforeHash = hashContent(locPlan.beforeLayout)
      if (recomputedBeforeHash !== locPlan.beforeLayoutHash) {
        throw new Error(`Snapshot validation failed: beforeLayoutHash mismatch for page ${page.pageID} (${locale})`)
      }
      const recomputedAfterHash = hashContent(locPlan.afterLayout)
      if (recomputedAfterHash !== locPlan.afterLayoutHash) {
        throw new Error(`Snapshot validation failed: afterLayoutHash mismatch for page ${page.pageID} (${locale})`)
      }
      const expectedAfterLayout = locPlan.beforeLayout.map((block) => {
        if (!block || block.blockType !== 'cta') return block
        const { updatedBlock } = transformCtaBlock(block)
        return updatedBlock
      })
      if (canonicalJson(locPlan.afterLayout) !== canonicalJson(expectedAfterLayout)) {
        throw new Error(`Snapshot validation failed: afterLayout does not match recomputed transformation for page ${page.pageID} (${locale})`)
      }
      if (locPlan.blockChanges.length > 0) {
        for (const bc of locPlan.blockChanges) {
          validateAllowedDelta(bc.changes)
        }
      }
    }
  }
}

export async function acquirePostgresRowLocks(
  payload: Payload,
  req: PayloadRequest,
  siteID: number | string,
): Promise<string | number> {
  if (!payload.db || typeof payload.db.beginTransaction !== 'function') {
    throw new Error('Database adapter does not support transactions; PostgreSQL adapter required')
  }
  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) {
    throw new Error('Failed to begin database transaction')
  }
  req.transactionID = transactionID

  try {
    const session = (payload.db as any).sessions?.[transactionID]
    if (!session?.db?.execute) {
      throw new Error('Database session does not support execute; PostgreSQL adapter required for row locking')
    }
    await session.db.execute(sql`SET LOCAL lock_timeout = '5s'`)
    await session.db.execute(sql`SELECT id FROM pages WHERE site_id = ${siteID} FOR UPDATE`)
    return transactionID
  } catch (error) {
    req.transactionID = undefined
    if (typeof (payload.db as any).rollbackTransaction === 'function') {
      try {
        await (payload.db as any).rollbackTransaction(transactionID)
      } catch {
        // preserve original error
      }
    }
    throw error
  }
}

async function assertNoPendingDraft(
  payload: Payload,
  req: PayloadRequest,
  pageID: number | string,
  locales: SupportedLocaleCode[],
): Promise<void> {
  for (const locale of locales) {
    const read = (draft: boolean) => payload.findByID({
      collection: 'pages',
      id: pageID,
      locale,
      fallbackLocale: false,
      draft,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const published = await read(false)
    const draft = await read(true)
    if (isDraftDifferentFromPublished(published, draft)) {
      throw new Error(`Draft safety abort: Page ${pageID} has pending editor work in ${locale}. Preserving editor work.`)
    }
  }
}

export async function applyWingsGoCtaHotlineUpdates(
  payload: Payload,
  args: { report: CtaHotlineReport; snapshotPath: string; req?: PayloadRequest },
): Promise<CtaHotlineReport> {
  const { report, snapshotPath } = args
  validateSnapshotReport(report)

  if (args.req?.transactionID) {
    throw new Error('Caller-managed transaction not permitted; updater must own its transaction and row locks.')
  }

  // 1. Snapshot must be durably written BEFORE any mutation (crash-recovery journal).
  // Exclusive fs.open with flag 'wx' prevents overwriting existing rollback journal.
  const resolvedSnapshotPath = path.resolve(snapshotPath)
  await fs.mkdir(path.dirname(resolvedSnapshotPath), { recursive: true })
  const snapshotHandle = await fs.open(resolvedSnapshotPath, 'wx')
  try {
    await snapshotHandle.writeFile(JSON.stringify(report, null, 2), 'utf8')
    await snapshotHandle.sync()
  } finally {
    await snapshotHandle.close()
  }

  const req = await getOrCreateReq(payload, args.req, 'vi')
  let transactionID: string | number | null = null

  try {
    // 2. Start PostgreSQL transaction and acquire row lock (fail closed)
    transactionID = await acquirePostgresRowLocks(payload, req, report.siteID)

    // 3. Verify live target site and id
    const liveSite = await findWingsGoSite(payload, req)
    if (String(liveSite.id) !== String(report.siteID)) {
      throw new Error(`Live WingsGo siteID '${liveSite.id}' does not match report siteID '${report.siteID}'`)
    }

    const appliedReport: CtaHotlineReport = {
      ...report,
      summary: { ...report.summary },
      mode: 'apply',
      createdAt: new Date().toISOString(),
      pages: structuredClone(report.pages),
    }

    let updatedCount = 0

    // 4. Update each planned page under lock
    for (const pagePlan of appliedReport.pages) {
      if (pagePlan.status !== 'planned') continue

      const livePage = await payload.findByID({
        collection: 'pages',
        id: pagePlan.pageID,
        depth: 0,
        overrideAccess: true,
        req,
      })

      if (!livePage) {
        throw new Error(`Compare-and-stop: Page ${pagePlan.pageID} not found.`)
      }

      const livePageSiteId = typeof livePage.site === 'object' && livePage.site ? (livePage.site as any).id : livePage.site
      if (String(livePageSiteId) !== String(report.siteID)) {
        throw new Error(`Security abort: Page ${pagePlan.pageID} site '${livePageSiteId}' does not match WingsGo '${report.siteID}'`)
      }

      if (livePage._status !== 'published') {
        throw new Error(`Safety abort: Page ${pagePlan.pageID} status is '${livePage._status}', expected 'published'`)
      }

      // Concurrency check on document-level updatedAt
      if (livePage.updatedAt !== pagePlan.updatedAt) {
        throw new Error(
          `Compare-and-stop: Concurrent modification detected on page ${pagePlan.pageID} (${pagePlan.pathname}). Expected updatedAt '${pagePlan.updatedAt}', got '${livePage.updatedAt}'. Aborting apply.`,
        )
      }

      await assertNoPendingDraft(payload, req, pagePlan.pageID, liveSite.supportedLocales)

      // 5. Preserve latest draft: check hero, title, layout, meta across locales
      for (const locPlan of Object.values(pagePlan.locales)) {
        if (!locPlan || locPlan.blockChanges.length === 0) continue
        const locale = locPlan.locale

        const publishedDoc = await payload.findByID({
          collection: 'pages',
          id: pagePlan.pageID,
          locale,
          draft: false,
          depth: 0,
          overrideAccess: true,
          req,
        })

        const latestDraftDoc = await payload.findByID({
          collection: 'pages',
          id: pagePlan.pageID,
          locale,
          draft: true,
          depth: 0,
          overrideAccess: true,
          req,
        })

        if (isDraftDifferentFromPublished(publishedDoc, latestDraftDoc)) {
          throw new Error(
            `Draft safety abort: Refusing write on page ${pagePlan.pageID} (${pagePlan.pathname}, ${locale}): latest draft differs from published version (title, hero, layout, or meta modified). Preserving editor work.`,
          )
        }

        const currentLayout = Array.isArray(publishedDoc.layout) ? publishedDoc.layout : []
        const currentHash = hashContent(currentLayout)
        if (currentHash !== locPlan.beforeLayoutHash) {
          throw new Error(
            `Compare-and-stop: Layout checksum mismatch on page ${pagePlan.pageID} (${pagePlan.pathname}, ${locale}). Expected '${locPlan.beforeLayoutHash}', got '${currentHash}'. Aborting apply.`,
          )
        }

        await payload.update({
          collection: 'pages',
          id: pagePlan.pageID,
          locale,
          data: { layout: locPlan.afterLayout } as never,
          draft: false,
          overrideAccess: true,
          req,
          context: { disableRevalidate: true, seed: true, us081CtaUpdate: true },
        })
      }

      pagePlan.status = 'updated'
      updatedCount += 1
    }

    appliedReport.summary.pagesUpdated = updatedCount

    await payload.db.commitTransaction(transactionID)
    transactionID = null

    return appliedReport
  } catch (error) {
    if (transactionID) {
      await payload.db.rollbackTransaction(transactionID)
    }
    throw error
  }
}

export async function rollbackWingsGoCtaHotlineUpdates(
  payload: Payload,
  args: { report: CtaHotlineReport; req?: PayloadRequest },
): Promise<CtaHotlineReport> {
  const { report } = args
  validateSnapshotReport(report)

  if (args.req?.transactionID) {
    throw new Error('Caller-managed transaction not permitted; updater must own its transaction and row locks.')
  }
  const req = await getOrCreateReq(payload, args.req, 'vi')
  let transactionID: string | number | null = null

  try {
    transactionID = await acquirePostgresRowLocks(payload, req, report.siteID)

    const liveSite = await findWingsGoSite(payload, req)
    if (String(liveSite.id) !== String(report.siteID)) {
      throw new Error(`Live WingsGo siteID '${liveSite.id}' does not match report siteID '${report.siteID}'`)
    }

    const rollbackReport: CtaHotlineReport = {
      ...report,
      summary: { ...report.summary },
      mode: 'rollback',
      createdAt: new Date().toISOString(),
      pages: structuredClone(report.pages),
    }

    let rolledBackCount = 0

    for (const pagePlan of rollbackReport.pages) {
      if (pagePlan.status !== 'updated' && pagePlan.status !== 'planned') continue

      const livePage = await payload.findByID({
        collection: 'pages',
        id: pagePlan.pageID,
        depth: 0,
        overrideAccess: true,
        req,
      })

      if (!livePage) {
        throw new Error(`Rollback aborted: Page ${pagePlan.pageID} not found.`)
      }

      const livePageSiteId = typeof livePage.site === 'object' && livePage.site ? (livePage.site as any).id : livePage.site
      if (String(livePageSiteId) !== String(report.siteID)) {
        throw new Error(`Security abort: Page ${pagePlan.pageID} site does not match WingsGo '${report.siteID}'`)
      }

      if (livePage._status !== 'published') {
        throw new Error(`Safety abort: Page ${pagePlan.pageID} status is '${livePage._status}', expected 'published'`)
      }

      let anyLocaleRestored = false

      await assertNoPendingDraft(payload, req, pagePlan.pageID, liveSite.supportedLocales)

      for (const locPlan of Object.values(pagePlan.locales)) {
        if (!locPlan || locPlan.blockChanges.length === 0) continue
        const locale = locPlan.locale

        const publishedDoc = await payload.findByID({
          collection: 'pages',
          id: pagePlan.pageID,
          locale,
          draft: false,
          depth: 0,
          overrideAccess: true,
          req,
        })

        const latestDraftDoc = await payload.findByID({
          collection: 'pages',
          id: pagePlan.pageID,
          locale,
          draft: true,
          depth: 0,
          overrideAccess: true,
          req,
        })

        if (isDraftDifferentFromPublished(publishedDoc, latestDraftDoc)) {
          throw new Error(
            `Draft safety abort: Refusing rollback on page ${pagePlan.pageID} (${pagePlan.pathname}, ${locale}): draft differs from published version. Preserving editor work.`,
          )
        }

        const currentLayout = Array.isArray(publishedDoc.layout) ? publishedDoc.layout : []
        const currentHash = hashContent(currentLayout)

        if (currentHash === locPlan.beforeLayoutHash) {
          continue
        }

        if (currentHash !== locPlan.afterLayoutHash) {
          throw new Error(
            `Rollback refused for page ${pagePlan.pageID} (${pagePlan.pathname}, ${locale}); document layout was modified concurrently after the update was applied.`,
          )
        }

        await payload.update({
          collection: 'pages',
          id: pagePlan.pageID,
          locale,
          data: { layout: locPlan.beforeLayout } as never,
          draft: false,
          overrideAccess: true,
          req,
          context: { disableRevalidate: true, seed: true, us081CtaRollback: true },
        })
        anyLocaleRestored = true
      }

      if (anyLocaleRestored) {
        pagePlan.status = 'rolled-back'
        rolledBackCount += 1
      }
    }

    rollbackReport.summary.pagesRolledBack = rolledBackCount

    await payload.db.commitTransaction(transactionID)
    transactionID = null

    return rollbackReport
  } catch (error) {
    if (transactionID) {
      await payload.db.rollbackTransaction(transactionID)
    }
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

      let report: CtaHotlineReport

      if (rollbackIdx !== -1) {
        const rollbackFilePath = process.argv[rollbackIdx + 1]
        if (!rollbackFilePath) {
          throw new Error('Flag --rollback requires a path to a previous snapshot/report JSON file.')
        }
        const fileContent = await fs.readFile(path.resolve(rollbackFilePath), 'utf8')
        const previousReport = JSON.parse(fileContent) as CtaHotlineReport
        console.log(`Executing targeted rollback for WingsGo CTA hotlines from ${rollbackFilePath}...`)
        report = await rollbackWingsGoCtaHotlineUpdates(payload, { report: previousReport })
      } else {
        console.log('Auditing WingsGo published CTA content...')
        const plan = await planWingsGoCtaHotlineUpdates(payload)

        if (isApply) {
          if (!snapshotPath) {
            throw new Error('Flag --apply requires --snapshot <path> to durably persist the pre-mutation snapshot journal.')
          }
          console.log(`Applying CTA hotline updates to ${plan.summary.pagesWithChanges} page(s)...`)
          report = await applyWingsGoCtaHotlineUpdates(payload, { report: plan, snapshotPath })
          console.log('Post-commit note: Standalone CLI executed with disableRevalidate: true. For ISR/CDN revalidation, trigger on-demand revalidation via API or deployment cutover.')
        } else {
          console.log('Dry-run complete (no database writes performed). Pass --apply --snapshot <path> to execute.')
          report = plan
          if (snapshotPath) {
            const resolvedPath = path.resolve(snapshotPath)
            await fs.mkdir(path.dirname(resolvedPath), { recursive: true })
            const handle = await fs.open(resolvedPath, 'wx')
            try {
              await handle.writeFile(JSON.stringify(report, null, 2), 'utf8')
              await handle.sync()
            } finally {
              await handle.close()
            }
            console.log(`Snapshot plan journal saved to: ${resolvedPath}`)
          }
        }
      }

      console.log(JSON.stringify({
        mode: report.mode,
        summary: report.summary,
        pages: report.pages.map((p) => ({
          pageID: p.pageID,
          pathname: p.pathname,
          status: p.status,
          locales: Object.keys(p.locales),
        })),
      }, null, 2))
    } finally {
      await payload.destroy()
    }
  }

  run().then(() => {
    // Standalone Payload leaves idle PostgreSQL sockets alive after destroy.
    process.stdout.write('', () => process.exit(0))
  }).catch((error) => {
    console.error('Fatal error during CTA hotline updater execution:', error)
    process.stderr.write('', () => process.exit(1))
  })
}
