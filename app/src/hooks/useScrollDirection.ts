'use client'

import { useEffect, useRef, useState } from 'react'

export type ScrollDirection = 'down' | 'idle' | 'up'

type UseScrollDirectionOptions = {
  initialDirection?: ScrollDirection
  threshold?: number
}

export const useScrollDirection = ({
  initialDirection = 'idle',
  threshold = 8,
}: UseScrollDirectionOptions = {}) => {
  const [direction, setDirection] = useState<ScrollDirection>(initialDirection)
  const lastScrollYRef = useRef(0)
  const tickingRef = useRef(false)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    lastScrollYRef.current = window.scrollY || 0

    const updateDirection = () => {
      const currentScrollY = window.scrollY || 0
      const delta = currentScrollY - lastScrollYRef.current

      if (Math.abs(delta) >= threshold) {
        setDirection(delta > 0 ? 'down' : 'up')
        lastScrollYRef.current = Math.max(currentScrollY, 0)
      }

      tickingRef.current = false
    }

    const onScroll = () => {
      if (tickingRef.current) return

      tickingRef.current = true
      frameRef.current = window.requestAnimationFrame(updateDirection)
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
    }
  }, [threshold])

  return direction
}

export default useScrollDirection
