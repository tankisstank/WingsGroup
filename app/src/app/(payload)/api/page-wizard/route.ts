import config from '@payload-config'
import { headers } from 'next/headers'
import { createLocalReq, getPayload } from 'payload'
import type { Payload } from 'payload'

import { createLayoutPresetData } from '@/utilities/layoutPresets'
import {
  isCmsLocale,
  PageWizardError,
  parsePageWizardPayload,
} from '@/utilities/pageWizardPayload'

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
    const { locale, preset, siteID, slug, summary, title } = parsePageWizardPayload(body)

    const payloadReq = await createLocalReq({ user }, payload)

    // Read through the caller's access rules so arbitrary IDs and cross-site
    // submissions cannot create a page outside the current operator scope.
    let site
    try {
      site = await payload.findByID({
        collection: 'sites',
        depth: 0,
        id: siteID,
        overrideAccess: false,
        req: payloadReq,
      })
    } catch {
      throw new PageWizardError('Bạn không có quyền sử dụng site đã chọn.', 403)
    }

    const siteLocales = Array.isArray(site.supportedLocales)
      ? site.supportedLocales.filter(isCmsLocale)
      : []

    if (siteLocales.length > 0 && !siteLocales.includes(locale)) {
      throw new PageWizardError('Locale này chưa được site cho phép tạo nội dung.')
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
      locale,
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
      locale,
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
