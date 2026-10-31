import React from 'react'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import type { WingsGoScheduleStats, WingsGoScheduleSnapshot } from './wingsGoSchedule'
import { getWingsGoScheduleCopy } from './wingsGoScheduleCopy'
import { formatDepartureCityName, getShortDepartureDate } from './wingsGoDisplay'
import { cn } from '@/utilities/ui'

export type WingsGoScheduleHeroProps = {
  stats?: WingsGoScheduleStats
  snapshot?: Pick<WingsGoScheduleSnapshot, 'stats'>
  locale?: SupportedLocaleCode
  className?: string
  children?: React.ReactNode
}

const formatYearRange = (yearRange: { from: number; to: number } | null): string => {
  if (!yearRange) return ''
  if (yearRange.from === yearRange.to) return `${yearRange.from}`
  return `${yearRange.from} – ${yearRange.to}`
}

const formatVerifiedDate = (dayStr: string | null): string | null => {
  if (!dayStr) return null
  const parts = dayStr.split('-')
  if (parts.length !== 3) return null
  const [year, month, day] = parts
  return `${day}/${month}/${year}`
}

export const WingsGoScheduleHero: React.FC<WingsGoScheduleHeroProps> = ({
  stats: directStats,
  snapshot,
  locale = 'vi',
  className,
  children,
}) => {
  const stats = directStats ?? snapshot?.stats ?? {
    openCount: 0,
    tourCount: 0,
    pricedCount: 0,
    nearestDay: null,
    yearRange: null,
    sharedDepartureCity: null,
    verifiedDay: null,
  }

  const isEn = locale === 'en'
  const copy = getWingsGoScheduleCopy(locale)
  const yearRangeStr = formatYearRange(stats.yearRange)
  const cityName = formatDepartureCityName(stats.sharedDepartureCity, isEn ? 'en' : 'vi')
  const nearestDateFormatted = stats.nearestDay ? getShortDepartureDate(stats.nearestDay) || '—' : '—'
  const verifiedFormatted = formatVerifiedDate(stats.verifiedDay)

  const heroContent = (
    <div className="wingsgo-schedule-hero__content">
      <p className="wingsgo-eyebrow mb-3 sm:mb-4">{copy.heroKicker}</p>
      <h1 className="wingsgo-display text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.05] tracking-tight text-foreground">
        {isEn ? (
          <>
            Departure Schedule{yearRangeStr ? <> <em>{yearRangeStr}</em></> : null}.
          </>
        ) : (
          <>
            Lịch khởi hành{yearRangeStr ? <> <em>{yearRangeStr}</em></> : null}.
          </>
        )}
      </h1>
      <p className="mt-3.5 sm:mt-5 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
        {copy.heroDescription(cityName)}
      </p>

      <div className="wingsgo-schedule-stats mt-6 pt-5 border-t border-border/70 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
        <div className="wingsgo-schedule-stat">
          <b className="block wingsgo-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground leading-tight">
            {stats.openCount}
          </b>
          <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            {copy.heroStatDepartures}
          </span>
        </div>
        <div className="wingsgo-schedule-stat">
          <b className="block wingsgo-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground leading-tight">
            {stats.tourCount}
          </b>
          <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            {copy.heroStatTours}
          </span>
        </div>
        <div className="wingsgo-schedule-stat">
          <b className="block wingsgo-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground leading-tight">
            {stats.pricedCount}
          </b>
          <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            {copy.heroStatPriced}
          </span>
        </div>
        <div className="wingsgo-schedule-stat">
          <b className="block wingsgo-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground leading-tight">
            {nearestDateFormatted}
          </b>
          <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            {copy.heroStatNearest}
          </span>
        </div>
      </div>

      {/* With the month chart beside it, the update date sits in the chart footer. */}
      {verifiedFormatted && !children ? (
        <p className="mt-4 text-xs text-muted-foreground">
          {copy.heroVerifiedLabel(verifiedFormatted)}
        </p>
      ) : null}
    </div>
  )

  if (children) {
    return (
      <section
        className={cn(
          'wingsgo-schedule-hero py-6 sm:py-8 lg:py-10',
          className,
        )}
        data-od-id="schedule-hero"
      >
        <div className="wingsgo-schedule-hero-grid grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-8 lg:gap-14 items-center">
          {heroContent}
          <div className="w-full min-w-0">{children}</div>
        </div>
      </section>
    )
  }

  return (
    <section
      className={cn('wingsgo-schedule-hero py-6 sm:py-8 lg:py-10', className)}
      data-od-id="schedule-hero"
    >
      {heroContent}
    </section>
  )
}
