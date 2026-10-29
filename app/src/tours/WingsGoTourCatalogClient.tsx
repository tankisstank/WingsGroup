'use client'

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'

import {
  getNextBusinessMonths,
} from './businessCalendar'
import {
  hasActiveCatalogFilters,
  WINGSGO_CATALOG_BATCH_SIZE,
  WINGSGO_CATALOG_MARKETS,
  type WingsGoCatalogCard,
  type WingsGoCatalogData,
  type WingsGoCatalogFilters,
} from './wingsGoCatalog'
import {
  getWingsGoCatalogCopy,
  resolveWingsGoCopyLocale,
  WINGSGO_MARKET_LABELS,
} from './wingsGoCatalogCopy'
import { WingsGoTourCard } from './WingsGoTourCard'
import { WingsGoMarketTiles } from './WingsGoMarketTiles'
import { cn } from '@/utilities/ui'

type Props = {
  initial: WingsGoCatalogData
  initialFilters: WingsGoCatalogFilters
  locale?: string | null
}

const filterKey = (filters: WingsGoCatalogFilters) => JSON.stringify(filters)

const queryValue = (filters: WingsGoCatalogFilters, key: keyof WingsGoCatalogFilters) => {
  const value = filters[key]
  return value === undefined ? '' : String(value)
}

const formatNumberVnd = (val: number, locale = 'vi') => {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'vi-VN').format(val)
}

const SkeletonCard = () => (
  <div
    aria-hidden="true"
    className="overflow-hidden rounded-[24px] border border-border/60 bg-card"
  >
    <div className="aspect-[16/10] animate-pulse bg-muted" />
    <div className="space-y-4 p-5">
      <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
      <div className="h-6 w-4/5 animate-pulse rounded bg-muted" />
      <div className="h-12 animate-pulse rounded bg-muted" />
      <div className="h-12 animate-pulse rounded bg-muted" />
    </div>
  </div>
)

const CatalogGrid = ({
  cards,
  layout = 'grid',
  locale,
}: {
  cards: WingsGoCatalogCard[]
  layout?: 'grid' | 'wide'
  locale?: ComponentProps<typeof WingsGoTourCard>['locale']
}) => (
  <div
    className={
      layout === 'wide'
        ? 'grid gap-6 md:grid-cols-1'
        : 'grid gap-5 md:grid-cols-2 xl:grid-cols-3'
    }
  >
    {cards.map((card) => (
      <WingsGoTourCard
        card={card}
        key={String(card.id)}
        layout={layout}
        locale={locale}
      />
    ))}
  </div>
)

export const WingsGoTourCatalogClient = ({ initial, initialFilters, locale = 'vi' }: Props) => {
  const router = useRouter()
  const pathname = usePathname()
  const copyLocale = resolveWingsGoCopyLocale(locale)
  const copy = getWingsGoCatalogCopy(copyLocale)
  const [isPending, startTransition] = useTransition()
  const [cards, setCards] = useState(initial.all)
  const [offset, setOffset] = useState(initial.nextOffset)
  const [cursor, setCursor] = useState<string | null>(initial.nextCursor ?? null)
  const [hasMore, setHasMore] = useState(initial.hasMore)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const requestControllerRef = useRef<AbortController | null>(null)
  const requestGenerationRef = useRef(0)
  const currentFilterKey = useMemo(() => filterKey(initialFilters), [initialFilters])
  const previousFilterKey = useRef(currentFilterKey)
  const pendingParamsRef = useRef<URLSearchParams | null>(null)

  // Local state for numeric text inputs to commit on blur/Enter
  const [localDurationMin, setLocalDurationMin] = useState(queryValue(initialFilters, 'durationMin'))
  const [localDurationMax, setLocalDurationMax] = useState(queryValue(initialFilters, 'durationMax'))
  const [localPriceMin, setLocalPriceMin] = useState(queryValue(initialFilters, 'priceMin'))
  const [localPriceMax, setLocalPriceMax] = useState(queryValue(initialFilters, 'priceMax'))

  useEffect(() => {
    setLocalDurationMin(queryValue(initialFilters, 'durationMin'))
    setLocalDurationMax(queryValue(initialFilters, 'durationMax'))
    setLocalPriceMin(queryValue(initialFilters, 'priceMin'))
    setLocalPriceMax(queryValue(initialFilters, 'priceMax'))
  }, [initialFilters])

  useEffect(() => {
    if (previousFilterKey.current === currentFilterKey) return
    previousFilterKey.current = currentFilterKey
    pendingParamsRef.current = null
    requestGenerationRef.current += 1
    requestControllerRef.current?.abort()
    requestControllerRef.current = null
    setCards(initial.all)
    setOffset(initial.nextOffset)
    setCursor(initial.nextCursor ?? null)
    setHasMore(initial.hasMore)
    setError(null)
    setLoading(false)
  }, [currentFilterKey, initial])

  useEffect(() => () => requestControllerRef.current?.abort(), [])

  // Pending params only chain rapid clicks inside one transition; once it settles the
  // URL is the source of truth again (hero quick search, back/forward).
  useEffect(() => {
    if (!isPending) pendingParamsRef.current = null
  }, [isPending])

  const updateFilters = useCallback(
    (updates: Partial<Record<keyof WingsGoCatalogFilters, string | undefined>>) => {
      const currentSearch = pendingParamsRef.current
        ? new URLSearchParams(pendingParamsRef.current)
        : new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && value !== '') {
          currentSearch.set(key, value)
        } else {
          currentSearch.delete(key)
        }
      }
      currentSearch.delete('offset')
      currentSearch.delete('cursor')

      pendingParamsRef.current = new URLSearchParams(currentSearch)
      const query = currentSearch.toString()
      const targetUrl = query ? `${pathname}?${query}` : pathname

      startTransition(() => {
        router.replace(targetUrl, { scroll: false })
      })
    },
    [pathname, router],
  )

  const updateFilter = useCallback(
    (key: keyof WingsGoCatalogFilters, value: string) => {
      updateFilters({ [key]: value })
    },
    [updateFilters],
  )

  const clearAllFilters = useCallback(() => {
    updateFilters({
      departureMonth: '',
      durationMax: '',
      durationMin: '',
      market: '',
      priceMax: '',
      priceMin: '',
      season: '',
    })
  }, [updateFilters])

  const clearPriceFilter = useCallback(() => {
    updateFilters({
      priceMax: '',
      priceMin: '',
    })
  }, [updateFilters])

  const handleInputKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    key: keyof WingsGoCatalogFilters,
    value: string,
  ) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur()
      updateFilter(key, value)
    }
  }

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    const requestGeneration = requestGenerationRef.current
    const controller = new AbortController()
    requestControllerRef.current?.abort()
    requestControllerRef.current = controller
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    params.set('limit', String(WINGSGO_CATALOG_BATCH_SIZE))
    params.set('offset', String(offset))
    params.set('locale', copyLocale)
    if (cursor) {
      params.set('cursor', cursor)
    }
    for (const key of [
      'market',
      'durationMin',
      'durationMax',
      'priceMin',
      'priceMax',
      'departureMonth',
      'season',
      'sort',
    ] as const) {
      const value = initialFilters[key]
      if (value !== undefined) params.set(key, String(value))
    }

    try {
      const response = await fetch(`/api/wingsgo/tour-catalog?${params.toString()}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(copy.loadMoreError)
      const data = (await response.json()) as WingsGoCatalogData
      if (requestGeneration !== requestGenerationRef.current) return
      setCards((current) => {
        const seen = new Set(current.map((card) => String(card.id)))
        return [...current, ...data.all.filter((card) => !seen.has(String(card.id)))]
      })
      setOffset(data.nextOffset)
      setCursor(data.nextCursor ?? null)
      setHasMore(data.hasMore)
    } catch (loadError) {
      if (requestGeneration !== requestGenerationRef.current || controller.signal.aborted) return
      setError(loadError instanceof Error ? loadError.message : copy.loadMoreError)
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null
        setLoading(false)
      }
    }
  }, [
    copy.loadMoreError,
    copyLocale,
    cursor,
    hasMore,
    initialFilters,
    loading,
    offset,
  ])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore || error || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore()
      },
      { rootMargin: '480px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [error, hasMore, loadMore])

  const retry = () => {
    setError(null)
    void loadMore()
  }

  const eligibleMarkets = useMemo(() => {
    const current = initialFilters.market
    return WINGSGO_CATALOG_MARKETS.filter((m) => {
      if (current && m === current) return true
      const summary = initial.markets?.find((s) => s.market === m)
      return summary ? summary.count > 0 : false
    })
  }, [initial.markets, initialFilters.market])

  const monthOptions = useMemo(
    () => getNextBusinessMonths(12, new Date(), copyLocale),
    [copyLocale],
  )

  const seasons = useMemo(
    () => [
      { key: 'spring', label: copy.seasonSpring },
      { key: 'summer', label: copy.seasonSummer },
      { key: 'autumn', label: copy.seasonAutumn },
      { key: 'winter', label: copy.seasonWinter },
    ],
    [copy.seasonAutumn, copy.seasonSpring, copy.seasonSummer, copy.seasonWinter],
  )

  const sortOptions = useMemo(
    () => [
      { key: 'next-departure', label: copy.sortNextDeparture },
      { key: 'price', label: copy.sortPrice },
      { key: 'title', label: copy.sortTitle },
    ],
    [copy.sortNextDeparture, copy.sortPrice, copy.sortTitle],
  )

  const currentSort = initialFilters.sort || 'next-departure'
  const filtersActive = hasActiveCatalogFilters(initialFilters)
  const hasPriceFilter =
    initialFilters.priceMin !== undefined || initialFilters.priceMax !== undefined

  // Active filters for the removable chips row
  const activeChips = useMemo(() => {
    const chips: Array<{
      id: string
      label: string
      onRemove: () => void
      removeAriaLabel: string
    }> = []

    if (initialFilters.market) {
      const marketLabel =
        WINGSGO_MARKET_LABELS[initialFilters.market]?.[copyLocale] || initialFilters.market
      chips.push({
        id: 'market',
        label: `${copy.filterMarket}: ${marketLabel}`,
        onRemove: () => updateFilter('market', ''),
        removeAriaLabel: copy.removeFilterLabel(marketLabel),
      })
    }

    if (initialFilters.departureMonth) {
      const monthLabel =
        monthOptions.find((o) => o.value === initialFilters.departureMonth)?.label ||
        initialFilters.departureMonth
      chips.push({
        id: 'departureMonth',
        label: `${copy.quickSearchMonthLabel}: ${monthLabel}`,
        onRemove: () => updateFilter('departureMonth', ''),
        removeAriaLabel: copy.removeFilterLabel(monthLabel),
      })
    }

    if (initialFilters.season) {
      const seasonLabel =
        seasons.find((s) => s.key === initialFilters.season)?.label || initialFilters.season
      chips.push({
        id: 'season',
        label: `${copy.quickSearchSeasonLabel}: ${seasonLabel}`,
        onRemove: () => updateFilter('season', ''),
        removeAriaLabel: copy.removeFilterLabel(seasonLabel),
      })
    }

    if (initialFilters.durationMin !== undefined || initialFilters.durationMax !== undefined) {
      const dMin = initialFilters.durationMin
      const dMax = initialFilters.durationMax
      let dLabel = ''
      if (dMin !== undefined && dMax !== undefined) {
        dLabel = `${dMin} - ${dMax} ${copyLocale === 'en' ? 'days' : 'ngày'}`
      } else if (dMin !== undefined) {
        dLabel = `≥ ${dMin} ${copyLocale === 'en' ? 'days' : 'ngày'}`
      } else {
        dLabel = `≤ ${dMax} ${copyLocale === 'en' ? 'days' : 'ngày'}`
      }
      chips.push({
        id: 'duration',
        label: `${copy.filterDurationRange}: ${dLabel}`,
        onRemove: () => updateFilters({ durationMax: '', durationMin: '' }),
        removeAriaLabel: copy.removeFilterLabel(dLabel),
      })
    }

    if (initialFilters.priceMin !== undefined || initialFilters.priceMax !== undefined) {
      const pMin = initialFilters.priceMin
      const pMax = initialFilters.priceMax
      let pLabel = ''
      if (pMin !== undefined && pMax !== undefined) {
        pLabel = `${formatNumberVnd(pMin, copyLocale)} - ${formatNumberVnd(pMax, copyLocale)} VND`
      } else if (pMin !== undefined) {
        pLabel = `≥ ${formatNumberVnd(pMin, copyLocale)} VND`
      } else {
        pLabel = `≤ ${formatNumberVnd(pMax ?? 0, copyLocale)} VND`
      }
      chips.push({
        id: 'price',
        label: `${copy.filterPriceRange}: ${pLabel}`,
        onRemove: () => updateFilters({ priceMax: '', priceMin: '' }),
        removeAriaLabel: copy.removeFilterLabel(pLabel),
      })
    }

    return chips
  }, [
    copy,
    copyLocale,
    initialFilters,
    monthOptions,
    seasons,
    updateFilter,
    updateFilters,
  ])

  const heroCount = initial.hero ? initial.hero.length : 0
  const remainingFeatured = initial.featured.slice(heroCount)
  const hideFeatured =
    initial.filtersActive ||
    (remainingFeatured.length === 0 && heroCount > 0)

  return (
    <div className="container space-y-10 py-10 md:py-14">
      <WingsGoMarketTiles
        locale={copyLocale}
        markets={initial.markets}
        selectedMarket={initialFilters.market}
      />

      {!hideFeatured ? (
        <section aria-labelledby="wingsgo-featured-tours">
          <div className="mb-5">
            <p className="site-brand-kicker text-xs font-semibold uppercase tracking-[0.18em]">
              {copy.featuredKicker}
            </p>
            <h2
              className="mt-2 text-2xl font-semibold text-foreground md:text-3xl"
              id="wingsgo-featured-tours"
            >
              {copy.featuredTitle}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              {copy.featuredDescription}
            </p>
          </div>
          {remainingFeatured.length > 0 ? (
            <CatalogGrid cards={remainingFeatured} layout="wide" locale={copyLocale} />
          ) : (
            <p className="rounded-[20px] border border-border/60 bg-muted/20 p-5 text-sm text-muted-foreground">
              {copy.featuredEmpty}
            </p>
          )}
        </section>
      ) : null}

      <section aria-labelledby="wingsgo-all-tours">
        <div className="mb-6 space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="site-brand-kicker text-xs font-semibold uppercase tracking-[0.18em]">
                {copy.catalogKicker}
              </p>
              <h2
                className="mt-2 text-2xl font-semibold text-foreground md:text-3xl"
                id="wingsgo-all-tours"
              >
                {copy.catalogTitle}
              </h2>
            </div>
          </div>

          <div
            aria-label={copy.filtersAriaLabel}
            className="space-y-5 rounded-[22px] border border-border/70 bg-card p-5 shadow-xs md:p-6"
            role="group"
          >
            {/* Market chips */}
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-muted-foreground">
                {copy.filterMarket}
              </span>
              <div
                aria-label={copy.filterMarket}
                className="flex flex-wrap gap-2"
                role="group"
              >
                <button
                  aria-pressed={!initialFilters.market}
                  className={cn(
                    'inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-brand)]',
                    !initialFilters.market
                      ? 'bg-[var(--site-brand)] text-white shadow-xs'
                      : 'border border-border bg-background text-foreground hover:border-[var(--site-brand)] hover:text-[var(--site-brand)]',
                  )}
                  onClick={() => updateFilter('market', '')}
                  type="button"
                >
                  {copy.allMarkets}
                </button>
                {eligibleMarkets.map((m) => {
                  const isSelected = initialFilters.market === m
                  const label = WINGSGO_MARKET_LABELS[m]?.[copyLocale] || m
                  return (
                    <button
                      aria-pressed={isSelected}
                      className={cn(
                        'inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-brand)]',
                        isSelected
                          ? 'bg-[var(--site-brand)] text-white shadow-xs'
                          : 'border border-border bg-background text-foreground hover:border-[var(--site-brand)] hover:text-[var(--site-brand)]',
                      )}
                      key={m}
                      onClick={() => updateFilter('market', isSelected ? '' : m)}
                      type="button"
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Season chips */}
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-muted-foreground">
                {copy.quickSearchSeasonLabel}
              </span>
              <div
                aria-label={copy.quickSearchSeasonLabel}
                className="flex flex-wrap gap-2"
                role="group"
              >
                <button
                  aria-pressed={!initialFilters.season}
                  className={cn(
                    'inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-brand)]',
                    !initialFilters.season
                      ? 'bg-[var(--site-brand)] text-white shadow-xs'
                      : 'border border-border bg-background text-foreground hover:border-[var(--site-brand)] hover:text-[var(--site-brand)]',
                  )}
                  onClick={() => updateFilter('season', '')}
                  type="button"
                >
                  {copy.allSeasons}
                </button>
                {seasons.map(({ key, label }) => {
                  const isSelected = initialFilters.season === key
                  return (
                    <button
                      aria-pressed={isSelected}
                      className={cn(
                        'inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-brand)]',
                        isSelected
                          ? 'bg-[var(--site-brand)] text-white shadow-xs'
                          : 'border border-border bg-background text-foreground hover:border-[var(--site-brand)] hover:text-[var(--site-brand)]',
                      )}
                      key={key}
                      onClick={() => updateFilter('season', isSelected ? '' : key)}
                      type="button"
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Departure month & Sort & Numeric ranges */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-semibold text-muted-foreground">
                {copy.quickSearchMonthLabel}
                <select
                  className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-brand)]"
                  onChange={(event) => updateFilter('departureMonth', event.target.value)}
                  value={queryValue(initialFilters, 'departureMonth')}
                >
                  <option value="">{copy.quickSearchMonthAll}</option>
                  {monthOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-1 sm:col-span-2 lg:col-span-2">
                <span className="block text-xs font-semibold text-muted-foreground">
                  {copy.filterSort}
                </span>
                <div
                  aria-label={copy.filterSort}
                  className="flex flex-wrap gap-2"
                  role="group"
                >
                  {sortOptions.map(({ key, label }) => {
                    const isSelected = currentSort === key
                    return (
                      <button
                        aria-pressed={isSelected}
                        className={cn(
                          'inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-brand)]',
                          isSelected
                            ? 'bg-[var(--site-brand)] text-white shadow-xs'
                            : 'border border-border bg-background text-foreground hover:border-[var(--site-brand)] hover:text-[var(--site-brand)]',
                        )}
                        key={key}
                        onClick={() => updateFilter('sort', key)}
                        type="button"
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <label className="text-xs font-semibold text-muted-foreground">
                {copy.filterDurationMin}
                <input
                  className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-brand)]"
                  inputMode="numeric"
                  min="1"
                  onBlur={() => updateFilter('durationMin', localDurationMin)}
                  onChange={(event) => setLocalDurationMin(event.target.value)}
                  onKeyDown={(event) =>
                    handleInputKeyDown(event, 'durationMin', localDurationMin)
                  }
                  placeholder={copy.durationMinPlaceholder}
                  type="number"
                  value={localDurationMin}
                />
              </label>

              <label className="text-xs font-semibold text-muted-foreground">
                {copy.filterDurationMax}
                <input
                  className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-brand)]"
                  inputMode="numeric"
                  min="1"
                  onBlur={() => updateFilter('durationMax', localDurationMax)}
                  onChange={(event) => setLocalDurationMax(event.target.value)}
                  onKeyDown={(event) =>
                    handleInputKeyDown(event, 'durationMax', localDurationMax)
                  }
                  placeholder={copy.durationMaxPlaceholder}
                  type="number"
                  value={localDurationMax}
                />
              </label>

              <label className="text-xs font-semibold text-muted-foreground">
                {copy.filterPriceMin}
                <input
                  className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-brand)]"
                  inputMode="numeric"
                  min="0"
                  onBlur={() => updateFilter('priceMin', localPriceMin)}
                  onChange={(event) => setLocalPriceMin(event.target.value)}
                  onKeyDown={(event) => handleInputKeyDown(event, 'priceMin', localPriceMin)}
                  placeholder={copy.priceMinPlaceholder}
                  type="number"
                  value={localPriceMin}
                />
              </label>

              <label className="text-xs font-semibold text-muted-foreground">
                {copy.filterPriceMax}
                <input
                  className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-brand)]"
                  inputMode="numeric"
                  min="0"
                  onBlur={() => updateFilter('priceMax', localPriceMax)}
                  onChange={(event) => setLocalPriceMax(event.target.value)}
                  onKeyDown={(event) => handleInputKeyDown(event, 'priceMax', localPriceMax)}
                  placeholder={copy.priceMaxPlaceholder}
                  type="number"
                  value={localPriceMax}
                />
              </label>
            </div>

            {/* Active filter row */}
            {activeChips.length > 0 ? (
              <div
                aria-label={copy.activeFiltersAriaLabel}
                className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-4"
                role="region"
              >
                <span className="text-xs font-semibold text-muted-foreground">
                  {copy.activeFiltersAriaLabel}:
                </span>
                {activeChips.map((chip) => (
                  <button
                    aria-label={chip.removeAriaLabel}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border/80 bg-muted/40 px-3.5 py-1 text-xs font-semibold text-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-brand)]"
                    key={chip.id}
                    onClick={chip.onRemove}
                    type="button"
                  >
                    <span>{chip.label}</span>
                    <span aria-hidden="true" className="font-bold">
                      ×
                    </span>
                  </button>
                ))}
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-dashed border-border px-3.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-brand)]"
                  onClick={clearAllFilters}
                  type="button"
                >
                  {copy.clearAllFilters}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {cards.length > 0 ? (
          <CatalogGrid cards={cards} locale={copyLocale} />
        ) : (
          <div
            className="space-y-4 rounded-[20px] border border-border/60 bg-muted/20 p-6 text-center"
            role="status"
          >
            <p className="text-base font-medium text-foreground">
              {filtersActive ? copy.emptyFiltered : copy.featuredEmpty}
            </p>
            {hasPriceFilter ? (
              <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
                {copy.emptyBudgetExplanation}
              </p>
            ) : null}
            {filtersActive ? (
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--site-brand)] px-5 text-sm font-semibold text-white shadow-xs transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-brand)]"
                  onClick={clearAllFilters}
                  type="button"
                >
                  {copy.clearFilters}
                </button>
                {hasPriceFilter ? (
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:border-[var(--site-brand)] hover:text-[var(--site-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-brand)]"
                    onClick={clearPriceFilter}
                    type="button"
                  >
                    {copy.removeBudgetFilter}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        <div aria-live="polite" className="mt-6 space-y-4">
          {loading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: WINGSGO_CATALOG_BATCH_SIZE }, (_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : null}
          {error ? (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground"
              role="alert"
            >
              <span>{error}</span>
              <button
                className="min-h-11 rounded-full border border-border bg-background px-4 font-semibold"
                onClick={retry}
                type="button"
              >
                {copy.retry}
              </button>
            </div>
          ) : null}
          {hasMore ? (
            <button
              className="min-h-11 rounded-full border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:border-[var(--site-brand)] hover:text-[var(--site-brand)] disabled:cursor-wait disabled:opacity-60"
              disabled={loading || isPending}
              onClick={() => void loadMore()}
              type="button"
            >
              {loading || isPending ? copy.loading : copy.loadMore(WINGSGO_CATALOG_BATCH_SIZE)}
            </button>
          ) : cards.length > 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              {copy.allLoaded}
            </p>
          ) : null}
          <div aria-hidden="true" className="h-px" ref={sentinelRef} />
        </div>
      </section>
    </div>
  )
}
