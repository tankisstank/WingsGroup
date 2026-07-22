'use client'

import { useEffect } from 'react'

import { setNativeInputValue } from '@/components/WingsSideHiFi/planFormNative'

export type TourEnquiryContext = {
  source?: null | string
  tourId?: null | number | string
  tourSlug?: null | string
  tourTitle?: null | string
}

const contextMessage = ({ source, tourId, tourSlug, tourTitle }: TourEnquiryContext) =>
  [
    tourTitle ? `Tour: ${tourTitle}` : null,
    tourSlug ? `Tour slug: ${tourSlug}` : null,
    tourId !== null && tourId !== undefined && tourId !== '' ? `Tour ID: ${tourId}` : null,
    source ? `Source: ${source}` : null,
  ]
    .filter(Boolean)
    .join('\n')

export const TourEnquiryContextBridge = ({
  context,
  rootSelector,
}: {
  context: TourEnquiryContext
  rootSelector: string
}) => {
  useEffect(() => {
    const root = document.querySelector(rootSelector)
    if (!root) return
    const message = root.querySelector('[name="message"]') as HTMLTextAreaElement | null
    const prefix = contextMessage(context)
    if (!message || !prefix) return

    const existing = message.value.trim()
    if (existing.includes(prefix)) return
    setNativeInputValue(message, [prefix, existing].filter(Boolean).join('\n\n'))
  }, [context, rootSelector])

  return null
}

export const getTourEnquiryContextMessage = contextMessage
