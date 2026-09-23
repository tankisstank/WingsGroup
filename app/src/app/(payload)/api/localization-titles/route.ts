import config from '@payload-config'
import { headers } from 'next/headers'
import { createLocalReq, getPayload } from 'payload'

import { ADMIN_SOURCE_LOCALE } from '@/utilities/localizedAdminTitle'
import { isSupportedLocale, type SupportedLocaleCode } from '@/utilities/locales'

const titleCollections = new Set(['pages', 'posts', 'tour-products'])
const maxIDs = 100

type LocalizedTitleDocument = {
  id: number | string
  site?: number | string | { id?: number | string | null } | null
  title?: unknown
}

type SourceSite = {
  defaultLocale?: string | null
  id: number | string
}

const json = (body: Record<string, unknown>, status = 200) =>
  Response.json(body, {
    headers: { 'Cache-Control': 'no-store' },
    status,
  })

const parseIDs = (value: unknown): string[] | null => {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxIDs) return null

  const ids = value
    .filter((id): id is number | string =>
      (typeof id === 'string' && id.trim().length > 0 && id.length <= 160) ||
        (typeof id === 'number' && Number.isInteger(id)),
    )
    .map(String)

  return ids.length === value.length ? [...new Set(ids)] : null
}

const relationID = (value: LocalizedTitleDocument['site']): string | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'object') {
    return value.id === undefined || value.id === null ? null : String(value.id)
  }
  return String(value)
}

const sourceLocaleForSite = (site?: SourceSite): SupportedLocaleCode =>
  site?.defaultLocale && isSupportedLocale(site.defaultLocale)
    ? site.defaultLocale
    : ADMIN_SOURCE_LOCALE

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as
    | { collection?: unknown; ids?: unknown; locale?: unknown }
    | null
  const collection = typeof body?.collection === 'string' ? body.collection : ''
  const ids = parseIDs(body?.ids)
  const locale = typeof body?.locale === 'string' ? body.locale : ADMIN_SOURCE_LOCALE

  if (!titleCollections.has(collection) || !ids || !isSupportedLocale(locale)) {
    return json({ message: 'Yêu cầu title fallback không hợp lệ.' }, 400)
  }

  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await headers() })
    if (!user) return json({ message: 'Bạn cần đăng nhập để xem title fallback.' }, 401)

    const req = await createLocalReq({ user }, payload)
    const currentLocaleResult = (await payload.find({
      collection: collection as never,
      depth: 0,
      draft: true,
      fallbackLocale: false,
      limit: ids.length,
      locale,
      overrideAccess: false,
      pagination: false,
      req,
      select: { id: true, site: true, title: true },
      where: { id: { in: ids } },
    } as never)) as { docs: LocalizedTitleDocument[] }

    const siteIDs = [
      ...new Set(
        currentLocaleResult.docs
          .map((doc) => relationID(doc.site))
          .filter((id): id is string => Boolean(id)),
      ),
    ]
    const sitesResult = siteIDs.length
      ? ((await payload.find({
          collection: 'sites',
          depth: 0,
          limit: siteIDs.length,
          overrideAccess: false,
          pagination: false,
          req,
          select: { defaultLocale: true, id: true },
          where: { id: { in: siteIDs } },
        } as never)) as { docs: SourceSite[] })
      : { docs: [] }
    const sitesByID = new Map(sitesResult.docs.map((site) => [String(site.id), site]))
    const idsBySourceLocale = new Map<SupportedLocaleCode, string[]>()

    for (const doc of currentLocaleResult.docs) {
      const locale = sourceLocaleForSite(sitesByID.get(relationID(doc.site) || ''))
      const sourceIDs = idsBySourceLocale.get(locale) || []
      sourceIDs.push(String(doc.id))
      idsBySourceLocale.set(locale, sourceIDs)
    }

    const sourceResults = await Promise.all(
      [...idsBySourceLocale.entries()].map(async ([sourceLocale, sourceIDs]) => {
        const result = (await payload.find({
          collection: collection as never,
          depth: 0,
          draft: true,
          fallbackLocale: false,
          limit: sourceIDs.length,
          locale: sourceLocale,
          overrideAccess: false,
          pagination: false,
          req,
          select: { id: true, title: true },
          where: { id: { in: sourceIDs } },
        } as never)) as { docs: Array<{ id: number | string; title?: unknown }> }

        return result.docs.flatMap((doc) => {
          const title = doc.title
          return typeof title === 'string' && title.trim()
            ? [[String(doc.id), { locale: sourceLocale, title: title.trim() } as const]]
            : []
        })
      }),
    )
    const titles = Object.fromEntries(sourceResults.flat())

    return json({ titles })
  } catch {
    return json({ message: 'Không thể tải title fallback trong phạm vi được phép.' }, 404)
  }
}
