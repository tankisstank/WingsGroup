'use client'

import React, { useEffect, useRef, useState } from 'react'

type RevealOnScrollProps<T extends React.ElementType = 'div'> = {
  as?: T
  children: React.ReactNode
  className?: string
  disabled?: boolean
  once?: boolean
  rootMargin?: string
  threshold?: number
} & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const RevealOnScroll = <T extends React.ElementType = 'div'>({
  as,
  children,
  className,
  disabled = false,
  once = true,
  rootMargin = '0px 0px -8% 0px',
  threshold = 0.15,
  ...props
}: RevealOnScrollProps<T>) => {
  const Component = (as || 'div') as React.ElementType
  const rootRef = useRef<HTMLElement | null>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const node = rootRef.current

    if (
      !node ||
      disabled ||
      prefersReducedMotion() ||
      typeof IntersectionObserver === 'undefined'
    ) {
      setIsInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = Boolean(entry?.isIntersecting)
        setIsInView(visible)

        if (visible && once) {
          observer.disconnect()
        }
      },
      { rootMargin, threshold },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [disabled, once, rootMargin, threshold])

  const classes = ['motion-reveal', isInView ? 'is-in-view' : null, className]
    .filter(Boolean)
    .join(' ')

  return React.createElement(
    Component,
    {
      ...props,
      className: classes,
      'data-in-view': isInView ? 'true' : 'false',
      ref: rootRef,
    },
    children,
  )
}

export default RevealOnScroll
