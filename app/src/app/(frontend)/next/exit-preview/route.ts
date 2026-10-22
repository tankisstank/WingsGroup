import { cookies, draftMode } from 'next/headers'

import { WINGSGROUP_LOCAL_PREVIEW_GRANT_COOKIE } from '@/wingsgroup/localPreview'
import { PREVIEW_HANDOFF_COOKIE } from '@/utilities/previewHandoff'
import { partitionDraftModeCookie } from '@/utilities/previewCookies'

export async function GET(): Promise<Response> {
  const draft = await draftMode()
  draft.disable()
  const cookieStore = await cookies()
  partitionDraftModeCookie(cookieStore, false)
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
  cookieStore.set({
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    name: PREVIEW_HANDOFF_COOKIE,
    partitioned: process.env.NODE_ENV === 'production',
    path: '/',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    value: '',
  })
  cookieStore.set({
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    name: '__wingstravel_preview_handoff',
    path: '/',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    value: '',
  })
  return new Response('Draft mode is disabled')
}
