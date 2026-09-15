import type { PayloadRequest } from 'payload'
import { getPayload } from 'payload'
import { NextRequest } from 'next/server'

import configPromise from '@payload-config'
import { normalizeRelationID } from '@/access/roles'
import { mintPreviewHandoff, type PreviewCollection } from '@/utilities/previewHandoff'
import { getProductionPreviewOrigin } from '@/utilities/previewOrigin'
import {
  defaultSiteCode,
  isPublicLocale,
  isSupportedLocale,
  siteCodeToAliasMap,
  type SupportedLocaleCode,
} from '@/utilities/sitePaths'
import {
  getPageCanonicalPath,
  getPostCanonicalPath,
  getTourCampaignPath,
  getTourProductPath,
} from '@/utilities/siteURLs'

const collections = new Set<PreviewCollection>(['pages', 'posts', 'tour-campaigns', 'tour-products'])
const safePath = (value: null | string) => {
  if (
    !value ||
    value.length > 2048 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[?#\\]/u.test(value)
  ) {
    return null
  }

  const normalized = value.replace(/\/+/gu, '/')
  const segments = normalized.split('/').filter(Boolean)
  for (const segment of segments) {
    let decodedSegment = segment
    try {
      decodedSegment = decodeURIComponent(segment)
      if (decodedSegment.includes('%')) decodedSegment = decodeURIComponent(decodedSegment)
    } catch {
      return null
    }

    if (
      decodedSegment === '.' ||
      decodedSegment === '..' ||
      decodedSegment.includes('/') ||
      decodedSegment.includes('\\') ||
      /[?#]/u.test(decodedSegment)
    ) {
      return null
    }
  }

  return normalized === '/' ? normalized : normalized.replace(/\/+$/u, '') || '/'
}

const getCollection = (value: null | string): PreviewCollection | null =>
  value && collections.has(value as PreviewCollection) ? (value as PreviewCollection) : null

const getLocale = (value: null | string): SupportedLocaleCode | null =>
  isSupportedLocale(value) && isPublicLocale(value) ? value : null

const escapeHTMLAttribute = (value: string): string =>
  value
    .replace(/&/gu, '&amp;')
    .replace(/"/gu, '&quot;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')

const handoffForm = (action: string, handoff: string) => {
  const actionOrigin = action.startsWith('http') ? new URL(action).origin : null
  const formActionPolicy = `form-action 'self'${actionOrigin ? ` ${actionOrigin}` : ''}`

  return new Response(
    `<!doctype html><meta name="referrer" content="origin"><form method="post" action="${escapeHTMLAttribute(action)}"><input type="hidden" name="handoff" value="${escapeHTMLAttribute(handoff)}"></form><script>document.forms[0].submit()</script>`,
    {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Security-Policy': formActionPolicy,
        'Content-Security-Policy-Report-Only': formActionPolicy,
        'Content-Type': 'text/html; charset=utf-8',
        // The handoff token remains POST-only. Sending only the CMS origin lets
        // the child page prove the trusted iframe parent without leaking path,
        // query, or token into the cross-domain request.
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    },
  )
}

type PreviewDocument = {
  _status?: null | string
  id: number | string
  pathname?: null | string
  site?: unknown
  slug?: null | string
}

type PreviewSite = {
  code?: null | string
  defaultLocale?: null | string
  isActive?: boolean | null
  supportedLocales?: null | string[]
}

const resolvePreviewLocales = (site: PreviewSite, requestedLocale: null | string) => {
  const configuredLocales = (site.supportedLocales || []).filter(isSupportedLocale)
  const fallbackLocales = configuredLocales.length
    ? configuredLocales
    : site.defaultLocale && isSupportedLocale(site.defaultLocale)
      ? [site.defaultLocale]
      : ['vi']
  const defaultLocale =
    (site.defaultLocale && isPublicLocale(site.defaultLocale)
      ? fallbackLocales.includes(site.defaultLocale)
        ? site.defaultLocale
        : null
      : null) || fallbackLocales.find(isPublicLocale)
  const locale = requestedLocale || defaultLocale

  if (
    !defaultLocale ||
    !locale ||
    !isPublicLocale(locale) ||
    (configuredLocales.length > 0 && !configuredLocales.includes(locale))
  ) {
    return null
  }

  return { defaultLocale, locale }
}

const getCanonicalDocumentPath = (
  collection: PreviewCollection,
  document: PreviewDocument,
): string | null => {
  switch (collection) {
    case 'pages':
      return getPageCanonicalPath({ pathname: document.pathname, slug: document.slug })
    case 'posts':
      return document.slug ? getPostCanonicalPath(document.slug) : null
    case 'tour-campaigns':
      return document.slug ? getTourCampaignPath(document.slug) : null
    case 'tour-products':
      return document.slug ? getTourProductPath(document.slug) : null
    default:
      return null
  }
}

const forbidden = () => new Response('You are not allowed to preview this page', { status: 403 })

export async function GET(req: NextRequest): Promise<Response> {
  const params = new URL(req.url).searchParams
  const collection = getCollection(params.get('collection'))
  const documentID = params.get('id')
  const requestedPath = safePath(params.get('path'))
  const requestedLocaleParam = params.get('locale')
  const requestedLocale = requestedLocaleParam ? getLocale(requestedLocaleParam) : null
  if (
    !collection ||
    !documentID ||
    !requestedPath ||
    (requestedLocaleParam !== null && !requestedLocale)
  ) {
    return new Response('Insufficient preview parameters', { status: 404 })
  }

  let payload: Awaited<ReturnType<typeof getPayload>>
  try {
    payload = await getPayload({ config: configPromise })
  } catch {
    return new Response('Preview service is unavailable', { status: 503 })
  }

  let user
  try {
    user = (
      await payload.auth({ req: req as unknown as PayloadRequest, headers: req.headers })
    ).user
  } catch {
    return forbidden()
  }
  if (!user) return forbidden()

  const findDocument = async (locale?: SupportedLocaleCode) =>
    (await payload.findByID({
      collection,
      depth: 1,
      draft: true,
      fallbackLocale: false,
      id: documentID,
      ...(locale ? { locale } : {}),
      overrideAccess: false,
      req: req as unknown as PayloadRequest,
    })) as unknown as PreviewDocument

  let document: PreviewDocument | null = null
  try {
    document = await findDocument(requestedLocale || undefined)
  } catch {
    return forbidden()
  }

  if (!document) return forbidden()

  const embeddedSite =
    typeof document.site === 'object' && document.site
      ? (document.site as PreviewSite & { id?: number | string })
      : null
  const siteID = normalizeRelationID(document.site as never)
  let site: PreviewSite | null = embeddedSite
  try {
    if (siteID !== undefined) {
      site = (await payload.findByID({
        collection: 'sites',
        depth: 0,
        id: siteID,
        overrideAccess: false,
        req: req as unknown as PayloadRequest,
      })) as unknown as PreviewSite
    }
  } catch {
    return forbidden()
  }
  if (!site?.code || site.isActive === false) return forbidden()

  const locales = resolvePreviewLocales(site, requestedLocale)
  if (!locales) return new Response('Preview locale is not enabled for this site', { status: 404 })

  if (!requestedLocale) {
    try {
      document = await findDocument(locales.locale)
    } catch {
      return forbidden()
    }
    if (!document) return forbidden()
  }

  // The persisted document route is authoritative. Browser input can only
  // select the record; it cannot redirect the handoff to another path.
  const persistedPath = getCanonicalDocumentPath(collection, document)
  const path = safePath(persistedPath || null)
  if (!path) return new Response('Preview path is unavailable', { status: 409 })

  const handoff = await mintPreviewHandoff({
    collection,
    documentID: String(document.id),
    defaultLocale: locales.defaultLocale,
    locale: locales.locale,
    mode: document._status === 'draft' ? 'draft' : 'published',
    path,
    siteCode: site.code,
  })
  if (!handoff) return new Response('Preview handoff could not be issued', { status: 503 })

  const productionOrigin =
    process.env.NODE_ENV === 'production' ? getProductionPreviewOrigin(site.code) : null
  if (process.env.NODE_ENV === 'production' && !productionOrigin) {
    return new Response('Preview destination is not configured for this site', { status: 503 })
  }
  const localPrefix =
    site.code === defaultSiteCode
      ? ''
      : siteCodeToAliasMap[site.code]
        ? `/${siteCodeToAliasMap[site.code]}`
        : null
  if (!productionOrigin && localPrefix === null) {
    return new Response('Preview destination is not configured for this site', { status: 503 })
  }

  const target = productionOrigin
    ? `${productionOrigin}/next/preview/handoff`
    : `${localPrefix}/next/preview/handoff`
  return handoffForm(target, handoff)
}
