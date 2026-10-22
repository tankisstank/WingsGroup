import { cookies, draftMode } from 'next/headers'
import { NextRequest } from 'next/server'
import { redirect } from 'next/navigation'

import { PREVIEW_HANDOFF_COOKIE, verifyPreviewHandoff } from '@/utilities/previewHandoff'
import { partitionDraftModeCookie } from '@/utilities/previewCookies'
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
  const cookieStore = await cookies()
  partitionDraftModeCookie(cookieStore, handoff.mode === 'draft')
  cookieStore.set({
    httpOnly: true,
    maxAge: Math.max(0, handoff.exp - Math.floor(Date.now() / 1000)),
    name: PREVIEW_HANDOFF_COOKIE,
    partitioned: process.env.NODE_ENV === 'production',
    path: '/',
    // Partitioned storage keeps preview working with third-party cookies blocked.
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
