'use client'

import { useAllFormFields, useFormSubmitted } from '@payloadcms/ui'
import { useEffect, useRef } from 'react'

const itineraryPath = 'itineraryDays'

export default function TourItineraryValidationNavigator() {
  const [fields] = useAllFormFields()
  const submitted = useFormSubmitted()
  const handledErrors = useRef('')
  const errors = Object.entries(fields)
    .filter(([path, field]) =>
      (path === itineraryPath || path.startsWith(`${itineraryPath}.`)) &&
      (Boolean(field.errorMessage) || (submitted && field.valid === false)),
    )
    .map(([path]) => path)
  const errorSignature = errors.join('|')

  useEffect(() => {
    if (!errorSignature) {
      handledErrors.current = ''
      return
    }
    if (handledErrors.current === errorSignature) return

    const tab = Array.from(document.querySelectorAll<HTMLButtonElement>('.tabs-field__tab-button')).find(
      (button) => /^(Lịch trình|Itinerary)(?:\s|$)/u.test(button.textContent?.trim() || ''),
    )
    if (!tab) return
    handledErrors.current = errorSignature
    if (!tab.classList.contains('tabs-field__tab-button--active')) tab.click()

    window.requestAnimationFrame(() => {
      const errorPath = errors[0]
      const input = document.getElementById(
        `field-${errorPath.replace(/\./gu, '__')}`,
      ) as HTMLElement | null
      const target = input || document.querySelector<HTMLElement>('.tour-itinerary-days')
      if (!target) return
      if (!target.matches('input, textarea, select, button, [tabindex]')) target.tabIndex = -1
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target.focus({ preventScroll: true })
    })
  }, [errorSignature, errors, submitted])

  return null
}
