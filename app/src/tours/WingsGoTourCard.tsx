/* eslint-disable @next/next/no-img-element */
import React from 'react'

import { SiteLink } from '@/components/SiteLink'
import { getDurationLabel, formatTourDate, formatTourPrice } from './utils'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'

import type { WingsGoCatalogCard } from './wingsGoCatalog'

const marketLabels: Record<string, { en: string; vi: string }> = {
  cambodia: { en: 'Cambodia', vi: 'Campuchia' },
  china: { en: 'China', vi: 'Trung Quốc' },
  indochina: { en: 'Indochina', vi: 'Đông Dương' },
  japan: { en: 'Japan', vi: 'Nhật Bản' },
  korea: { en: 'South Korea', vi: 'Hàn Quốc' },
  laos: { en: 'Laos', vi: 'Lào' },
  myanmar: { en: 'Myanmar', vi: 'Myanmar' },
  other: { en: 'Outbound', vi: 'Outbound' },
  thailand: { en: 'Thailand', vi: 'Thái Lan' },
  vietnam: { en: 'Vietnam', vi: 'Việt Nam' },
}

export const WingsGoTourCard = ({
  badge,
  card,
  locale = 'vi',
}: {
  badge?: string
  card: WingsGoCatalogCard
  locale?: SupportedLocaleCode
}) => {
  const isEn = locale === 'en'

  return (
  <article className="group overflow-hidden rounded-[24px] border border-border/70 bg-card shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-[var(--site-brand)]/35 hover:shadow-[0_18px_48px_color-mix(in_oklch,var(--site-brand)_14%,transparent)]">
    <SiteLink className="block no-underline" href={card.href}>
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {badge ? (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white shadow">
            {badge}
          </span>
        ) : null}
        {card.image ? (
          <img
            alt={card.image.alt}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            src={card.image.url}
          />
        ) : (
          <div
            aria-label={`${isEn ? 'Image coming soon for' : 'Ảnh đang cập nhật cho'} ${card.title}`}
            className="flex h-full items-center justify-center bg-[linear-gradient(135deg,color-mix(in_oklch,var(--site-brand)_18%,transparent),color-mix(in_oklch,var(--site-accent)_16%,transparent))] px-6 text-center text-sm font-semibold text-foreground/70"
            role="img"
          >
            {isEn ? 'Tour image coming soon' : 'Ảnh tour đang cập nhật'}
          </div>
        )}
      </div>
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <span>{marketLabels[card.market]?.[isEn ? 'en' : 'vi'] || card.market}</span>
          <span aria-hidden="true">•</span>
          <span>
            {getDurationLabel(card.duration.days, card.duration.nights, locale)}
          </span>
        </div>
        <div>
          <h3 className="text-xl font-semibold leading-tight text-foreground transition-colors group-hover:text-[var(--site-brand)]">
            {card.title}
          </h3>
          {card.summary ? (
            <p className="mt-2 line-clamp-3 text-sm leading-7 text-muted-foreground">
              {card.summary}
            </p>
          ) : null}
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {isEn ? 'From' : 'Giá từ'}
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {card.price.kind === 'verified'
                ? formatTourPrice(card.price.value, card.price.currency)
                : card.price.label}
            </p>
          </div>
          <span className="text-sm font-semibold text-[var(--site-brand)]">{isEn ? 'View tour' : 'Xem tour'} →</span>
        </div>
        <div className="rounded-[16px] border border-border/60 bg-muted/25 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {isEn ? 'Next departure' : 'Khởi hành gần nhất'}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {formatTourDate(card.nextDeparture.date, locale)}
            {card.nextDeparture.departureCity ? ` • ${card.nextDeparture.departureCity}` : ''}
            {card.nextDeparture.airline ? ` • ${card.nextDeparture.airline}` : ''}
          </p>
        </div>
      </div>
    </SiteLink>
  </article>
  )
}
