'use client'

import { useLivePreviewContext } from '@payloadcms/ui'
import { useRef } from 'react'

export const useTourPreviewRefresh = (documentID: number | string | null | undefined, locale: string) => {
  const preview = useLivePreviewContext()
  const current = useRef({ documentID, locale, preview })
  current.current = { documentID, locale, preview }
  const revision = useRef(0)

  return () => {
    if (current.current.documentID !== documentID || current.current.locale !== locale) return
    const { isLivePreviewing, setURL, url } = current.current.preview
    if (!isLivePreviewing || !url || documentID == null) return

    let initializer: URL
    try {
      initializer = new URL(url, window.location.origin)
    } catch {
      return
    }
    if (
      initializer.origin !== window.location.origin ||
      initializer.pathname !== '/next/preview' ||
      initializer.username ||
      initializer.password ||
      initializer.searchParams.get('collection') !== 'tour-products' ||
      initializer.searchParams.get('id') !== String(documentID) ||
      initializer.searchParams.get('locale') !== locale
    ) return

    // Re-enter the authenticated handoff; Payload's save messages target the CMS origin.
    revision.current += 1
    initializer.searchParams.set('refresh', `${Date.now()}-${revision.current}`)
    setURL(initializer.toString())
  }
}
