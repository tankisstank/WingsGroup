'use client'

import React from 'react'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import type {
  WingsGoScheduleRow as WingsGoScheduleRowType,
  WingsGoScheduleTour,
} from './wingsGoScheduleModel'
import { getScheduleWeekdayAbbr, getScheduleMarketLabel } from './wingsGoScheduleModel'
import { getWingsGoScheduleCopy } from './wingsGoScheduleCopy'
import { PromotionPrice, PromotionBadge } from './PromotionPrice'
import { SiteLink } from '@/components/SiteLink'
import { cn } from '@/utilities/ui'

export type WingsGoScheduleRowProps = {
  row: WingsGoScheduleRowType
  tour?: WingsGoScheduleTour
  locale?: SupportedLocaleCode
  showFullDate?: boolean
  hidden?: boolean
  className?: string
}

const formatReturnDay = (dateStr?: null | string): null | string => {
  if (!dateStr) return null
  const parts = dateStr.split('-')
  if (parts.length !== 3) return null
  const [, month, day] = parts
  return `${day}/${month}`
}

export const WingsGoScheduleRow: React.FC<WingsGoScheduleRowProps> = ({
  row,
  tour,
  locale = 'vi',
  showFullDate = false,
  hidden = false,
  className,
}) => {
  const isEn = locale === 'en'
  const copy = getWingsGoScheduleCopy(locale)

  const [yearNumber, monthNumber, dayNumber] = (row.departureDay || '').split('-')
  const weekdayAbbr = getScheduleWeekdayAbbr(row.departureDay, isEn ? 'en' : 'vi')
  const returnFormatted = formatReturnDay(row.returnDay)
  const marketLabel = getScheduleMarketLabel(tour?.market, isEn ? 'en' : 'vi', copy)
  const isHot = Boolean(tour?.hasHot || tour?.badges?.some((b) => b.kind === 'hot'))

  const tourHref = tour?.href || row.ctaHref
  const displayTitle = tour?.routeTitle || tour?.title || copy.tourFallbackTitle
  const fullTitle = tour?.title || displayTitle
  const hasDistinctTitle = Boolean(tour?.title && tour.routeTitle && tour.title !== tour.routeTitle)

  const getStatusBadgeClass = () => {
    switch (row.availability) {
      case 'open':
        return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
      case 'limited':
        return 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30'
      case 'sold-out':
        return 'bg-muted text-muted-foreground border-border'
      case 'quote':
      default:
        return 'bg-muted/70 text-foreground/80 border-border'
    }
  }

  return (
    <article
      aria-label={`${displayTitle} - ${row.departureDay}`}
      className={cn(
        'wingsgo-schedule-row group relative grid grid-cols-[72px_minmax(0,1fr)] md:grid-cols-[96px_minmax(0,1fr)_180px_220px] items-stretch bg-card border border-border rounded-[20px] transition-[box-shadow,border-color] duration-200 hover:border-[var(--site-brand)]/40 hover:shadow-sm',
        row.availability === 'sold-out' && 'wingsgo-schedule-row--sold-out opacity-90',
        className,
      )}
      data-od-id={`departure-${row.id}`}
      hidden={hidden}
    >
      {/* 1. Ticket Stub */}
      <div className="wingsgo-schedule-stub relative flex flex-col items-center justify-center p-2.5 sm:p-3 border-r-[1.5px] border-dashed border-border select-none text-center">
        <span className="wingsgo-display text-2xl sm:text-3xl font-semibold leading-none text-[var(--site-brand)]">
          {dayNumber || ''}
        </span>
        {showFullDate && monthNumber && yearNumber ? (
          <span className="text-[11px] sm:text-xs font-semibold text-foreground mt-1">
            {monthNumber}/{yearNumber}
          </span>
        ) : null}
        <span className="text-[11px] sm:text-xs text-muted-foreground font-medium mt-0.5">
          {weekdayAbbr}
        </span>
      </div>

      {/* 2. Main Tour Info */}
      <div className="p-3.5 sm:p-4 md:p-5 flex flex-col justify-center gap-2 min-w-0">
        <h4 className="text-sm sm:text-base font-semibold leading-snug text-foreground m-0">
          <SiteLink
            className="hover:text-[var(--site-brand)] transition-colors no-underline text-foreground"
            href={tourHref}
            title={hasDistinctTitle ? fullTitle : undefined}
          >
            {displayTitle}
          </SiteLink>
        </h4>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          {/* Route departure city -> market */}
          <span className="inline-flex items-center gap-1 font-semibold text-foreground tracking-wide">
            {row.departureCityCode ? (
              <>
                <span>{row.departureCityCode}</span>
                <svg
                  aria-hidden="true"
                  className="w-3.5 h-3.5 text-[var(--site-brand)] shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M10.5 13.5 3 11l1.5-1.5 7.5 1L16 6c1-1 3-1.5 3.5-1s0 2.5-1 3.5l-4.5 4 1 7.5L13.5 21l-2.5-7.5" />
                </svg>
              </>
            ) : null}
            <span className="uppercase">{marketLabel || 'TOUR'}</span>
          </span>

          {/* Airline */}
          {row.airline?.label ? (
            <span className="whitespace-nowrap">{row.airline.label}</span>
          ) : null}

          {/* Return date */}
          {returnFormatted ? (
            <span className="whitespace-nowrap text-muted-foreground">
              {copy.returnsOn(returnFormatted)}
            </span>
          ) : null}

          {/* Q3: Tour Hot Static Text Badge (NO rainbow border card!) */}
          {isHot ? (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
              data-od-id="hot-tour-badge"
            >
              <svg
                aria-hidden="true"
                className="w-3 h-3 fill-current text-amber-600 dark:text-amber-400"
                viewBox="0 0 24 24"
              >
                <path d="M12 2c.5 3.5-1 6-2 7.5 2-.5 4-2 4-5 3.5 3.5 5 7.5 5 11 0 4.4-3.6 8-8 8s-8-3.6-8-8c0-4 3-8 9-13.5z" />
              </svg>
              {copy.hotTourBadge}
            </span>
          ) : null}

          {/* Availability Status Badge */}
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border',
              getStatusBadgeClass(),
            )}
            data-availability={row.availability}
          >
            {row.availabilityLabel}
          </span>

          {/* Urgency label */}
          {row.urgencyLabel ? (
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              {row.urgencyLabel}
            </span>
          ) : null}

          {/* Promo Badge */}
          {row.promoLabel ? <PromotionBadge label={row.promoLabel} /> : null}
        </div>
      </div>

      {/* 3. Price Column */}
      <div className="col-start-2 md:col-start-3 p-3.5 sm:p-4 md:p-5 flex flex-col justify-center md:border-l md:border-border">
        <small className="text-[11px] text-muted-foreground">
          {row.price?.value ? copy.priceFrom : copy.statusQuote}
        </small>
        <div
          className={cn(
            'text-base sm:text-lg font-bold tracking-tight',
            row.availability === 'sold-out' &&
              'line-through text-muted-foreground/90 decoration-muted-foreground/60',
          )}
        >
          <PromotionPrice
            contactLabel={copy.statusQuote}
            currency={row.price?.currency}
            originalPrice={row.price?.original}
            price={row.price?.value}
          />
        </div>
      </div>

      {/* 4. Action Column */}
      <div className="col-span-2 md:col-span-1 p-3.5 sm:p-4 md:p-5 flex items-center justify-between md:justify-end gap-3 md:border-l md:border-border border-t md:border-t-0 border-border/70">
        <SiteLink
          aria-label={`${copy.viewTourAction} ${displayTitle}`}
          className="inline-flex min-h-[44px] items-center px-1 text-xs sm:text-sm font-semibold text-[var(--site-brand)] hover:underline no-underline"
          href={tourHref}
        >
          {copy.viewTourAction}
        </SiteLink>

        <SiteLink
          className={cn(
            'inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-xs sm:text-sm font-semibold transition-colors no-underline whitespace-nowrap',
            row.availability === 'sold-out'
              ? 'border border-border bg-card text-foreground/85 hover:bg-muted font-medium'
              : row.canHoldSeat
                ? 'bg-[var(--site-brand)] text-white hover:bg-[var(--site-brand)]/90 shadow-sm'
                : 'border border-border bg-card text-foreground hover:border-[var(--site-brand)]',
          )}
          data-od-id={`cta-${row.id}`}
          href={row.ctaHref}
        >
          {row.ctaLabel}
        </SiteLink>
      </div>
    </article>
  )
}
