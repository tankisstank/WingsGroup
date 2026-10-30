/* eslint-disable @next/next/no-img-element */
'use client'

import React from 'react'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import type {
  WingsGoScheduleMarketCard,
  WingsGoScheduleRow,
  WingsGoScheduleTour,
} from './wingsGoSchedule'
import { getWingsGoScheduleCopy } from './wingsGoScheduleCopy'
import { formatShortTourPrice } from './wingsGoDisplay'
import { PromotionBadge } from './PromotionPrice'
import { scrollToScheduleList } from './wingsGoScheduleScroll'
import { cn } from '@/utilities/ui'

export type WingsGoScheduleMarketCardsProps = {
  cards: WingsGoScheduleMarketCard[]
  rows: WingsGoScheduleRow[]
  tours: Record<string, WingsGoScheduleTour>
  selected?: string
  onSelect?: (market?: string) => void
  locale?: SupportedLocaleCode
  className?: string
}

const formatDMY = (dateStr?: null | string): null | string => {
  if (!dateStr) return null
  const parts = dateStr.split('-')
  if (parts.length !== 3) return null
  const [year, month, day] = parts
  return `${day}/${month}/${year}`
}

export const WingsGoScheduleMarketCards: React.FC<WingsGoScheduleMarketCardsProps> = ({
  cards,
  rows,
  tours,
  selected,
  onSelect,
  locale = 'vi',
  className,
}) => {
  const isEn = locale === 'en'
  const copy = getWingsGoScheduleCopy(locale)
  const displayCards = cards.slice(0, 3)

  if (displayCards.length === 0) {
    return null
  }

  return (
    <section
      className={cn('wingsgo-schedule-market-section py-6 sm:py-8', className)}
      data-od-id="market-spotlight"
      id="markets"
    >
      <div className="wingsgo-schedule-section-head mb-5 sm:mb-7">
        <p className="wingsgo-eyebrow mb-2 sm:mb-3">
          {copy.marketSectionKicker}
        </p>
        <h2 className="wingsgo-display text-2xl sm:text-3xl lg:text-4xl font-normal text-foreground">
          {isEn ? (
            <>
              Featured departures by <em>market</em>
            </>
          ) : (
            <>
              Đợt nổi bật theo <em>thị trường</em>
            </>
          )}
        </h2>
      </div>

      <div className="wingsgo-schedule-spotlight flex sm:grid sm:grid-cols-3 gap-4 sm:gap-5 overflow-x-auto sm:overflow-visible pb-3 sm:pb-0 scrollbar-none snap-x snap-mandatory">
        {displayCards.map((card) => {
          const tour = tours[card.tourId]
          const row = rows.find((r) => r.id === card.rowId)
          const isPressed = selected === card.market
          const hasHot = Boolean(tour?.hasHot)
          const hotBadge = tour?.badges?.find((b) => b.kind === 'hot')
          const cornerStickers =
            tour?.badges?.filter(
              (b) => b.kind === 'specialized' || b.kind === 'vip',
            ) || []
          const promoBadge = row?.promoLabel
          const hasBadges = cornerStickers.length > 0 || Boolean(promoBadge)
          const departureFormatted = formatDMY(row?.departureDay)
          const priceValue = row?.price?.value

          return (
            <article
              className={cn(
                'wingsgo-schedule-market-card group flex-none w-[82%] sm:w-auto snap-start flex flex-col text-left rounded-[24px] border border-border/70 bg-card shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-[var(--site-brand)]/40 hover:shadow-md cursor-pointer',
                hasHot ? 'hot-rainbow-card border-transparent' : 'overflow-hidden',
                isPressed && 'ring-2 ring-[var(--site-brand)] ring-offset-2',
              )}
              data-has-hot={hasHot ? 'true' : undefined}
              data-market={card.market}
              data-od-id={`spotlight-${card.market}`}
              key={card.market}
              onClick={() => {
                const nextMarket = isPressed ? undefined : card.market
                onSelect?.(nextMarket)
                scrollToScheduleList('wingsgo-schedule-list')
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  const nextMarket = isPressed ? undefined : card.market
                  onSelect?.(nextMarket)
                  scrollToScheduleList('wingsgo-schedule-list')
                }
              }}
              aria-pressed={isPressed}
            >
              {hasHot ? (
                <span className="sr-only">
                  {hotBadge?.label || copy.marketCardHotBadge}
                </span>
              ) : null}

              {/* Media banner */}
              <div className="relative aspect-[16/10] overflow-hidden rounded-t-[23px] bg-muted">
                {hasBadges ? (
                  <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2 pointer-events-none">
                    {cornerStickers.length > 0 ? (
                      <div
                        className={cn(
                          'flex flex-col items-start gap-1.5 min-w-0',
                          promoBadge ? 'max-w-[calc(100%-110px)]' : 'max-w-full',
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
                    ) : (
                      <div />
                    )}
                    {promoBadge ? (
                      <span className="flex justify-end shrink-0 max-w-[50%]">
                        <PromotionBadge label={promoBadge} />
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {tour?.media?.url ? (
                  <img
                    alt={tour.media.alt || tour.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                    src={tour.media.url}
                  />
                ) : (
                  <div
                    aria-label={copy.imageComingSoon(tour?.title || card.label)}
                    className="flex h-full items-center justify-center bg-[linear-gradient(135deg,color-mix(in_oklch,var(--site-brand)_18%,transparent),color-mix(in_oklch,var(--site-accent)_16%,transparent))] px-6 text-center text-sm font-semibold text-foreground/70"
                    role="img"
                  >
                    {copy.imageComingSoonFallback}
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />

                <div className="absolute left-4 bottom-3 z-10 text-white">
                  <strong className="block font-['WingsGo_Display',Georgia,serif] text-2xl sm:text-3xl font-semibold leading-tight text-white drop-shadow-sm">
                    {card.label}
                  </strong>
                  <span className="text-xs text-white/90">
                    {copy.marketCardDepartureCount(card.departureCount)}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  {departureFormatted ? (
                    <small className="block text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                      {copy.marketCardDeparting(departureFormatted)}
                    </small>
                  ) : null}
                  <b className="block text-sm sm:text-base font-semibold leading-snug text-foreground line-clamp-2">
                    {tour?.title || card.label}
                  </b>
                </div>

                <div className="pt-2 border-t border-border/60 flex items-end justify-between gap-2 text-xs text-muted-foreground">
                  <span>{row?.airline?.label || '\u00A0'}</span>
                  {typeof priceValue === 'number' && priceValue > 0 ? (
                    <span>
                      {isEn ? 'From ' : 'Giá từ '}
                      <strong className="text-sm sm:text-base font-bold text-foreground">
                        {formatShortTourPrice(priceValue, isEn ? 'en' : 'vi')}
                      </strong>
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">
                      {copy.marketCardNoPrice}
                    </span>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
