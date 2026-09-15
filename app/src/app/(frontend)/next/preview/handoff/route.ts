import { cookies, draftMode } from 'next/headers'
import { NextRequest } from 'next/server'
import { redirect } from 'next/navigation'

import { PREVIEW_HANDOFF_COOKIE, verifyPreviewHandoff } from '@/utilities/previewHandoff'
import { getCurrentSite } from '@/utilities/siteContext'
import { defaultSiteCode, siteCodeToAliasMap } from '@/utilities/sitePaths'
import { prefixCanonicalPathWithLocale } from '@/utilities/siteURLs'

export async function POST(req: NextRequest): Promise<Response> {
  const form = await req.formData()
  const token = form.get('handoff')
  const handoff = await verifyPreviewHandoff(typeof token === 'string' ? token : null)
  if (!handoff) return new Response('You are not allowed to preview this page', { status: 403 })
  const site = await getCurrentSite()
  if (site.code !== handoff.siteCode) return new Response('You are not allowed to preview this page', { status: 403 })
  const draft = await draftMode()
  if (handoff.mode === 'draft') {
    draft.enable()
    if (!draft.isEnabled) return new Response('Preview mode could not be enabled', { status: 503 })
  } else {
    draft.disable()
  }
  ;(await cookies()).set({
    httpOnly: true,
    maxAge: 5 * 60,
    name: PREVIEW_HANDOFF_COOKIE,
    path: '/',
    // The CMS and tenant are different sites in production. Lax cookies are
    // not sent by the cross-site iframe, so the short-lived grant must opt in
    // to third-party iframe delivery. Local aliases stay first-party.
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    value: token as string,
  })
  // Aliases remain a local-only development contract. Production resolves the
  // signed handoff on the child domain and therefore keeps canonical paths.
  const localPrefix =
    process.env.NODE_ENV !== 'production' && site.code !== defaultSiteCode
      ? `/${siteCodeToAliasMap[site.code] || ''}`
      : ''
  const localizedPath = prefixCanonicalPathWithLocale(
    handoff.path,
    handoff.locale,
    handoff.defaultLocale,
  )
  redirect(`${localPrefix}${localizedPath}`.replace(/\/+/gu, '/'))
}
