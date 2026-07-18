import config from '@payload-config'
import { headers } from 'next/headers'
import { createLocalReq, getPayload } from 'payload'
import type { Payload } from 'payload'

import {
  createLayoutPresetData,
  getLayoutPresetDefinition,
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

  const fallbackForms = await payload.find({
    collection: 'forms',
    depth: 0,
    limit: 1,
    overrideAccess: false,
    req,
  })

  return fallbackForms.docs[0]?.id
}

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = await getPayload({ config })
    const requestHeaders = await headers()
    const { user } = await payload.auth({ headers: requestHeaders })

    if (!user) {
      return Response.json({ message: 'Bạn cần đăng nhập để tạo trang.' }, { status: 401 })
    }

    const body = (await request.json()) as PageWizardPayload
    const title = body.title?.trim()
    const slug = slugify(body.slug || title || '')
    const preset = isLayoutPresetKey(body.preset)
      ? body.preset
      : getLayoutPresetDefinition(undefined).key
    const siteID =
      typeof body.site === 'string' && /^\d+$/.test(body.site) ? Number(body.site) : body.site

    if (!siteID || !title || !slug) {
      return Response.json(
        { message: 'Thiếu site, tiêu đề hoặc đường dẫn.' },
        { status: 400 },
      )
    }

    const payloadReq = await createLocalReq({ user }, payload)
    const formID = await findSiteForm(payload, payloadReq, siteID)
    const presetData = createLayoutPresetData(preset, {
      formID,
      summary: body.summary?.trim(),
      title,
    })

    const createdPage = await payload.create({
      collection: 'pages',
      data: {
        _status: 'draft',
        layoutPresetKey: preset,
        meta: {
          description: body.summary,
          title,
        },
        site: siteID as number,
        slug,
        title,
        ...presetData,
      } as never,
      overrideAccess: false,
      req: payloadReq,
    })

    return Response.json({
      id: createdPage.id,
      preset,
    })
  } catch (error) {
    return Response.json(
      {
        message: error instanceof Error ? error.message : 'Không tạo được trang nháp.',
      },
      { status: 500 },
    )
  }
}
