import { cookies, draftMode } from 'next/headers'
import { NextRequest } from 'next/server'
import { redirect } from 'next/navigation'

import { PREVIEW_HANDOFF_COOKIE, verifyPreviewHandoff } from '@/utilities/previewHandoff'
import { getCurrentSite } from '@/utilities/siteContext'
import { defaultSiteCode, siteCodeToAliasMap } from '@/utilities/sitePaths'

export async function POST(req: NextRequest): Promise<Response> {
  const form = await req.formData()
  const token = form.get('handoff')
  const handoff = await verifyPreviewHandoff(typeof token === 'string' ? token : null)
  if (!handoff) return new Response('You are not allowed to preview this page', { status: 403 })
  const site = await getCurrentSite()
  if (site.code !== handoff.siteCode) return new Response('You are not allowed to preview this page', { status: 403 })
  const draft = await draftMode()
  draft.enable()
  if (!draft.isEnabled) return new Response('Preview mode could not be enabled', { status: 503 })
  ;(await cookies()).set({ httpOnly: true, maxAge: 5 * 60, name: PREVIEW_HANDOFF_COOKIE, path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production', value: token as string })
  // Aliases remain a local-only development contract. Production resolves the
  // signed handoff on the child domain and therefore keeps canonical paths.
  const localPrefix =
    process.env.NODE_ENV !== 'production' && site.code !== defaultSiteCode
      ? `/${siteCodeToAliasMap[site.code] || ''}`
      : ''
  redirect(`${localPrefix}${handoff.path}`.replace(/\/+/gu, '/'))
}
