'use client'

import React, { useState, useEffect, useMemo } from 'react'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import type {
  WingsGoScheduleRow,
  WingsGoScheduleTour,
  WingsGoScheduleTourGroup,
  ScheduleMoney,
} from './wingsGoScheduleModel'
import {
  groupScheduleRowsByTour,
  getScheduleMarketLabel,
  compareScheduleIds,
} from './wingsGoScheduleModel'
import { getWingsGoScheduleCopy } from './wingsGoScheduleCopy'
import { PromotionPrice, PromotionBadge } from './PromotionPrice'
import { SiteLink } from '@/components/SiteLink'
import { cn } from '@/utilities/ui'

export type WingsGoScheduleTourListProps = {
  rows: WingsGoScheduleRow[]
  tours: Record<string, WingsGoScheduleTour>
  locale?: SupportedLocaleCode
  sort?: 'date' | 'price'
  className?: string
}

const formatShortChipPrice = (price: ScheduleMoney | null, availabilityLabel: string): string => {
  if (!price || typeof price.value !== 'number') {
    return availabilityLabel
  }
  const val = price.value
  if (price.currency === 'VND') {
    if (val >= 1_000_000) {
      const millions = val / 1_000_000
      return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}tr`
    }
    if (val >= 1_000) {
      return `${(val / 1_000).toFixed(0)}k`
    }
    return `${val}đ`
  }
  if (price.currency === 'USD') {
    return `$${val}`
  }
  return availabilityLabel
}

export const WingsGoScheduleTourList: React.FC<WingsGoScheduleTourListProps> = ({
  rows,
  tours,
  locale = 'vi',
  sort = 'date',
  className,
}) => {
  const isEn = locale === 'en'
  const copy = getWingsGoScheduleCopy(locale)

  // D8 Hydration state
  const [enhanced, setEnhanced] = useState(false)
  useEffect(() => {
    setEnhanced(true)
  }, [])

  // Expanded tours tracking: { [tourId]: boolean }
  const [expandedTours, setExpandedTours] = useState<Record<string, boolean>>({})

  const toggleTour = (tourId: string) => {
    setExpandedTours((prev) => ({
      ...prev,
      [tourId]: !prev[tourId],
    }))
  }

  // 1. Group rows by tour on filtered rows
  const groups = useMemo(() => groupScheduleRowsByTour(rows, tours), [rows, tours])

  // 2. Sort tour groups according to sort parameter
  const sortedGroups = useMemo(() => {
    const list = [...groups]

    if (sort === 'price') {
      const getGroupPriceRank = (g: WingsGoScheduleTourGroup): number => {
        if (!g.priceFrom || g.priceFrom.value === null || g.priceFrom.value === undefined) return 3
        if (g.priceFrom.currency === 'VND') return 0
        if (g.priceFrom.currency === 'USD') return 1
        return 2
      }

      return list.sort((a, b) => {
        const rankA = getGroupPriceRank(a)
        const rankB = getGroupPriceRank(b)
        if (rankA !== rankB) return rankA - rankB

        if (rankA < 3 && a.priceFrom && b.priceFrom) {
          const diff = a.priceFrom.value - b.priceFrom.value
          if (diff !== 0) return diff
        }

        const dayA = a.rows[0]?.departureDay || ''
        const dayB = b.rows[0]?.departureDay || ''
        const dayCmp = dayA.localeCompare(dayB)
        if (dayCmp !== 0) return dayCmp

        return a.tour.title.localeCompare(b.tour.title)
      })
    }

    // Default 'date' sort: earliest departure date
    return list.sort((a, b) => {
      const dayA = a.rows[0]?.departureDay || ''
      const dayB = b.rows[0]?.departureDay || ''
      const dayCmp = dayA.localeCompare(dayB)
      if (dayCmp !== 0) return dayCmp

      const idA = a.rows[0]?.id || ''
      const idB = b.rows[0]?.id || ''
      const idCmp = compareScheduleIds(idA, idB)
      if (idCmp !== 0) return idCmp

      return a.tour.title.localeCompare(b.tour.title)
    })
  }, [groups, sort])

  return (
    <div
      className={cn('wingsgo-schedule-tour-list space-y-6 sm:space-y-8', className)}
      data-od-id="schedule-tour-list"
      id="wingsgo-schedule-list"
    >
      {sortedGroups.map((group) => {
        const { tour, rows: tourRows, priceFrom, chosenRow } = group
        const hasHot = Boolean(tour.hasHot || tour.badges?.some((b) => b.kind === 'hot'))
        const hotBadge = tour.badges?.find((b) => b.kind === 'hot')
        const cornerStickers =
          tour.badges?.filter((b) => b.kind === 'specialized' || b.kind === 'vip') || []
        const marketLabel = getScheduleMarketLabel(tour.market, isEn ? 'en' : 'vi', copy)

        const isExpanded = Boolean(expandedTours[tour.id])
        const hasMore = tourRows.length > 6
        const remainingCount = tourRows.length - 6

        // Unique airlines in this tour group
        const airlineNames = Array.from(
          new Set(tourRows.map((r) => r.airline?.label).filter(Boolean)),
        ).join(', ')

        return (
          <article
            className={cn(
              'wingsgo-schedule-tour-card group rounded-[24px] border border-border/70 bg-card p-4 sm:p-6 shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-[var(--site-brand)]/40 hover:shadow-md',
              hasHot ? 'hot-rainbow-card border-transparent' : 'overflow-hidden',
            )}
            data-has-hot={hasHot ? 'true' : undefined}
            data-od-id={`tour-${tour.slug}`}
            data-tour-id={tour.id}
            key={tour.id}
          >
            {hasHot ? (
              <span className="sr-only">{hotBadge?.label || copy.hotTourBadge}</span>
            ) : null}

            <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-start">
              {/* Media Thumbnail */}
              <div className="relative aspect-[16/10] w-full md:w-64 lg:w-72 shrink-0 rounded-2xl overflow-hidden bg-muted">
                {/* Editorial stickers overlay */}
                {cornerStickers.length > 0 || chosenRow?.promoLabel ? (
                  <div className="absolute inset-x-2.5 top-2.5 z-10 flex items-start justify-between gap-1.5 pointer-events-none">
                    {cornerStickers.length > 0 ? (
                      <div
                        className={cn(
                          'flex flex-col items-start gap-1 min-w-0',
                          chosenRow?.promoLabel ? 'max-w-[calc(100%-80px)]' : 'max-w-full',
                        )}
                        data-editorial-stickers="true"
                      >
                        {cornerStickers.map((sticker, idx) => (
                          <span
                            className={cn(
                              'inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide shadow-sm backdrop-blur-[2px] truncate',
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

                    {chosenRow?.promoLabel ? (
                      <span className="flex justify-end shrink-0 max-w-[50%]">
                        <PromotionBadge label={chosenRow.promoLabel} />
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {tour.media?.url ? (
                  <img
                    alt={tour.media.alt || tour.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                    src={tour.media.url}
                  />
                ) : (
                  <div
                    aria-label={copy.imageComingSoon(tour.title)}
                    className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,color-mix(in_oklch,var(--site-brand)_18%,transparent),color-mix(in_oklch,var(--site-accent)_16%,transparent))] px-4 text-center text-xs font-semibold text-foreground/70"
                  >
                    <span>{copy.imageComingSoonFallback}</span>
                  </div>
                )}
              </div>

              {/* Tour Content Details */}
              <div className="flex-1 min-w-0 w-full space-y-3.5">
                {/* Meta and Title */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {marketLabel ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
                          {marketLabel}
                        </span>
                      ) : null}
                      {tour.durationLabel ? (
                        <span className="text-xs text-muted-foreground font-medium">
                          {tour.durationLabel}
                        </span>
                      ) : null}
                    </div>

                    <SiteLink
                      className="block text-base sm:text-lg font-bold text-foreground hover:text-[var(--site-brand)] transition-colors no-underline leading-snug"
                      href={tour.href}
                    >
                      <h3 className="m-0 text-inherit font-inherit">{tour.title}</h3>
                    </SiteLink>
                  </div>

                  {/* Price Block: Lowest Price from Chosen Row */}
                  <div className="text-left sm:text-right shrink-0">
                    <span className="block text-[11px] sm:text-xs text-muted-foreground uppercase tracking-wider">
                      {copy.priceFrom}
                    </span>
                    {priceFrom ? (
                      <div className="space-y-0.5">
                        <PromotionPrice
                          currency={priceFrom.currency}
                          originalPrice={priceFrom.original ?? undefined}
                          price={priceFrom.value}
                        />
                        {chosenRow?.urgencyLabel ? (
                          <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            {chosenRow.urgencyLabel}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-sm sm:text-base font-bold text-foreground">
                        {copy.contactForQuote}
                      </span>
                    )}
                  </div>
                </div>

                {/* Date Chips (.dates) with D8 Hydration contract */}
                <div
                  aria-label={isEn ? 'Departure dates' : 'Các ngày khởi hành'}
                  className="wingsgo-schedule-tour-dates flex flex-wrap gap-2 pt-1"
                  id={`tour-dates-${tour.id}`}
                >
                  {tourRows.map((row, idx) => {
                    const [year, monthStr, dayStr] = row.departureDay.split('-')
                    const monthNum = monthStr || ''
                    const dayNum = dayStr || ''
                    const isHidden = enhanced && !isExpanded && idx >= 6
                    const subText = formatShortChipPrice(row.price, row.availabilityLabel)

                    return (
                      <SiteLink
                        aria-label={copy.dateChipAria(
                          `${dayNum}/${monthNum}/${year}`,
                          row.availabilityLabel,
                        )}
                        className={cn(
                          'wingsgo-schedule-date-chip inline-flex flex-col items-center justify-center min-w-[70px] sm:min-w-[76px] px-2.5 py-1.5 rounded-xl border text-center no-underline transition-colors cursor-pointer',
                          row.availability === 'sold-out'
                            ? 'bg-muted/60 text-muted-foreground border-border hover:bg-muted'
                            : 'bg-card border-border hover:border-[var(--site-brand)] hover:bg-[var(--site-brand)]/5',
                        )}
                        data-departure-id={row.id}
                        hidden={isHidden}
                        href={row.ctaHref}
                        key={row.id}
                      >
                        <span className="font-bold text-foreground text-xs sm:text-sm leading-tight">
                          {dayNum}/{monthNum}
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight mt-0.5 truncate max-w-full">
                          {subText}
                        </span>
                      </SiteLink>
                    )
                  })}

                  {/* D8: "+N more dates" button only rendered after client enhancement */}
                  {enhanced && hasMore ? (
                    <button
                      aria-controls={`tour-dates-${tour.id}`}
                      aria-expanded={isExpanded}
                      className="wingsgo-schedule-more-dates-btn inline-flex flex-col items-center justify-center min-w-[70px] sm:min-w-[76px] px-2.5 py-1.5 rounded-xl border border-dashed border-[var(--site-brand)]/50 text-xs font-semibold text-[var(--site-brand)] hover:bg-[var(--site-brand)]/5 transition-colors cursor-pointer"
                      data-more={`tour:${tour.slug}`}
                      onClick={() => toggleTour(tour.id)}
                      type="button"
                    >
                      <span className="font-bold leading-tight">
                        {isExpanded ? copy.showLess : `+${remainingCount}`}
                      </span>
                      <span className="text-[10px] sm:text-[11px] opacity-80 leading-tight mt-0.5">
                        {isExpanded ? '' : isEn ? 'dates' : 'ngày khác'}
                      </span>
                    </button>
                  ) : null}
                </div>

                {/* Tour Card Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs sm:text-sm text-muted-foreground">
                  <span className="truncate">
                    {copy.departureCountLabel(tourRows.length)}
                    {airlineNames ? ` • ${airlineNames}` : ''}
                  </span>

                  <SiteLink
                    className="inline-flex items-center gap-1 font-semibold text-[var(--site-brand)] hover:underline no-underline shrink-0 ml-3"
                    href={tour.href}
                  >
                    <span>{copy.ctaViewTour}</span>
                    <span aria-hidden="true">→</span>
                  </SiteLink>
                </div>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
