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
  const copy = getWingsSideSpecialsCopy(locale)
  const pathname = usePathname()

  useEffect(() => {
    setVisible(!isWingsSideSpecialsDismissed(window.sessionStorage))
  }, [])

  if (!visible || !isWingsSideSpecialsHomePathname(pathname)) return null

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
        <SiteLink aria-label={copy.ctaLabel} className="wingsside-specials__cta" href={href}>
          <span aria-hidden="true">&gt;&gt;&gt;</span>
          <strong>GO</strong>
        </SiteLink>
      </div>
    </aside>
  )
}
