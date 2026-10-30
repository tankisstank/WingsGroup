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

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)

  // Active filter count for mobile badge
  const activeFilterCount =
    (filters.airline ? 1 : 0) +
    (filters.status ? 1 : 0) +
    (filters.sort === 'price' ? 1 : 0)

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
        'wingsgo-schedule-filter-bar sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border py-2.5 sm:py-3 mb-6 transition-colors',
        className,
      )}
      data-od-id="schedule-filter-bar"
    >
      {/* Top Filter Controls: Search + Mobile button + Desktop Selects/Toggle */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Search Input */}
        <label
          className="flex items-center gap-2 min-h-[44px] px-3.5 border border-border rounded-full bg-card flex-1 min-w-0 sm:min-w-[200px] sm:max-w-xs focus-within:border-[var(--site-brand)] transition-colors"
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
              aria-label={copy.clearSearch}
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-xs text-muted-foreground hover:text-foreground cursor-pointer -mr-2"
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

        {/* Mobile Filter Toggle Button */}
        <button
          aria-controls="mobile-filter-panel"
          aria-expanded={isMobileFiltersOpen}
          aria-label={copy.filterButtonAria(activeFilterCount)}
          className={cn(
            'sm:hidden inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 rounded-full text-xs font-medium border border-border bg-card text-foreground hover:bg-muted/80 shrink-0 transition-colors cursor-pointer',
            (isMobileFiltersOpen || activeFilterCount > 0) &&
              'border-[var(--site-brand)] text-[var(--site-brand)] font-semibold',
          )}
          data-od-id="mobile-filter-button"
          onClick={() => setIsMobileFiltersOpen((prev) => !prev)}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="w-4 h-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{copy.filterButton}</span>
          {activeFilterCount > 0 ? (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-[var(--site-brand)] text-white rounded-full">
              {activeFilterCount}
            </span>
          ) : null}
        </button>

        {/* Filter Panel (Desktop: inline; Mobile: expandable region) */}
        <div
          className={cn(
            'sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:flex-1 sm:w-auto sm:min-w-0',
            isMobileFiltersOpen
              ? 'flex flex-wrap items-center gap-2 pt-2.5 pb-1 border-t border-border mt-1 w-full order-3 sm:order-none sm:pt-0 sm:pb-0 sm:border-0 sm:mt-0'
              : 'hidden sm:flex',
          )}
          id="mobile-filter-panel"
        >
          {/* Airline Select */}
          <select
            aria-label={copy.airlineFilterAria}
            className="wingsgo-schedule-select"
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
            className="wingsgo-schedule-select"
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
            className="wingsgo-schedule-select"
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

          {/* View Toggle */}
          <div
            aria-label={copy.viewModeAria}
            className="inline-flex sm:ml-auto border border-border rounded-full p-1 bg-card shrink-0"
            data-od-id="view-toggle"
            role="group"
          >
            <button
              aria-pressed={filters.view !== 'tour'}
              className={cn(
                'min-h-[44px] px-3.5 inline-flex items-center justify-center rounded-full text-xs sm:text-sm font-medium transition-colors cursor-pointer',
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
                'min-h-[44px] px-3.5 inline-flex items-center justify-center rounded-full text-xs sm:text-sm font-medium transition-colors cursor-pointer',
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
      </div>

      {/* Market Filter Chips (.seg) */}
      <div
        aria-label={isEn ? 'Destinations' : 'Thị trường'}
        className="wingsgo-schedule-seg flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none pt-2 sm:pt-3 pb-0.5"
        id="seg-market"
        role="group"
      >
        {/* All Market Chip */}
        <button
          aria-pressed={!filters.market}
          className={cn(
            'wingsgo-schedule-market-chip',
            !filters.market && 'wingsgo-schedule-market-chip--selected',
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
                'wingsgo-schedule-market-chip',
                isSelected && 'wingsgo-schedule-market-chip--selected',
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
