'use client'

import { useEffect } from 'react'

import { setNativeInputValue } from '@/components/WingsSideHiFi/planFormNative'

import { getTourEnquiryContextMessage, type TourEnquiryContext } from './enquiryContext'

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
    const prefix = getTourEnquiryContextMessage(context)
    if (!message || !prefix) return

    const existing = message.value.trim()
    if (existing.includes(prefix)) return
    setNativeInputValue(message, [prefix, existing].filter(Boolean).join('\n\n'))
  }, [context, rootSelector])

  return null
}

export { getTourEnquiryContextMessage } from './enquiryContext'
