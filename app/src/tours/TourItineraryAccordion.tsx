'use client'

import React, { useEffect, useRef, useState } from 'react'

export interface TourItineraryAccordionProps {
  children: React.ReactNode
  dayCount: number
  isEn?: boolean
}

export const TourItineraryAccordion: React.FC<TourItineraryAccordionProps> = ({
  children,
  dayCount,
  isEn = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [allOpen, setAllOpen] = useState(false)

  // Sync allOpen state whenever user interacts with any day
  const checkAllOpen = () => {
    if (!containerRef.current) return
    const details = containerRef.current.querySelectorAll<HTMLDetailsElement>('details.tour-itinerary-day')
    if (details.length === 0) return
    const openCount = Array.from(details).filter((d) => d.open).length
    setAllOpen(openCount === details.length)
  }

  useEffect(() => {
    checkAllOpen()
    const container = containerRef.current
    if (!container) return

    // Capture native toggle events which do not bubble in standard DOM
    const handleCaptureToggle = () => {
      checkAllOpen()
    }

    container.addEventListener('toggle', handleCaptureToggle, true)
    return () => {
      container.removeEventListener('toggle', handleCaptureToggle, true)
    }
  }, [])

  const handleToggleAll = () => {
    if (!containerRef.current) return
    const details = containerRef.current.querySelectorAll<HTMLDetailsElement>('details.tour-itinerary-day')
    const nextState = !allOpen
    details.forEach((d) => {
      d.open = nextState
    })
    setAllOpen(nextState)
  }

  return (
    <div ref={containerRef}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {isEn ? `${dayCount} days journey` : `Hành trình ${dayCount} ngày`}
        </p>
        <button
          aria-expanded={allOpen}
          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)] cursor-pointer"
          data-od-id="tour-itinerary-toggle-all"
          onClick={handleToggleAll}
          type="button"
        >
          {allOpen
            ? isEn
              ? 'Collapse all days'
              : 'Thu gọn tất cả'
            : isEn
              ? 'Expand all days'
              : 'Mở rộng tất cả'}
        </button>
      </div>
      <div onToggle={checkAllOpen}>
        {children}
      </div>
    </div>
  )
}
