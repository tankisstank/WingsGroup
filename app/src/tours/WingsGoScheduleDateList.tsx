'use client'

import React, { useState, useEffect, useMemo } from 'react'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import type {
  WingsGoScheduleRow as WingsGoScheduleRowType,
  WingsGoScheduleTour,
} from './wingsGoScheduleModel'
import { getWingsGoScheduleCopy } from './wingsGoScheduleCopy'
import { WingsGoScheduleRow } from './WingsGoScheduleRow'

export type WingsGoScheduleDateListProps = {
  rows: WingsGoScheduleRowType[]
  tours: Record<string, WingsGoScheduleTour>
  locale?: SupportedLocaleCode
  sort?: 'date' | 'price'
  className?: string
}

export const WingsGoScheduleDateList: React.FC<WingsGoScheduleDateListProps> = ({
  rows,
  tours,
  locale = 'vi',
  sort = 'date',
  className,
}) => {
  const copy = getWingsGoScheduleCopy(locale)

  // D8 Hydration Contract:
  // SSR and initial client render must match and render all rows without `hidden`.
  // Only after mount (`enhanced = true`) do we apply `hidden` to rows index >= 8 and render toggle buttons.
  const [enhanced, setEnhanced] = useState(false)
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setEnhanced(true)
  }, [])

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [monthKey]: !prev[monthKey],
    }))
  }

  // Group by monthKey for date sort
  const monthGroups = useMemo(() => {
    if (sort === 'price') return []

    const map = new Map<string, WingsGoScheduleRowType[]>()
    for (const r of rows) {
      const key = r.monthKey || 'other'
      let list = map.get(key)
      if (!list) {
        list = []
        map.set(key, list)
      }
      list.push(r)
    }
    return Array.from(map.entries()).map(([monthKey, monthRows]) => ({
      monthKey,
      rows: monthRows,
    }))
  }, [rows, sort])

  // Flat price sort view
  if (sort === 'price') {
    return (
      <div className={className} data-od-id="schedule-date-list" id="wingsgo-schedule-list">
        <div className="wingsgo-schedule-flat-rows grid gap-2.5 sm:gap-3">
          {rows.map((row) => (
            <WingsGoScheduleRow
              key={row.id}
              locale={locale}
              row={row}
              tour={tours[row.tourId]}
            />
          ))}
        </div>
      </div>
    )
  }

  // Month-grouped date sort view
  return (
    <div className={className} data-od-id="schedule-date-list" id="wingsgo-schedule-list">
      <div className="space-y-8 sm:space-y-10">
        {monthGroups.map(({ monthKey, rows: monthRows }) => {
          const [year, monthStr] = monthKey.split('-')
          const monthNum = monthStr ? String(parseInt(monthStr, 10)) : ''
          const isExpanded = Boolean(expandedMonths[monthKey])
          const hasMore = monthRows.length > 8

          return (
            <section
              className="wingsgo-schedule-month-group"
              data-month={monthKey}
              data-od-id={`month-${monthKey}`}
              key={monthKey}
            >
              <div className="wingsgo-schedule-month-head flex items-baseline justify-between gap-4 pb-3 border-b border-border mb-3.5 sm:mb-4">
                <h3 className="wingsgo-display text-2xl sm:text-3xl font-medium leading-none text-foreground m-0">
                  {copy.monthGroupTitle(monthNum, year)}{' '}
                  <small className="text-base sm:text-lg text-muted-foreground font-normal ml-1">
                    {year}
                  </small>
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground m-0 whitespace-nowrap">
                  {copy.departureCount(monthRows.length)}
                </p>
              </div>

              <div
                className="wingsgo-schedule-month-rows grid gap-2.5 sm:gap-3"
                id={`month-rows-${monthKey}`}
              >
                {monthRows.map((row, idx) => {
                  const isHidden = enhanced && !isExpanded && idx >= 8
                  return (
                    <WingsGoScheduleRow
                      hidden={isHidden}
                      key={row.id}
                      locale={locale}
                      row={row}
                      tour={tours[row.tourId]}
                    />
                  )
                })}
              </div>

              {enhanced && hasMore ? (
                <button
                  aria-controls={`month-rows-${monthKey}`}
                  aria-expanded={isExpanded}
                  className="wingsgo-schedule-more-btn mt-3 w-full min-h-[44px] sm:min-h-[48px] border border-dashed border-[var(--site-brand)]/40 rounded-2xl bg-transparent font-semibold text-xs sm:text-sm text-[var(--site-brand)] hover:bg-[var(--site-brand)]/5 transition-colors cursor-pointer"
                  data-more={monthKey}
                  onClick={() => toggleMonth(monthKey)}
                  type="button"
                >
                  {isExpanded ? copy.showLess : copy.showMore(monthRows.length - 8)}
                </button>
              ) : null}
            </section>
          )
        })}
      </div>
    </div>
  )
}
