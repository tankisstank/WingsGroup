'use client'
import { getClientSideURL } from '@/utilities/getURL'
import { RefreshRouteOnSave as PayloadLivePreview } from '@payloadcms/live-preview-react'
import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'

export type PreviewReadyIdentity = {
  collection: 'pages' | 'posts'
  documentID: number | string
  locale: string
  mode: 'draft' | 'published'
  path: string
  siteCode: string
}

export const LivePreviewListener: React.FC<{ previewIdentity?: PreviewReadyIdentity }> = ({
  previewIdentity,
}) => {
  const router = useRouter()

  useEffect(() => {
    if (!previewIdentity || window.parent === window || !document.referrer) return

    let parentOrigin: string
    try {
      parentOrigin = new URL(document.referrer).origin
    } catch {
      return
    }

    const postReady = () => {
      window.parent.postMessage(
        {
          collection: previewIdentity.collection,
          documentID: String(previewIdentity.documentID),
          locale: previewIdentity.locale,
          mode: previewIdentity.mode,
          path: previewIdentity.path,
          siteCode: previewIdentity.siteCode,
          type: 'wingstravel:preview-ready',
        },
        parentOrigin,
      )
    }

    const onMessage = (event: MessageEvent<unknown>) => {
      if (
        event.source !== window.parent ||
        event.origin !== parentOrigin ||
        !event.data ||
        typeof event.data !== 'object' ||
        (event.data as { type?: unknown }).type !== 'wingstravel:preview-ping'
      ) {
        return
      }

      postReady()
    }

    window.addEventListener('message', onMessage)
    // The parent may attach its message listener just after this document
    // loads. Responding to a bounded ping closes that load-order race without
    // placing a handoff token in the browser message.
    postReady()

    return () => window.removeEventListener('message', onMessage)
  }, [previewIdentity])

  return <PayloadLivePreview refresh={router.refresh} serverURL={getClientSideURL()} />
}
