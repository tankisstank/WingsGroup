import config from '@payload-config'
import { headers } from 'next/headers'
import { createLocalReq, getPayload } from 'payload'
import type { Payload } from 'payload'

import {
  createLayoutPresetData,
  isLayoutPresetKey,
  type LayoutPresetKey,
} from '@/utilities/layoutPresets'

type PageWizardPayload = {
  preset?: LayoutPresetKey
  site?: number | string
  slug?: string
  summary?: string
  title?: string
}

class PageWizardError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'PageWizardError'
    this.status = status
  }
}

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const findSiteForm = async (
  payload: Payload,
  req: Awaited<ReturnType<typeof createLocalReq>>,
  siteID: number | string,
) => {
  const scopedForms = await payload.find({
    collection: 'forms',
    depth: 0,
    limit: 1,
    overrideAccess: false,
    req,
    where: {
      site: {
        equals: siteID,
      },
    },
  })

  if (scopedForms.docs[0]) {
    return scopedForms.docs[0].id
  }

  // A form must never be borrowed from another site. Presets that include a
  // form gracefully render their governed CTA fallback when this is undefined.
  return undefined
}

const normalizeSiteID = (value: unknown): number | string | undefined => {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value)
  }

  return undefined
}

const valueContains = (value: unknown, expected: string): boolean => {
  if (typeof value === 'string') return value === expected

  if (value && typeof value === 'object') {
    return Object.values(value).some((entry) => valueContains(entry, expected))
  }

  return false
}

const hasLayout = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.length > 0

  if (value && typeof value === 'object') {
    return Object.values(value).some((entry) => hasLayout(entry))
  }

  return false
}

const hasSameID = (value: unknown, expected: number | string): boolean =>
  String(value && typeof value === 'object' && 'id' in value ? value.id : value) ===
  String(expected)

const parsePageWizardPayload = (body: unknown) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new PageWizardError('Dữ liệu tạo trang không hợp lệ.')
  }

  const value = body as PageWizardPayload
  const title = typeof value.title === 'string' ? value.title.trim() : ''
  const slugSource = typeof value.slug === 'string' ? value.slug : title
  const slug = slugify(slugSource)
  const summary = typeof value.summary === 'string' ? value.summary.trim() : ''
  const siteID = normalizeSiteID(value.site)

  if (!siteID || !title || !slug) {
    throw new PageWizardError('Thiếu site, tiêu đề hoặc đường dẫn.')
  }

  if (!isLayoutPresetKey(value.preset)) {
    throw new PageWizardError('Loại trang không hợp lệ.')
  }

  return { preset: value.preset, siteID, slug, summary, title }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = await getPayload({ config })
    const requestHeaders = await headers()
    const { user } = await payload.auth({ headers: requestHeaders })

    if (!user) {
      return Response.json({ message: 'Bạn cần đăng nhập để tạo trang.' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      throw new PageWizardError('Dữ liệu tạo trang phải là JSON hợp lệ.')
    }
    const { preset, siteID, slug, summary, title } = parsePageWizardPayload(body)

    const payloadReq = await createLocalReq({ user }, payload)

    // Read through the caller's access rules so arbitrary IDs and cross-site
    // submissions cannot create a page outside the current operator scope.
    try {
      await payload.findByID({
        collection: 'sites',
        depth: 0,
        id: siteID,
        overrideAccess: false,
        req: payloadReq,
      })
    } catch {
      throw new PageWizardError('Bạn không có quyền sử dụng site đã chọn.', 403)
    }

    const existing = await payload.find({
      collection: 'pages',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      req: payloadReq,
      where: {
        and: [{ site: { equals: siteID } }, { slug: { equals: slug } }],
      },
    })

    if (existing.docs.length > 0) {
      throw new PageWizardError('Đường dẫn này đã tồn tại trong site đã chọn.', 409)
    }

    const formID = await findSiteForm(payload, payloadReq, siteID)
    const presetData = createLayoutPresetData(preset, {
      formID,
      summary,
      title,
    })

    const createdPage = await payload.create({
      collection: 'pages',
      data: {
        _status: 'draft',
        layoutPresetKey: preset,
        meta: {
          description: summary,
          title,
        },
        site: siteID as number,
        slug,
        title,
        ...presetData,
      } as never,
      locale: 'vi',
      overrideAccess: false,
      req: payloadReq,
    })

    const verifiedPage = await payload.findByID({
      collection: 'pages',
      depth: 0,
      draft: true,
      id: createdPage.id,
      locale: 'all',
      overrideAccess: false,
      req: payloadReq,
    })

    const isValid =
      hasSameID(verifiedPage.id, createdPage.id) &&
      hasSameID(verifiedPage.site, siteID) &&
      verifiedPage.slug === slug &&
      valueContains(verifiedPage.title, title) &&
      (!summary || valueContains(verifiedPage.meta?.description, summary)) &&
      hasLayout(verifiedPage.layout)

    if (!isValid) {
      await payload.delete({
        collection: 'pages',
        id: createdPage.id,
        overrideAccess: false,
        req: payloadReq,
      })
      throw new PageWizardError(
        'Trang nháp không vượt qua kiểm tra toàn vẹn dữ liệu và đã được hoàn tác.',
        500,
      )
    }

    return Response.json({
      id: createdPage.id,
      preset,
    })
  } catch (error) {
    return Response.json(
      {
        message: error instanceof Error ? error.message : 'Không tạo được trang nháp.',
      },
      { status: error instanceof PageWizardError ? error.status : 500 },
    )
  }
}
