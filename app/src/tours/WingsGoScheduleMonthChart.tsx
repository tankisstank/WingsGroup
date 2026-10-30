'use client'

import React from 'react'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import { getWingsGoScheduleCopy } from './wingsGoScheduleCopy'
import { cn } from '@/utilities/ui'

export type WingsGoScheduleMonthChartProps = {
  months: string[]
  counts: Record<string, number>
  selected?: string
  onSelect?: (month?: string) => void
  locale?: SupportedLocaleCode
  className?: string
}

const EN_MONTH_ABBRS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const getMonthIndex = (m: string): number => {
  const [y, mon] = m.split('-').map(Number)
  return y * 12 + mon
}

export const WingsGoScheduleMonthChart: React.FC<WingsGoScheduleMonthChartProps> = ({
  months,
  counts,
  selected,
  onSelect,
  locale = 'vi',
  className,
}) => {
  const isEn = locale === 'en'
  const copy = getWingsGoScheduleCopy(locale)

  // Find max count for height scaling (minimum 1 to prevent div by 0)
  const maxCount = Math.max(1, ...months.map((m) => counts[m] || 0))

  // Find peak month: highest count; ties broken by earliest month
  let peakMonth: string | null = null
  let peakMax = 0
  for (const m of months) {
    const c = counts[m] || 0
    if (c > peakMax) {
      peakMax = c
      peakMonth = m
    }
  }

  return (
    <div
      className={cn(
        'wingsgo-schedule-months-card relative overflow-hidden rounded-[24px] sm:rounded-[28px] border border-border/70 bg-card p-5 sm:p-7 shadow-sm',
        className,
      )}
      data-od-id="month-chart"
    >
      <div className="wingsgo-schedule-months-head mb-4 sm:mb-5">
        <h2 className="wingsgo-display text-xl sm:text-2xl font-normal leading-tight text-foreground">
          {isEn ? (
            <>
              Departures by <em>month</em>
            </>
          ) : (
            <>
              Số đợt theo <em>tháng</em>
            </>
          )}
        </h2>
      </div>

      <div
        aria-label={copy.chartAriaLabel}
        className="wingsgo-schedule-bars grid grid-flow-col auto-cols-[minmax(0,1fr)] items-end gap-1.5 sm:gap-2.5 h-[170px] sm:h-[220px]"
        role="group"
      >
        {months.map((m, i) => {
          const count = counts[m] || 0
          const [yStr, monStr] = m.split('-')
          const monNum = parseInt(monStr, 10)
          const curIndex = getMonthIndex(m)
          const prevM = i > 0 ? months[i - 1] : null
          const prevIndex = prevM ? getMonthIndex(prevM) : null
          const isGap = prevIndex !== null && curIndex - prevIndex > 1
          const prevYear = prevM ? prevM.split('-')[0] : ''
          const isYearChange = i === 0 || yStr !== prevYear
          const showYear = isYearChange || isGap

          const monLabel = isEn ? EN_MONTH_ABBRS[monNum - 1] : `T${monNum}`
          const monFullName = isEn ? EN_MONTH_ABBRS[monNum - 1] : `${monNum}`
          const isPressed = selected === m
          const isDisabled = count === 0
          const heightPercent = count === 0 ? 0 : Math.max(6, Math.round((count / maxCount) * 100))

          const ariaLabel = copy.chartMonthAria(monFullName, yStr, count)

          return (
            <button
              aria-label={ariaLabel}
              aria-pressed={isPressed}
              className={cn(
                'wingsgo-schedule-bar group flex h-full min-w-0 flex-col justify-end items-stretch gap-1 sm:gap-2 border-0 bg-transparent p-0 outline-none transition-transform focus-visible:ring-2 focus-visible:ring-[var(--site-brand)] focus-visible:ring-offset-2 rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-40',
                isGap && 'wingsgo-schedule-bar--gap border-l-2 border-dashed border-border/80 pl-1 sm:pl-2',
              )}
              data-month={m}
              data-od-id={`month-bar-${m}`}
              disabled={isDisabled}
              key={m}
              onClick={() => {
                if (isDisabled) return
                onSelect?.(isPressed ? undefined : m)
              }}
              type="button"
            >
              <span
                className={cn(
                  'wingsgo-schedule-bar-num text-[11px] sm:text-xs font-bold text-center leading-none text-foreground transition-colors',
                  isPressed && 'text-[var(--site-brand)] font-extrabold',
                )}
              >
                {count}
              </span>
              <span
                className={cn(
                  'wingsgo-schedule-bar-fill block w-full rounded-t-md sm:rounded-t-lg rounded-b-[3px] bg-muted/80 transition-all duration-200 group-hover:bg-[var(--site-brand)]/50',
                  isPressed && 'bg-[var(--site-brand)]',
                  isDisabled && 'bg-muted/40',
                )}
                style={{ height: `${heightPercent}%` }}
              />
              <span
                className={cn(
                  'wingsgo-schedule-bar-label text-[10.5px] sm:text-xs text-muted-foreground text-center leading-tight whitespace-nowrap transition-colors',
                  isPressed && 'text-foreground font-semibold',
                )}
              >
                {monLabel}
                <small className="block text-[9.5px] sm:text-[10px] text-muted-foreground/75 leading-none mt-0.5">
                  {showYear ? yStr : '\u00A0'}
                </small>
              </span>
            </button>
          )
        })}
      </div>

      <div className="wingsgo-schedule-months-foot mt-4 pt-3.5 border-t border-border/70 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs sm:text-sm text-muted-foreground">
        <span className="wingsgo-schedule-peak">
          {peakMonth && peakMax > 0 ? (
            <>
              {copy.chartPeakMonth(
                isEn
                  ? EN_MONTH_ABBRS[parseInt(peakMonth.split('-')[1], 10) - 1]
                  : `${parseInt(peakMonth.split('-')[1], 10)}`,
                peakMonth.split('-')[0],
                peakMax,
              )}
            </>
          ) : (
            copy.chartNoData
          )}
        </span>
      </div>
    </div>
  )
}
