'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import React, { useEffect } from 'react'

import type { Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import {
  BadgeCheckIcon,
  CalendarDaysIcon,
  CameraIcon,
  CompassIcon,
  MapPinnedIcon,
  PlaneIcon,
  SparklesIcon,
  UsersIcon,
} from 'lucide-react'

const retailDepartures = [
  {
    airline: 'VJ',
    date: '12/06/2026',
    price: 'từ 13.990.000đ',
    title: 'Seoul - Nami - Everland',
  },
  {
    airline: 'VN',
    date: '19/06/2026',
    price: 'từ 18.990.000đ',
    title: 'Seoul - Jeju - Camellia Hill',
  },
  {
    airline: 'CA',
    date: '26/06/2026',
    price: 'từ 11.990.000đ',
    title: 'Bắc Kinh - Vạn Lý Trường Thành',
  },
]

const retailHighlights = [
  { icon: CalendarDaysIcon, label: 'Lịch rõ ngày' },
  { icon: PlaneIcon, label: 'Bay theo hãng' },
  { icon: BadgeCheckIcon, label: 'Giá minh bạch' },
]

const plannerHighlights = [
  { icon: MapPinnedIcon, label: 'Route design' },
  { icon: CameraIcon, label: 'Local moments' },
  { icon: UsersIcon, label: 'Private groups' },
]

const heroVariantCopy = {
  planner: {
    badge: 'Vietnam journeys, designed with care',
    postcards: ['Ha Noi old quarter', 'Ha Long bay', 'Hoi An lanterns'],
  },
  'retail-departures': {
    badge: 'Tour rõ lịch, rõ giá, dễ chốt',
    postcards: ['Jeju summer', 'Seoul - Nami', 'Tokyo mùa lá'],
  },
  standard: {
    badge: 'WingsTravel service ecosystem',
    postcards: ['Travel planning', 'Local support', 'Trusted service'],
  },
  utility: {
    badge: 'Dịch vụ rõ giá, đặt nhanh',
    postcards: ['Fast track', 'Airport add-on', 'Booking support'],
  },
} as const

export const HighImpactHero: React.FC<Page['hero']> = (props) => {
  const { links, media, richText } = props
  const variant = ((props as { variant?: keyof typeof heroVariantCopy }).variant || 'standard') as keyof typeof heroVariantCopy
  const copy = heroVariantCopy[variant] || heroVariantCopy.standard
  const { setHeaderTheme } = useHeaderTheme()
  const isRetailDepartures = variant === 'retail-departures'
  const isPlanner = variant === 'planner'

  useEffect(() => {
    setHeaderTheme('light')
  }, [setHeaderTheme])

  return (
    <section
      className="site-hero relative -mt-[10.4rem] overflow-hidden"
      data-hero-variant={variant}
      data-theme="light"
    >
      <div className="site-hero__media" aria-hidden="true">
        {media && typeof media === 'object' ? (
          <Media fill imgClassName="object-cover" priority resource={media} />
        ) : null}
        <div className="site-hero__postcards">
          {copy.postcards.map((label, index) => (
            <span key={label} style={{ '--postcard-index': index } as React.CSSProperties}>
              {label}
            </span>
          ))}
        </div>
      </div>
      <div className="site-hero__scrim" aria-hidden="true" />

      <div className="container site-hero__inner">
        <div className="site-hero__copy">
          <div className="site-hero__badge">
            <SparklesIcon aria-hidden="true" className="h-4 w-4" />
            <span>{copy.badge}</span>
          </div>
          {richText && <RichText className="site-hero__richtext" data={richText} enableGutter={false} />}
          {Array.isArray(links) && links.length > 0 && (
            <ul className="site-hero__actions">
              {links.map(({ link }, i) => {
                return (
                  <li key={i}>
                    <CMSLink {...link} />
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {isRetailDepartures ? (
          <aside aria-label="Lịch khởi hành nổi bật" className="site-hero__commerce-panel">
            <div className="site-hero__panel-head">
              <div className="site-panel-icon">
                <CalendarDaysIcon aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <p className="site-mini-label">Lịch gần nhất</p>
                <h2>Tour đang mở bán</h2>
              </div>
            </div>
            <div className="site-departure-stack">
              {retailDepartures.map((departure) => (
                <div className="site-departure-row" key={`${departure.title}-${departure.date}`}>
                  <div>
                    <h2>{departure.title}</h2>
                    <p>
                      {departure.date} · {departure.airline}
                    </p>
                  </div>
                  <strong>{departure.price}</strong>
                </div>
              ))}
            </div>
            <div className="site-trust-row" aria-label="Điểm mạnh WingsGo">
              {retailHighlights.map(({ icon: Icon, label }) => (
                <span key={label}>
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {label}
                </span>
              ))}
            </div>
            <CMSLink
              appearance="default"
              className="site-panel-cta"
              label="Xem toàn bộ lịch"
              type="custom"
              url="/lich-khoi-hanh"
            />
          </aside>
        ) : null}

        {isPlanner ? (
          <aside aria-label="Trip planning starter" className="site-hero__planner-panel">
            <div>
              <div className="site-panel-icon">
                <CompassIcon aria-hidden="true" className="h-5 w-5" />
              </div>
              <p className="site-mini-label">Start with</p>
              <strong>Destination</strong>
              <span>Ha Noi, Ha Long, Hoi An</span>
            </div>
            <div>
              <p className="site-mini-label">Travel style</p>
              <strong>Private, culture, family</strong>
              <span>Flexible route design</span>
            </div>
            <CMSLink
              appearance="default"
              className="site-panel-cta"
              label="Plan your trip"
              type="custom"
              url="/plan-your-trip"
            />
            <div className="site-trust-row site-trust-row--wide" aria-label="WingsSide planning cues">
              {plannerHighlights.map(({ icon: Icon, label }) => (
                <span key={label}>
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {label}
                </span>
              ))}
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  )
}
