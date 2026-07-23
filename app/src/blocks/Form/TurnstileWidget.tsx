'use client'

import React, { useEffect, useId, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      remove: (widgetId: string) => void
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string
    }
  }
}

type Props = {
  onToken: (token: string) => void
  siteKey: string
}

export const TurnstileWidget: React.FC<Props> = ({ onToken, siteKey }) => {
  const reactId = useId()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let widgetId: string | undefined
    let cancelled = false
    const render = () => {
      if (cancelled || !containerRef.current || !window.turnstile || widgetId) return
      widgetId = window.turnstile.render(containerRef.current, {
        action: 'lead-submit',
        callback: onToken,
        'error-callback': () => onToken(''),
        sitekey: siteKey,
        theme: 'auto',
      })
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-wingstravel-turnstile]')
    if (existing) {
      existing.addEventListener('load', render)
      render()
    } else {
      const script = document.createElement('script')
      script.async = true
      script.defer = true
      script.dataset.wingstravelTurnstile = 'true'
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.addEventListener('load', render)
      document.head.appendChild(script)
    }

    return () => {
      cancelled = true
      if (widgetId) window.turnstile?.remove(widgetId)
      existing?.removeEventListener('load', render)
    }
  }, [onToken, siteKey])

  return <div aria-label="Security verification" id={`turnstile-${reactId}`} ref={containerRef} />
}

