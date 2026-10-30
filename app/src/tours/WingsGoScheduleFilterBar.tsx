'use client'

import React, { useState, useEffect } from 'react'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import type {
  ScheduleFilters,
  ScheduleFacetCounts,
  ScheduleAvailability,
} from './wingsGoScheduleModel'
import { getScheduleMarketLabel } from './wingsGoScheduleModel'
import { getWingsGoScheduleCopy } from './wingsGoScheduleCopy'
import { cn } from '@/utilities/ui'

export type WingsGoScheduleFilterBarProps = {
  filters: ScheduleFilters
  markets: { value: string; label: string }[]
  airlines: { key: string; label: string }[]
  facetCounts: ScheduleFacetCounts
  totalCount: number
  locale?: SupportedLocaleCode
  onUpdateFilters: (updates: Partial<ScheduleFilters>) => void
  className?: string
}

export const WingsGoScheduleFilterBar: React.FC<WingsGoScheduleFilterBarProps> = ({
  filters,
  markets,
  airlines,
  facetCounts,
  totalCount,
  locale = 'vi',
  onUpdateFilters,
  className,
}) => {
  const isEn = locale === 'en'
  const copy = getWingsGoScheduleCopy(locale)

  // Debounced search input
  const [localQuery, setLocalQuery] = useState(filters.q || '')

  useEffect(() => {
    setLocalQuery(filters.q || '')
  }, [filters.q])

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = localQuery.trim()
      if (trimmed !== (filters.q || '')) {
        onUpdateFilters({ q: trimmed ? trimmed.slice(0, 80) : undefined })
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [localQuery, filters.q, onUpdateFilters])

  return (
    <div
      className={cn(
        'wingsgo-schedule-filter-bar sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border py-3 mb-6 transition-colors',
        className,
      )}
      data-od-id="schedule-filter-bar"
    >
      {/* Top Filter Controls: Search + Selects + View Toggle */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        {/* Search Input */}
        <label
          className="flex items-center gap-2 min-h-[42px] px-3.5 border border-border rounded-full bg-card flex-1 min-w-[200px] sm:max-w-xs focus-within:border-[var(--site-brand)] transition-colors"
          data-od-id="schedule-search"
        >
          <svg
            aria-hidden="true"
            className="w-4 h-4 text-muted-foreground shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            aria-label={copy.searchAriaLabel}
            className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-foreground placeholder:text-muted-foreground"
            id="q"
            maxLength={80}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder={copy.searchPlaceholder}
            type="search"
            value={localQuery}
          />
          {localQuery ? (
            <button
              aria-label="Xóa tìm kiếm"
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => {
                setLocalQuery('')
                onUpdateFilters({ q: undefined })
              }}
              type="button"
            >
              ✕
            </button>
          ) : null}
        </label>

        {/* Selects */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
          {/* Airline Select */}
          <select
            aria-label={copy.airlineFilterAria}
            className="min-h-[42px] border border-border rounded-full px-3 text-xs sm:text-sm bg-card text-foreground cursor-pointer outline-none hover:border-border/80 focus:border-[var(--site-brand)]"
            data-od-id="airline-filter"
            id="f-airline"
            onChange={(e) =>
              onUpdateFilters({
                airline: e.target.value === 'all' ? undefined : e.target.value,
              })
            }
            value={filters.airline || 'all'}
          >
            <option value="all">{copy.airlineAll}</option>
            {airlines.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </select>

          {/* Status Select */}
          <select
            aria-label={copy.statusFilterAria}
            className="min-h-[42px] border border-border rounded-full px-3 text-xs sm:text-sm bg-card text-foreground cursor-pointer outline-none hover:border-border/80 focus:border-[var(--site-brand)]"
            data-od-id="status-filter"
            id="f-status"
            onChange={(e) =>
              onUpdateFilters({
                status:
                  e.target.value === 'all'
                    ? undefined
                    : (e.target.value as ScheduleAvailability),
              })
            }
            value={filters.status || 'all'}
          >
            <option value="all">{copy.statusAll}</option>
            <option value="open">{copy.filterStatusOpen}</option>
            <option value="limited">{copy.filterStatusLimited}</option>
            <option value="sold-out">{copy.filterStatusSoldOut}</option>
            <option value="quote">{copy.filterStatusQuote}</option>
          </select>

          {/* Sort Select */}
          <select
            aria-label={copy.sortFilterAria}
            className="min-h-[42px] border border-border rounded-full px-3 text-xs sm:text-sm bg-card text-foreground cursor-pointer outline-none hover:border-border/80 focus:border-[var(--site-brand)]"
            data-od-id="sort-filter"
            id="f-sort"
            onChange={(e) =>
              onUpdateFilters({
                sort: e.target.value === 'price' ? 'price' : 'date',
              })
            }
            value={filters.sort || 'date'}
          >
            <option value="date">{copy.sortNearest}</option>
            <option value="price">{copy.sortLowestPrice}</option>
          </select>
        </div>

        {/* View Toggle */}
        <div
          aria-label={copy.viewModeAria}
          className="inline-flex ml-auto border border-border rounded-full p-1 bg-card shrink-0"
          data-od-id="view-toggle"
          role="group"
        >
          <button
            aria-pressed={filters.view !== 'tour'}
            className={cn(
              'min-h-[34px] px-3.5 rounded-full text-xs sm:text-sm font-medium transition-colors cursor-pointer',
              filters.view !== 'tour'
                ? 'bg-[var(--site-brand)] text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            data-view="date"
            onClick={() => onUpdateFilters({ view: 'date' })}
            type="button"
          >
            {copy.viewDate}
          </button>
          <button
            aria-pressed={filters.view === 'tour'}
            className={cn(
              'min-h-[34px] px-3.5 rounded-full text-xs sm:text-sm font-medium transition-colors cursor-pointer',
              filters.view === 'tour'
                ? 'bg-[var(--site-brand)] text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            data-view="tour"
            onClick={() => onUpdateFilters({ view: 'tour' })}
            type="button"
          >
            {copy.viewTour}
          </button>
        </div>
      </div>

      {/* Market Filter Chips (.seg) */}
      <div
        aria-label={isEn ? 'Destinations' : 'Thị trường'}
        className="wingsgo-schedule-seg flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none pt-2.5 sm:pt-3 pb-0.5"
        id="seg-market"
        role="group"
      >
        {/* All Market Chip */}
        <button
          aria-pressed={!filters.market}
          className={cn(
            'inline-flex items-center gap-1.5 min-h-[34px] sm:min-h-[36px] px-3.5 rounded-full text-xs sm:text-sm font-medium border shrink-0 transition-colors cursor-pointer',
            !filters.market
              ? 'bg-[var(--site-brand)] text-white border-[var(--site-brand)] shadow-sm'
              : 'border-border bg-card text-foreground hover:bg-muted/80',
          )}
          onClick={() => onUpdateFilters({ market: undefined })}
          type="button"
        >
          <span>{copy.marketAll}</span>
          <span className="text-[11px] opacity-75">({totalCount})</span>
        </button>

        {/* Individual Market Chips */}
        {markets.map((m) => {
          const isSelected = filters.market === m.value
          const count = facetCounts.markets[m.value] || 0
          const label = getScheduleMarketLabel(m.value, isEn ? 'en' : 'vi', copy)

          return (
            <button
              aria-pressed={isSelected}
              className={cn(
                'inline-flex items-center gap-1.5 min-h-[34px] sm:min-h-[36px] px-3.5 rounded-full text-xs sm:text-sm font-medium border shrink-0 transition-colors cursor-pointer',
                isSelected
                  ? 'bg-[var(--site-brand)] text-white border-[var(--site-brand)] shadow-sm'
                  : 'border-border bg-card text-foreground hover:bg-muted/80',
                count === 0 && !isSelected && 'opacity-60',
              )}
              key={m.value}
              onClick={() =>
                onUpdateFilters({
                  market: isSelected ? undefined : m.value,
                })
              }
              type="button"
            >
              <span>{label}</span>
              <span className="text-[11px] opacity-75">({count})</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
