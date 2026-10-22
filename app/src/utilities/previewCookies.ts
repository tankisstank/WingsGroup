import type { cookies } from 'next/headers'

import { PREVIEW_HANDOFF_TTL_SECONDS } from './previewHandoff'

export const partitionDraftModeCookie = (
  cookieStore: Pick<Awaited<ReturnType<typeof cookies>>, 'get' | 'set'>,
  enabled: boolean,
) => {
  if (process.env.NODE_ENV !== 'production') return

  // Preserve Next's build-specific bypass value while isolating the CMS iframe.
  const cookie = cookieStore.get('__prerender_bypass')
  if (enabled && !cookie?.value) throw new Error('Preview cookie could not be issued')

  cookieStore.set({
    expires: enabled ? undefined : new Date(0),
    httpOnly: true,
    maxAge: enabled ? PREVIEW_HANDOFF_TTL_SECONDS : 0,
    name: '__prerender_bypass',
    partitioned: true,
    path: '/',
    sameSite: 'none',
    secure: true,
    value: enabled ? cookie!.value : '',
  })
}
