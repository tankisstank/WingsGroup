'use client'

import React, { useState } from 'react'

/**
 * Controlled <details> with an initial open state.
 * React does not map `defaultOpen` onto native <details>, so Day 1
 * default-open must be held in client state (still multi-open capable).
 */
export const TourItineraryDayDetails = ({
  children,
  className,
  initiallyOpen = false,
}: {
  children: React.ReactNode
  className?: string
  initiallyOpen?: boolean
}) => {
  const [open, setOpen] = useState(initiallyOpen)

  return (
    <details
      className={className}
      open={open}
      onToggle={(event) => {
        setOpen((event.currentTarget as HTMLDetailsElement).open)
      }}
    >
      {children}
    </details>
  )
}
