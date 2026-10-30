'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import type {
  WingsGoScheduleSnapshot,
  ScheduleFilters,
} from './wingsGoScheduleModel'
import {
  filterScheduleRows,
  sortScheduleRows,
  countScheduleFacets,
  parseScheduleFilters,
  urlSearchParamsToRecord,
  getScheduleMarketLabel,
} from './wingsGoScheduleModel'
import { getWingsGoScheduleCopy } from './wingsGoScheduleCopy'
import { WingsGoScheduleHero } from './WingsGoScheduleHero'
import { WingsGoScheduleMonthChart } from './WingsGoScheduleMonthChart'
import { WingsGoScheduleMarketCards } from './WingsGoScheduleMarketCards'
import { WingsGoScheduleFilterBar } from './WingsGoScheduleFilterBar'
import { WingsGoScheduleDateList } from './WingsGoScheduleDateList'
import { WingsGoScheduleTourList } from './WingsGoScheduleTourList'
import { WingsGoScheduleEmpty } from './WingsGoScheduleEmpty'

export type WingsGoScheduleBrowserProps = {
  snapshot: WingsGoScheduleSnapshot
  locale?: SupportedLocaleCode
  className?: string
}

export const WingsGoScheduleBrowser: React.FC<WingsGoScheduleBrowserProps> = ({
  snapshot,
  locale: propLocale,
  className,
}) => {
  const locale = propLocale || snapshot.locale || 'vi'
  const isEn = locale === 'en'
  const copy = getWingsGoScheduleCopy(locale)

  // Initialize filter state from snapshot.initialFilters
  const [filters, setFilters] = useState<ScheduleFilters>(() => ({
    ...snapshot.initialFilters,
  }))

  // URL two-way sync helper: writes updated whitelist params to URL while preserving others (e.g. utm_*)
  // Uses pushState for discrete filter actions and replaceState for debounced search refinements.
  const syncToURL = useCallback(
    (newFilters: ScheduleFilters, mode: 'push' | 'replace' = 'push') => {
      if (typeof window === 'undefined') return
      try {
        const params = new URLSearchParams(window.location.search)

        // Whitelist params for US-093 D9
        const whitelist = ['market', 'month', 'airline', 'status', 'q', 'sort', 'view'] as const
        for (const key of whitelist) {
          params.delete(key)
        }

        if (newFilters.market) params.set('market', newFilters.market)
        if (newFilters.month) params.set('month', newFilters.month)
        if (newFilters.airline) params.set('airline', newFilters.airline)
        if (newFilters.status) params.set('status', newFilters.status)
        if (newFilters.q) params.set('q', newFilters.q)
        if (newFilters.sort && newFilters.sort !== 'date') params.set('sort', newFilters.sort)
        if (newFilters.view && newFilters.view !== 'date') params.set('view', newFilters.view)

        const queryStr = params.toString()
        const hash = window.location.hash || ''
        const newUrl = queryStr
          ? `${window.location.pathname}?${queryStr}${hash}`
          : `${window.location.pathname}${hash}`

        if (mode === 'replace') {
          window.history.replaceState(null, '', newUrl)
        } else {
          window.history.pushState(null, '', newUrl)
        }
      } catch {
        // Ignore in non-browser environments
      }
    },
    [],
  )

  // Listen to popstate (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const parsed = parseScheduleFilters(urlSearchParamsToRecord(params), {
        validMarkets: snapshot.markets.map((m) => m.value),
        validMonths: snapshot.months,
        validAirlines: snapshot.airlines.map((a) => a.key),
      })
      setFilters(parsed)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [snapshot])

  // Update filters and sync to URL outside updater
  const updateFilters = useCallback(
    (updates: Partial<ScheduleFilters>) => {
      const isSearchOnly = Object.keys(updates).length === 1 && 'q' in updates
      const mode = isSearchOnly ? 'replace' : 'push'

      const next: ScheduleFilters = { ...filters, ...updates }
      for (const k of Object.keys(next) as (keyof ScheduleFilters)[]) {
        if (next[k] === undefined || next[k] === '') {
          delete next[k]
        }
      }
      if (!next.sort) next.sort = 'date'
      if (!next.view) next.view = 'date'

      setFilters(next)
      syncToURL(next, mode)
    },
    [filters, syncToURL],
  )

  const clearAllFilters = useCallback(() => {
    const cleared: ScheduleFilters = { sort: 'date', view: 'date' }
    setFilters(cleared)
    syncToURL(cleared, 'push')
  }, [syncToURL])

  // Pure filtering and calculations
  const filteredRows = useMemo(
    () => filterScheduleRows(snapshot.rows, filters, snapshot.tours),
    [snapshot.rows, filters, snapshot.tours],
  )

  const sortedRows = useMemo(
    () => sortScheduleRows(filteredRows, filters.sort),
    [filteredRows, filters.sort],
  )

  const facetCounts = useMemo(
    () => countScheduleFacets(snapshot.rows, filters, snapshot.tours),
    [snapshot.rows, filters, snapshot.tours],
  )

  const uniqueToursCount = useMemo(
    () => new Set(filteredRows.map((r) => r.tourId)).size,
    [filteredRows],
  )

  // Total departures count when dropping 'market' filter (matches facet count logic for "All" chip)
  const totalMarketCount = useMemo(
    () =>
      filterScheduleRows(snapshot.rows, { ...filters, market: undefined }, snapshot.tours).length,
    [snapshot.rows, filters, snapshot.tours],
  )

  // Active filter chips list for result bar
  const activeChips = useMemo(() => {
    const list: { key: keyof ScheduleFilters; label: string }[] = []

    if (filters.q) {
      list.push({ key: 'q', label: `“${filters.q}”` })
    }
    if (filters.market) {
      const label = getScheduleMarketLabel(filters.market, isEn ? 'en' : 'vi', copy)
      list.push({ key: 'market', label })
    }
    if (filters.month) {
      const [year, monthStr] = filters.month.split('-')
      const monNum = monthStr ? String(parseInt(monthStr, 10)) : ''
      list.push({ key: 'month', label: copy.monthGroupTitle(monNum, year) })
    }
    if (filters.airline) {
      const al = snapshot.airlines.find((a) => a.key === filters.airline)
      list.push({ key: 'airline', label: al?.label || filters.airline })
    }
    if (filters.status) {
      let statusName: string = filters.status
      if (filters.status === 'open') statusName = copy.filterStatusOpen
      else if (filters.status === 'limited') statusName = copy.filterStatusLimited
      else if (filters.status === 'sold-out') statusName = copy.filterStatusSoldOut
      else if (filters.status === 'quote') statusName = copy.filterStatusQuote
      list.push({ key: 'status', label: statusName })
    }

    return list
  }, [filters, isEn, copy, snapshot.airlines])

  return (
    <div className={className} data-od-id="wingsgo-schedule-browser">
      {/* 1. Hero with connected Month Chart */}
      <WingsGoScheduleHero locale={locale} stats={snapshot.stats}>
        <WingsGoScheduleMonthChart
          counts={facetCounts.months}
          locale={locale}
          months={snapshot.months}
          onSelect={(m) => updateFilters({ month: m })}
          selected={filters.month}
        />
      </WingsGoScheduleHero>

      {/* 2. Market Cards */}
      <WingsGoScheduleMarketCards
        cards={snapshot.marketCards}
        locale={locale}
        onSelect={(m) => updateFilters({ market: m })}
        rows={snapshot.rows}
        selected={filters.market}
        tours={snapshot.tours}
      />

      {/* 3. Sticky Filter Bar */}
      <WingsGoScheduleFilterBar
        airlines={snapshot.airlines}
        facetCounts={facetCounts}
        filters={filters}
        locale={locale}
        markets={snapshot.markets}
        onUpdateFilters={updateFilters}
        totalCount={totalMarketCount}
      />

      {/* 4. Result Line & Active Filter Chips */}
      <div
        aria-live="polite"
        className="wingsgo-schedule-result-line flex flex-wrap items-center gap-2 mb-4 text-xs sm:text-sm text-muted-foreground"
        id="result-line"
      >
        <span className="font-medium text-foreground">
          {copy.resultCounts(sortedRows.length, uniqueToursCount)}
        </span>

        {activeChips.map((chip) => (
          <button
            aria-label={copy.clearFilterAria(chip.label)}
            className="wingsgo-schedule-active-chip inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-1.5 rounded-full bg-muted/80 text-foreground text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
            data-clear={chip.key}
            key={chip.key}
            onClick={() => updateFilters({ [chip.key]: undefined })}
            type="button"
          >
            <span>{chip.label}</span>
            <span aria-hidden="true" className="text-muted-foreground ml-0.5">✕</span>
          </button>
        ))}

        {activeChips.length > 0 ? (
          <button
            className="wingsgo-schedule-clear-all ml-auto inline-flex items-center min-h-[44px] px-2 text-xs sm:text-sm font-semibold text-[var(--site-brand)] hover:underline cursor-pointer bg-transparent border-none"
            data-reset="true"
            onClick={clearAllFilters}
            type="button"
          >
            {copy.clearAllFilters}
          </button>
        ) : null}
      </div>

      {/* 5. Date List, Tour List, or Empty State */}
      <div data-od-id="schedule-results" id="results">
        {sortedRows.length === 0 ? (
          <WingsGoScheduleEmpty
            activeFilters={filters}
            airlines={snapshot.airlines}
            locale={locale}
            onClearAll={clearAllFilters}
            onClearFilter={(k) => updateFilters({ [k]: undefined })}
            rows={snapshot.rows}
            totalDeparturesCount={snapshot.rows.length}
            tours={snapshot.tours}
          />
        ) : filters.view === 'tour' ? (
          <WingsGoScheduleTourList
            locale={locale}
            rows={filteredRows}
            sort={filters.sort}
            tours={snapshot.tours}
          />
        ) : (
          <WingsGoScheduleDateList
            locale={locale}
            rows={sortedRows}
            sort={filters.sort}
            tours={snapshot.tours}
          />
        )}
      </div>
    </div>
  )
}
