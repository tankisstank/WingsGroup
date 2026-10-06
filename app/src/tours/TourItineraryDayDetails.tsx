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
  isOpen,
  onToggle,
}: {
  children: React.ReactNode
  className?: string
  initiallyOpen?: boolean
  isOpen?: boolean
  onToggle?: (open: boolean) => void
}) => {
  const [internalOpen, setInternalOpen] = useState(initiallyOpen)
  const isControlled = typeof isOpen === 'boolean'
  const currentOpen = isControlled ? isOpen : internalOpen

  return (
    <details
      className={className}
      open={currentOpen}
      onToggle={(event) => {
        const nextState = (event.currentTarget as HTMLDetailsElement).open
        if (!isControlled) {
          setInternalOpen(nextState)
        }
        onToggle?.(nextState)
      }}
    >
      {children}
    </details>
  )
}
