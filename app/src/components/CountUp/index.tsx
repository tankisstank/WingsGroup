'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'

type CountUpProps = {
  className?: string
  durationMs?: number
  locale?: string
  suffix?: string
  value: number | string
}

const numericPattern = /^[-+]?\d+(?:[.,]\d+)?$/

const getDecimalPlaces = (value: number | string) => {
  const text = String(value).trim()
  const decimal = text.match(/[.,](\d+)$/)
  return decimal ? decimal[1].length : 0
}

const parseCountValue = (value: number | string) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  const normalized = value.trim().replace(',', '.')
  if (!numericPattern.test(normalized)) return null

  const numeric = Number(normalized)
  return Number.isFinite(numeric) ? numeric : null
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const formatCount = (value: number, locale: string | undefined, decimalPlaces: number) => {
  try {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: decimalPlaces,
      minimumFractionDigits: decimalPlaces,
    }).format(value)
  } catch {
    return value.toFixed(decimalPlaces)
  }
}

export const CountUp: React.FC<CountUpProps> = ({
  className,
  durationMs = 1200,
  locale,
  suffix = '',
  value,
}) => {
  const rootRef = useRef<HTMLSpanElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const [isInView, setIsInView] = useState(false)
  const numericValue = useMemo(() => parseCountValue(value), [value])
  const decimalPlaces = useMemo(() => getDecimalPlaces(value), [value])
  const [displayValue, setDisplayValue] = useState(numericValue ?? 0)
  const displayValueRef = useRef(displayValue)

  useEffect(() => {
    displayValueRef.current = displayValue
  }, [displayValue])

  useEffect(() => {
    if (!isInView && numericValue !== null) setDisplayValue(numericValue)
  }, [isInView, numericValue])

  useEffect(() => {
    if (numericValue === null) return

    const node = rootRef.current
    if (!node || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      setDisplayValue(numericValue)
      setIsInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [numericValue])

  useEffect(() => {
    if (!isInView || numericValue === null) return

    if (durationMs <= 0 || prefersReducedMotion()) {
      setDisplayValue(numericValue)
      return
    }

    const startedAt = performance.now()
    const startValue = displayValueRef.current

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / durationMs, 1)
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(startValue + (numericValue - startValue) * easedProgress)

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(tick)
      }
    }

    frameRef.current = window.requestAnimationFrame(tick)
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
    }
  }, [durationMs, isInView, numericValue])

  if (numericValue === null) {
    return (
      <span className={className} data-count-up="fallback" ref={rootRef}>
        {String(value)}
        {suffix}
      </span>
    )
  }

  return (
    <span className={className} data-count-up={isInView ? 'active' : 'idle'} ref={rootRef}>
      {formatCount(displayValue, locale, decimalPlaces)}
      {suffix}
    </span>
  )
}

export default CountUp
