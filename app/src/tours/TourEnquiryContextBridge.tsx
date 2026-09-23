'use client'

import { useEffect } from 'react'

import type { LeadSubmissionContext } from '@/lead-capture/types'
import type { TourEnquiryContext } from './enquiryContext'

const toSubmissionContext = (context: TourEnquiryContext): LeadSubmissionContext => ({
  departureDate: context.departureDate || undefined,
  departureId:
    context.departureId !== null && context.departureId !== undefined && context.departureId !== ''
      ? String(context.departureId)
      : undefined,
  discovery: context.discovery
    ? {
      destination: context.discovery.destination,
      duration: context.discovery.duration,
      q: context.discovery.q,
      style: context.discovery.style,
      type: context.discovery.type,
      }
    : undefined,
  intent: context.intent,
  source: context.source || undefined,
  tourId:
    context.tourId !== null && context.tourId !== undefined && context.tourId !== ''
      ? String(context.tourId)
      : undefined,
  tourSlug: context.tourSlug || undefined,
})

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
    const form = root.matches('form')
      ? (root as HTMLFormElement)
      : root.querySelector<HTMLFormElement>('form')
    if (!form) return

    form.dataset.wsEnquiryContext = JSON.stringify(toSubmissionContext(context))
  }, [context, rootSelector])

  return null
}

export { getTourEnquiryContextMessage } from './enquiryContext'
