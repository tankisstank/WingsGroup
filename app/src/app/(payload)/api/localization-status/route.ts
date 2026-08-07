import config from '@payload-config'
import { createLocalReq, getPayload } from 'payload'
import { headers } from 'next/headers'

import { cmsEnabledLocaleMetadata, type SupportedLocaleCode } from '@/utilities/locales'

const localizedCollections = new Set([
  'categories',
  'departure-variants',
  'media',
  'pages',
  'posts',
  'site-settings',
  'tour-campaigns',
  'tour-departures',
  'tour-products',
])

const meaningful = (value: unknown): boolean => {
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'number' || typeof value === 'boolean') return true
  if (Array.isArray(value)) return value.some(meaningful)
  if (value && typeof value === 'object') return Object.values(value).some(meaningful)
  return false
}
const hasLocaleValue = (value: unknown, locale: string): boolean => {
  if (Array.isArray(value)) return value.some((item) => hasLocaleValue(item, locale))
  if (!value || typeof value !== 'object') return false

  const record = value as Record<string, unknown>
  if (Object.prototype.hasOwnProperty.call(record, locale)) {
    return meaningful(record[locale])
  }

  return Object.values(record).some((item) => hasLocaleValue(item, locale))
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const collection = url.searchParams.get('collection') || ''
  const id = url.searchParams.get('id')

  if (!localizedCollections.has(collection)) {
    return Response.json({ message: 'Collection không hỗ trợ metadata locale.' }, { status: 400 })
  }

  if (!id) {
    return Response.json({
      locales: cmsEnabledLocaleMetadata.map(({ code, label }) => ({ code, label })),
      statuses: {},
    })
  }

  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await headers() })

    if (!user) {
      return Response.json({ message: 'Bạn cần đăng nhập để xem trạng thái locale.' }, { status: 401 })
    }

    const req = await createLocalReq({ user }, payload)
    const doc = (await payload.findByID({
      collection: collection as never,
      depth: 0,
      draft: true,
      fallbackLocale: false,
      id,
      locale: 'all',
      overrideAccess: false,
      req,
    })) as Record<string, unknown>

    const statuses = Object.fromEntries(
      cmsEnabledLocaleMetadata.map(({ code }) => {
        const statusValue = doc._status
        const localizedStatus =
          statusValue && typeof statusValue === 'object'
            ? (statusValue as Record<string, unknown>)[code]
            : statusValue
        const hasContent = hasLocaleValue(doc, code)
        const status = !hasContent
          ? 'uncreated'
          : localizedStatus === 'published' || doc._status === 'published'
            ? 'published'
            : 'draft'

        return [code, status]
      }),
    ) as Partial<Record<SupportedLocaleCode, 'draft' | 'published' | 'uncreated'>>

    return Response.json({
      locales: cmsEnabledLocaleMetadata.map(({ code, label }) => ({ code, label })),
      statuses,
    })
  } catch {
    return Response.json({ message: 'Không thể tải trạng thái locale trong phạm vi được phép.' }, { status: 404 })
  }
}
