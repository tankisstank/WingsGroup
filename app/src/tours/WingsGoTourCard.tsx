/* eslint-disable @next/next/no-img-element */
import React from 'react'

import { SiteLink } from '@/components/SiteLink'
import { getDurationLabel, formatTourDate } from './utils'
import { isDisplayablePromoLabel, PromotionBadge, PromotionPrice } from './PromotionPrice'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import { cn } from '@/utilities/ui'

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
  const displayBadge = isDisplayablePromoLabel(badge)
    ? badge
    : isDisplayablePromoLabel(card.nextDeparture?.promoLabel)
      ? card.nextDeparture?.promoLabel
      : undefined

  const editorialBadges = card.editorialBadges || []
  const hasHot = Boolean(card.hasHotEditorialBadge)
  const hotBadge = editorialBadges.find((b) => b.kind === 'hot')
  const cornerStickers = editorialBadges.filter(
    (b) => b.kind === 'specialized' || b.kind === 'vip',
  )

  return (
    <article
      className={cn(
        'group rounded-[24px] border border-border/70 bg-card shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-[var(--site-brand)]/35 hover:shadow-[0_18px_48px_color-mix(in_oklch,var(--site-brand)_14%,transparent)]',
        hasHot ? 'hot-rainbow-card border-transparent' : 'overflow-hidden',
      )}
      data-has-hot={hasHot ? 'true' : undefined}
    >
      <SiteLink className="block no-underline" href={card.href}>
        {hasHot && hotBadge?.label ? (
          <span className="sr-only">{hotBadge.label}</span>
        ) : null}
        <div className="relative aspect-[16/10] overflow-hidden rounded-t-[23px] bg-muted">
          {cornerStickers.length > 0 || displayBadge ? (
            <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2 pointer-events-none">
              {cornerStickers.length > 0 ? (
                <div
                  className={cn(
                    'flex flex-col items-start gap-1.5 min-w-0',
                    displayBadge ? 'max-w-[calc(100%-110px)]' : 'max-w-full',
                  )}
                  data-editorial-stickers="true"
                >
                  {cornerStickers.map((sticker, idx) => (
                    <span
                      className={cn(
                        'inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide shadow-sm backdrop-blur-[2px] truncate',
                        sticker.kind === 'vip'
                          ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 text-slate-950 uppercase tracking-wider font-extrabold shadow-amber-500/20'
                          : 'bg-slate-900/90 text-white dark:bg-slate-100/95 dark:text-slate-900',
                      )}
                      key={`${sticker.kind}-${idx}`}
                    >
                      {sticker.label}
                    </span>
                  ))}
                </div>
              ) : <div />}
              {displayBadge ? (
                <span className="flex justify-end shrink-0 max-w-[50%]">
                  <PromotionBadge label={displayBadge} />
                </span>
              ) : null}
            </div>
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
            <span>{getDurationLabel(card.duration.days, card.duration.nights, locale)}</span>
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
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {isEn ? 'From' : 'Giá từ'}
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {card.price.kind === 'verified' ? (
                  <PromotionPrice
                    contactLabel={isEn ? 'Contact us' : 'Liên hệ'}
                    currency={card.price.currency}
                    originalPrice={card.price.originalPrice}
                    price={card.price.value}
                  />
                ) : (
                  card.price.label
                )}
              </p>
            </div>
            <span className="text-sm font-semibold text-[var(--site-brand)]">
              {isEn ? 'View tour' : 'Xem tour'} →
            </span>
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
