import 'dotenv/config'

import fs from 'node:fs/promises'
import path from 'node:path'

import { createLocalReq, getPayload } from 'payload'

import config from '../src/payload.config'
import {
  parseArgs,
  selectedSourceIDs,
  sourceTourCode,
  type NormalizedTour,
} from './lib/doicanhviet'

const defaultArtifactDir = path.resolve(
  import.meta.dirname,
  '..',
  '..',
  'artifacts',
  'imports',
  'doicanhviet',
)

const context = { disableRevalidate: true, import: true }

const nowISO = () => new Date().toISOString()

const uniqueSections = (sections: unknown[]) =>
  [...new Set(sections.filter((value): value is string => typeof value === 'string' && value.length > 0))]

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  const filePath = path.resolve(
    String(args.file || path.join(defaultArtifactDir, 'tours.normalized.json')),
  )
  const adminEmail = String(args['admin-email'] || process.env.IMPORT_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').trim()
  if (!adminEmail) throw new Error('Thiếu --admin-email hoặc IMPORT_ADMIN_EMAIL hoặc ADMIN_EMAIL')

  const normalized = JSON.parse(await fs.readFile(filePath, 'utf8')) as NormalizedTour[]
  const explicitOnly = args.only ? selectedSourceIDs(args.only) : null
  const today = new Date()
  const threshold = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())

  const candidates = normalized.filter((record) => {
    if (record.kind !== 'tour') return false
    if (explicitOnly && !explicitOnly.has(record.sourceId)) return false
    if (record.blockingErrors.length > 0) return false
    if (!record.market) return false
    if (!record.itineraryDays.length) return false

    const hasFutureDepartures = record.departures.some((departure) => {
      if (!departure.departureDate) return false
      const date = new Date(departure.departureDate)
      if (Number.isNaN(date.getTime())) return false
      return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) >= threshold
    })

    return !hasFutureDepartures
  })

  if (!candidates.length) throw new Error('Không có tour contact-only phù hợp để publish')

  const payload = await getPayload({ config })
  const admin = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: adminEmail } },
  })
  const adminUser = admin.docs[0]
  if (!adminUser) throw new Error(`Admin user not found: ${adminEmail}`)
  const req = await createLocalReq({ user: adminUser }, payload)

  const site = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: { code: { equals: 'wings-go' } },
  })
  const siteID = site.docs[0]?.id
  if (!siteID) throw new Error('WingsGo site not found: wings-go')

  const report: Array<Record<string, unknown>> = []
  let productsPublished = 0
  let pagesPublished = 0

  for (const record of candidates) {
    const tourCode = sourceTourCode(record.sourceId)
    const products = await payload.find({
      collection: 'tour-products',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      req,
      where: {
        and: [{ site: { equals: siteID } }, { tourCode: { equals: tourCode } }],
      },
    })
    const product = products.docs[0] as Record<string, any> | undefined
    if (!product) {
      report.push({ sourceId: record.sourceId, status: 'missingProduct', tourCode })
      continue
    }

    const sectionVisibility = uniqueSections(
      (Array.isArray(product.sectionVisibility) ? product.sectionVisibility : record.sectionVisibility).filter(
        (section) => section !== 'departures' && section !== 'sticky-cta',
      ),
    )
    const sectionOrder = uniqueSections(
      (Array.isArray(product.sectionOrder) ? product.sectionOrder : record.sectionVisibility).filter(
        (section) => section !== 'departures' && section !== 'sticky-cta',
      ),
    )

    await payload.update({
      collection: 'tour-products',
      id: product.id,
      overrideAccess: true,
      req,
      context,
      locale: 'vi',
      data: {
        _status: 'published',
        primaryCTA: {
          ...(product.primaryCTA || {}),
          mode: 'contact',
          label: 'Liên hệ',
        },
        bcfg: {
          ...(product.bcfg || {}),
          stickyCTAEnabled: false,
          ctaStyle: 'inquiry',
        },
        sectionVisibility,
        sectionOrder,
      } as never,
    })
    productsPublished += 1

    const pageID =
      product.wrapperPage && typeof product.wrapperPage === 'object'
        ? product.wrapperPage.id
        : product.wrapperPage
    if (pageID) {
      await payload.update({
        collection: 'pages',
        id: pageID,
        overrideAccess: true,
        req,
        context,
        locale: 'vi',
        data: {
          _status: 'published',
          publishedAt: nowISO(),
        } as never,
      })
      pagesPublished += 1
    }

    report.push({
      sourceId: record.sourceId,
      status: 'published-contact-only',
      productId: product.id,
      pageId: pageID || null,
      tourCode,
    })
  }

  console.log(
    JSON.stringify(
      {
        productsPublished,
        pagesPublished,
        totalCandidates: candidates.length,
        report,
      },
      null,
      2,
    ),
  )

  await payload.destroy()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
