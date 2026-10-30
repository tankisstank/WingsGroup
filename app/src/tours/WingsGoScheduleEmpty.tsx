'use client'

import React, { useMemo } from 'react'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import type {
  ScheduleFilters,
  WingsGoScheduleRow,
  WingsGoScheduleTour,
} from './wingsGoScheduleModel'
import {
  filterScheduleRows,
  getScheduleMarketLabel,
} from './wingsGoScheduleModel'
import { getWingsGoScheduleCopy } from './wingsGoScheduleCopy'
import { SiteLink } from '@/components/SiteLink'
import { cn } from '@/utilities/ui'

export type WingsGoScheduleEmptyProps = {
  totalDeparturesCount: number
  activeFilters: ScheduleFilters
  rows?: WingsGoScheduleRow[]
  tours?: Record<string, WingsGoScheduleTour>
  airlines?: { key: string; label: string }[]
  locale?: SupportedLocaleCode
  onClearFilter?: (key: keyof ScheduleFilters) => void
  onClearAll?: () => void
  className?: string
}

export const WingsGoScheduleEmpty: React.FC<WingsGoScheduleEmptyProps> = ({
  totalDeparturesCount,
  activeFilters,
  rows = [],
  tours,
  airlines = [],
  locale = 'vi',
  onClearFilter,
  onClearAll,
  className,
}) => {
  const isEn = locale === 'en'
  const copy = getWingsGoScheduleCopy(locale)

  // Compute relaxation suggestions: how many rows would show if this single filter is removed?
  const suggestions = useMemo(() => {
    if (totalDeparturesCount === 0) return []
    const list: { key: keyof ScheduleFilters; label: string; count: number }[] = []

    if (activeFilters.q) {
      const count = filterScheduleRows(rows, { ...activeFilters, q: undefined }, tours).length
      if (count > 0) {
        list.push({
          key: 'q',
          label: `“${activeFilters.q}”`,
          count,
        })
      }
    }

    if (activeFilters.market) {
      const marketName = getScheduleMarketLabel(activeFilters.market, isEn ? 'en' : 'vi', copy)
      const count = filterScheduleRows(rows, { ...activeFilters, market: undefined }, tours).length
      if (count > 0) {
        list.push({
          key: 'market',
          label: marketName,
          count,
        })
      }
    }

    if (activeFilters.month) {
      const [year, monthStr] = activeFilters.month.split('-')
      const monNum = monthStr ? String(parseInt(monthStr, 10)) : ''
      const monthTitle = copy.monthGroupTitle(monNum, year)
      const count = filterScheduleRows(rows, { ...activeFilters, month: undefined }, tours).length
      if (count > 0) {
        list.push({
          key: 'month',
          label: monthTitle,
          count,
        })
      }
    }

    if (activeFilters.airline) {
      const foundAirline = airlines.find((a) => a.key === activeFilters.airline)
      const airlineName = foundAirline?.label || activeFilters.airline
      const count = filterScheduleRows(rows, { ...activeFilters, airline: undefined }, tours).length
      if (count > 0) {
        list.push({
          key: 'airline',
          label: airlineName,
          count,
        })
      }
    }

    if (activeFilters.status) {
      let statusName: string = activeFilters.status
      if (activeFilters.status === 'open') statusName = copy.filterStatusOpen
      else if (activeFilters.status === 'limited') statusName = copy.filterStatusLimited
      else if (activeFilters.status === 'sold-out') statusName = copy.filterStatusSoldOut
      else if (activeFilters.status === 'quote') statusName = copy.filterStatusQuote

      const count = filterScheduleRows(rows, { ...activeFilters, status: undefined }, tours).length
      if (count > 0) {
        list.push({
          key: 'status',
          label: statusName,
          count,
        })
      }
    }

    return list
  }, [totalDeparturesCount, activeFilters, rows, tours, airlines, isEn, copy])

  // Empty snapshot state: no future departures in DB at all
  if (totalDeparturesCount === 0) {
    return (
      <div
        className={cn(
          'wingsgo-schedule-empty p-8 sm:p-12 text-center border-2 border-dashed border-border rounded-3xl my-6 bg-card/50',
          className,
        )}
        data-od-id="schedule-empty-state"
        id="wingsgo-schedule-list"
      >
        <h3 className="wingsgo-display text-2xl sm:text-3xl font-medium text-foreground mb-2">
          {copy.emptyTitle}
        </h3>
        <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto mb-6">
          {copy.emptyDescription}
        </p>
        <SiteLink
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--site-brand)] px-6 text-sm font-semibold text-white no-underline hover:bg-[var(--site-brand)]/90 transition-colors shadow-sm"
          href="/lien-he"
        >
          {copy.emptyContactExpert}
        </SiteLink>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'wingsgo-schedule-empty p-8 sm:p-14 text-center border-2 border-dashed border-border rounded-3xl my-6 bg-card/40',
        className,
      )}
      data-od-id="schedule-empty-state"
      id="wingsgo-schedule-list"
    >
      <h3 className="wingsgo-display text-2xl sm:text-3xl font-medium text-foreground mb-2">
        {copy.emptyFilteredTitle}
      </h3>
      <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-6">
        {copy.emptyFilteredDesc}
      </p>

      {suggestions.length > 0 ? (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6 max-w-2xl mx-auto">
          {suggestions.map((item) => (
            <button
              className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-full border border-border bg-card text-xs sm:text-sm font-medium text-[var(--site-brand)] hover:bg-muted/80 transition-colors cursor-pointer"
              data-clear={item.key}
              key={item.key}
              onClick={() => onClearFilter?.(item.key)}
              type="button"
            >
              <span>{copy.emptyRemoveFilter(item.label, item.count)}</span>
              <span aria-hidden="true" className="text-muted-foreground ml-0.5">✕</span>
            </button>
          ))}
          {onClearAll ? (
            <button
              className="inline-flex items-center min-h-[38px] px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              data-reset="true"
              onClick={onClearAll}
              type="button"
            >
              {copy.clearAllFilters}
            </button>
          ) : null}
        </div>
      ) : null}

      <div>
        <SiteLink
          className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-border bg-card px-6 text-sm font-semibold text-foreground hover:border-[var(--site-brand)] hover:text-[var(--site-brand)] no-underline transition-colors"
          data-contact="true"
          href="/lien-he"
        >
          {copy.emptyContactExpert}
        </SiteLink>
      </div>
    </div>
  )
}
