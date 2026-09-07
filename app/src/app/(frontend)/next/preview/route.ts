import type { PayloadRequest } from 'payload'
import { getPayload } from 'payload'

import { cookies, draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

import configPromise from '@payload-config'
import {
  defaultSiteCode,
  getLocaleFromPathname,
  getSiteAliasFromPathname,
  allSiteAliasToCodeMap,
} from '@/utilities/sitePaths'
import {
  NEXT_DRAFT_MODE_COOKIE,
  WINGSGROUP_LOCAL_PREVIEW_GRANT_COOKIE,
  mintWingsGroupLocalPreviewGrant,
} from '@/wingsgroup/localPreview'

export type PreviewSearchParams = {
  path: string
  previewSecret: string
}

const clearLocalPreviewGrant = async (): Promise<void> => {
  const cookieStore = await cookies()
  cookieStore.set({
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    name: WINGSGROUP_LOCAL_PREVIEW_GRANT_COOKIE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    value: '',
  })
}

const disablePreviewAndClearGrant = async (): Promise<void> => {
  const draft = await draftMode()
  draft.disable()
  await clearLocalPreviewGrant()
}

export async function GET(req: NextRequest): Promise<Response> {
  const payload = await getPayload({ config: configPromise })

  const { searchParams } = new URL(req.url)

  const path = searchParams.get('path')
  const previewSecret = searchParams.get('previewSecret')

  if (previewSecret !== process.env.PREVIEW_SECRET) {
    await clearLocalPreviewGrant()
    return new Response('You are not allowed to preview this page', { status: 403 })
  }

  if (!path) {
    await disablePreviewAndClearGrant()
    return new Response('Insufficient search params', { status: 404 })
  }

  if (!path.startsWith('/')) {
    await disablePreviewAndClearGrant()
    return new Response('This endpoint can only be used for relative previews', { status: 500 })
  }

  let user

  try {
    user = (
      await payload.auth({
        req: req as unknown as PayloadRequest,
        headers: req.headers,
      })
    ).user
  } catch (error) {
    payload.logger.error({ err: error }, 'Error verifying token for live preview')
    await disablePreviewAndClearGrant()
    return new Response('You are not allowed to preview this page', { status: 403 })
  }

  const draft = await draftMode()

  if (!user) {
    await disablePreviewAndClearGrant()
    return new Response('You are not allowed to preview this page', { status: 403 })
  }

  // You can add additional checks here to see if the user is allowed to preview this page

  draft.enable()

  if (!draft.isEnabled) {
    await disablePreviewAndClearGrant()
    return new Response('Preview mode could not be enabled', { status: 503 })
  }

  if (process.env.NODE_ENV !== 'production') {
    const userID = (user as { id?: number | string }).id
    const pathName = new URL(path, 'http://local-preview.invalid').pathname
    const siteAlias = getSiteAliasFromPathname(pathName)
    const siteCode = siteAlias ? allSiteAliasToCodeMap[siteAlias] : defaultSiteCode
    const locale = getLocaleFromPathname(pathName) || 'vi'
    const cookieStore = await cookies()
    const nextDraftCookie = cookieStore.get(NEXT_DRAFT_MODE_COOKIE)?.value
    const grant =
      userID !== undefined && nextDraftCookie
        ? await mintWingsGroupLocalPreviewGrant({
            draftCookie: nextDraftCookie,
            locale,
            siteCode,
            userID,
          })
        : null

    if (!grant) {
      await disablePreviewAndClearGrant()
      return new Response('Preview grant could not be issued', { status: 503 })
    }

    cookieStore.set({
      httpOnly: true,
      maxAge: 5 * 60,
      name: WINGSGROUP_LOCAL_PREVIEW_GRANT_COOKIE,
      path: '/',
      sameSite: 'lax',
      secure: false,
      value: grant,
    })
  } else {
    await clearLocalPreviewGrant()
  }

  redirect(path)
}
