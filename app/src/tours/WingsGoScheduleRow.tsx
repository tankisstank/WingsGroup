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

  return (
    <article
      aria-label={`${displayTitle} - ${row.departureDay}`}
      className={cn(
        'wg-row group',
        row.availability === 'sold-out' && 'wg-row--sold-out opacity-90',
        className,
      )}
      data-od-id={`departure-${row.id}`}
      hidden={hidden}
    >
      {/* 1. Ticket Stub */}
      <div className="wg-stub">
        <span className="wingsgo-display wg-day">
          {dayNumber || ''}
        </span>
        {showFullDate && monthNumber && yearNumber ? (
          <span className="wg-month">
            {monthNumber}/{yearNumber}
          </span>
        ) : null}
        <span className="wg-wday">
          {weekdayAbbr}
        </span>
      </div>

      {/* 2. Main Tour Info */}
      <div className="wg-main">
        <h4 className="wg-title">
          <SiteLink
            className="wg-link"
            href={tourHref}
            title={hasDistinctTitle ? fullTitle : undefined}
          >
            {displayTitle}
          </SiteLink>
        </h4>

        <div className="wg-meta">
          {/* Route departure city -> market */}
          <span className="wg-route">
            {row.departureCityCode ? (
              <>
                <span>{row.departureCityCode}</span>
                <span aria-hidden="true" className="wg-plane" />
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
            <span className="wg-hot-badge">
              <span aria-hidden="true" className="wg-hot-icon" />
              {copy.hotTourBadge}
            </span>
          ) : null}

          {/* Availability Status Badge */}
          <span className={cn('wg-badge', `wg-badge--${row.availability}`)}>
            {row.availabilityLabel}
          </span>

          {/* Urgency label */}
          {row.urgencyLabel ? (
            <span className="wg-urgency">
              {row.urgencyLabel}
            </span>
          ) : null}

          {/* Promo Badge */}
          {row.promoLabel ? <PromotionBadge label={row.promoLabel} /> : null}
        </div>
      </div>

      {/* 3. Price Column */}
      <div className="wg-price-col">
        <small className="wg-price-lbl">
          {row.price?.value ? copy.priceFrom : copy.statusQuote}
        </small>
        <div
          className={cn(
            'wg-price-val',
            row.availability === 'sold-out' && 'line-through text-muted-foreground/90 wg-price-val--sold-out',
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
      <div className="wg-actions">
        <SiteLink
          aria-label={`${copy.viewTourAction} ${displayTitle}`}
          className="wg-view"
          href={tourHref}
        >
          {copy.viewTourAction}
        </SiteLink>

        <SiteLink
          className={cn(
            'wg-cta',
            row.availability === 'sold-out'
              ? 'wg-cta--sold-out'
              : row.canHoldSeat
                ? 'wg-cta--primary'
                : 'wg-cta--secondary',
          )}
          href={row.ctaHref}
        >
          {row.ctaLabel}
        </SiteLink>
      </div>
    </article>
  )
}
