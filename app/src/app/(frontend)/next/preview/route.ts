import type { PayloadRequest } from 'payload'
import { getPayload } from 'payload'
import { NextRequest } from 'next/server'

import configPromise from '@payload-config'
import { normalizeRelationID } from '@/access/roles'
import { mintPreviewHandoff, type PreviewCollection } from '@/utilities/previewHandoff'
import { defaultSiteCode, siteCodeToAliasMap } from '@/utilities/sitePaths'

const collections = new Set<PreviewCollection>(['pages', 'posts', 'tour-campaigns', 'tour-products'])
const safePath = (value: string | null) =>
  value && value.startsWith('/') && !value.startsWith('//') && !/[?#\\]/u.test(value) ? value : null
const siteOrigin = (site: { primaryDomain?: null | string } | null | undefined) => {
  const host = site?.primaryDomain?.trim().replace(/^https?:\/\//u, '').replace(/\/$/u, '')
  return host && process.env.NODE_ENV === 'production' ? `https://${host}` : ''
}
const handoffForm = (action: string, handoff: string) => new Response(
  `<!doctype html><meta name="referrer" content="no-referrer"><form method="post" action="${action}"><input type="hidden" name="handoff" value="${handoff}"></form><script>document.forms[0].submit()</script>`,
  { headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/html; charset=utf-8', 'Referrer-Policy': 'no-referrer' } },
)

export async function GET(req: NextRequest): Promise<Response> {
  const params = new URL(req.url).searchParams
  const collection = params.get('collection') as PreviewCollection
  const documentID = params.get('id')
  const requestedPath = safePath(params.get('path'))
  if (!collections.has(collection) || !documentID || !requestedPath) return new Response('Insufficient preview parameters', { status: 404 })
  const payload = await getPayload({ config: configPromise })
  let user
  try { user = (await payload.auth({ req: req as unknown as PayloadRequest, headers: req.headers })).user } catch { return new Response('You are not allowed to preview this page', { status: 403 }) }
  if (!user) return new Response('You are not allowed to preview this page', { status: 403 })
  type PreviewDocument = { id: number | string; pathname?: null | string; site?: unknown }
  let document: PreviewDocument | null = null
  try {
    document = (await payload.findByID({ collection, depth: 1, id: documentID, overrideAccess: false, req: req as unknown as PayloadRequest })) as unknown as PreviewDocument
  } catch { return new Response('You are not allowed to preview this page', { status: 403 }) }
  if (!document) return new Response('You are not allowed to preview this page', { status: 403 })
  const embeddedSite = typeof document.site === 'object' && document.site ? (document.site as { code?: string; primaryDomain?: string }) : null
  const siteID = normalizeRelationID(document.site as never)
  const site = embeddedSite || (siteID ? await payload.findByID({ collection: 'sites', depth: 0, id: siteID, overrideAccess: false, req: req as unknown as PayloadRequest }) : null)
  if (!site?.code) return new Response('You are not allowed to preview this page', { status: 403 })
  // A Page's hierarchical pathname is authoritative; browser input cannot
  // downgrade it to a slug-derived URL.
  const path = collection === 'pages' ? safePath(document.pathname || null) : requestedPath
  if (!path) return new Response('Preview path is unavailable', { status: 409 })
  const handoff = await mintPreviewHandoff({ collection, documentID: String(document.id), locale: params.get('locale') || 'vi', path, siteCode: site.code })
  if (!handoff) return new Response('Preview handoff could not be issued', { status: 503 })
  const target = siteOrigin(site)
    ? `${siteOrigin(site)}/next/preview/handoff`
    : `${site.code === defaultSiteCode ? '' : `/${siteCodeToAliasMap[site.code]}`}/next/preview/handoff`
  return handoffForm(target, handoff)
}
