'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export type WingsGoUpcomingBoardProps = {
  boardLabel: string
  children: React.ReactNode
  heading: React.ReactNode
  nextLabel: string
  prevLabel: string
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const WingsGoUpcomingBoard: React.FC<WingsGoUpcomingBoardProps> = ({
  boardLabel,
  children,
  heading,
  nextLabel,
  prevLabel,
}) => {
  const boardRef = useRef<HTMLDivElement>(null)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const syncButtons = useCallback(() => {
    const board = boardRef.current
    if (!board) return
    setCanScrollPrev(board.scrollLeft > 4)
    setCanScrollNext(board.scrollLeft + board.clientWidth < board.scrollWidth - 4)
  }, [])

  useEffect(() => {
    syncButtons()
    window.addEventListener('resize', syncButtons)
    return () => window.removeEventListener('resize', syncButtons)
  }, [syncButtons])

  const scrollByTicket = (direction: -1 | 1) => {
    const board = boardRef.current
    if (!board) return
    const ticket = board.firstElementChild as HTMLElement | null
    const step = ticket ? ticket.getBoundingClientRect().width + 16 : board.clientWidth * 0.8
    board.scrollBy({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      left: direction * step,
    })
  }

  const buttonClass =
    'grid h-12 w-12 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-brand)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-card'

  return (
    <>
      <div className="mb-6 flex items-end justify-between gap-6 md:mb-8">
        {heading}
        <div className="hidden shrink-0 items-center gap-2.5 sm:flex">
          <button
            aria-label={prevLabel}
            className={buttonClass}
            disabled={!canScrollPrev}
            onClick={() => scrollByTicket(-1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="h-5 w-5" />
          </button>
          <button
            aria-label={nextLabel}
            className={buttonClass}
            disabled={!canScrollNext}
            onClick={() => scrollByTicket(1)}
            type="button"
          >
            <ChevronRight aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div
        aria-label={boardLabel}
        className="wingsgo-board -mr-4 pr-4 sm:mr-0 sm:pr-0.5"
        data-wingsgo-board="true"
        onScroll={syncButtons}
        ref={boardRef}
        role="region"
        tabIndex={0}
      >
        {children}
      </div>
    </>
  )
}
