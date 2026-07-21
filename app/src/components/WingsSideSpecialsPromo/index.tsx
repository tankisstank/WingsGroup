'use client'

import { SiteLink } from '@/components/SiteLink'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import {
  dismissWingsSideSpecials,
  getWingsSideSpecialsCopy,
  isWingsSideSpecialsHomePathname,
  isWingsSideSpecialsDismissed,
} from '@/utilities/wingsSideSpecials'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

export const WingsSideSpecialsPromo = ({
  href = '/packages',
  locale,
}: {
  href?: string
  locale: SupportedLocaleCode
}) => {
  const [visible, setVisible] = useState(false)
  /** Hide while denser planner occupies the viewport so the widget does not cover CTAs. */
  const [plannerOccluding, setPlannerOccluding] = useState(false)
  const copy = getWingsSideSpecialsCopy(locale)
  const pathname = usePathname()

  useEffect(() => {
    setVisible(!isWingsSideSpecialsDismissed(window.sessionStorage))
  }, [])

  useEffect(() => {
    if (!visible || !isWingsSideSpecialsHomePathname(pathname)) {
      setPlannerOccluding(false)
      return
    }

    const planner = document.getElementById('home-planner')
    if (!planner || typeof IntersectionObserver === 'undefined') {
      setPlannerOccluding(false)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setPlannerOccluding(Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.28))
      },
      { threshold: [0, 0.28, 0.5, 0.75, 1] },
    )
    observer.observe(planner)
    return () => observer.disconnect()
  }, [pathname, visible])

  if (!visible || !isWingsSideSpecialsHomePathname(pathname) || plannerOccluding) return null

  return (
    <aside
      aria-label={copy.ariaLabel}
      className="wingsside-specials"
      data-occlude-planner="false"
      data-testid="wingsside-specials"
    >
      <button
        aria-label={copy.closeLabel}
        className="wingsside-specials__close"
        onClick={() => {
          dismissWingsSideSpecials(window.sessionStorage)
          setVisible(false)
        }}
        type="button"
      >
        <span aria-hidden="true">×</span>
      </button>
      <span className="wingsside-specials__badge">{copy.badge}</span>
      <div className="wingsside-specials__main">
        <div className="wingsside-specials__copy">
          <h2>{copy.title}</h2>
          <ul>
            {copy.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <SiteLink
          aria-label={copy.ctaLabel}
          className="wingsside-specials__cta"
          href={href}
        >
          <span aria-hidden="true">&gt;&gt;&gt;</span>
          <strong>GO</strong>
        </SiteLink>
      </div>
    </aside>
  )
}
