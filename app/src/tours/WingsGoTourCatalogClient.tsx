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

import type {
  WingsGoCatalogCard,
  WingsGoCatalogData,
  WingsGoCatalogFilters,
} from './wingsGoCatalog'
import { WINGSGO_CATALOG_BATCH_SIZE } from './wingsGoCatalog'
import { getWingsGoCatalogCopy, resolveWingsGoCopyLocale } from './wingsGoCatalogCopy'
import { WingsGoTourCard } from './WingsGoTourCard'

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
  locale,
}: {
  cards: WingsGoCatalogCard[]
  locale?: ComponentProps<typeof WingsGoTourCard>['locale']
}) => (
  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
    {cards.map((card) => (
      <WingsGoTourCard card={card} key={String(card.id)} locale={locale} />
    ))}
  </div>
)

export const WingsGoTourCatalogClient = ({ initial, initialFilters, locale = 'vi' }: Props) => {
  const router = useRouter()
  const pathname = usePathname()
  const copy = getWingsGoCatalogCopy(locale)
  const copyLocale = resolveWingsGoCopyLocale(locale)
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

  useEffect(() => {
    if (previousFilterKey.current === currentFilterKey) return
    previousFilterKey.current = currentFilterKey
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

  const updateFilter = (key: keyof WingsGoCatalogFilters, value: string) => {
    const params = new URLSearchParams(window.location.search)
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('offset')
    const query = params.toString()
    startTransition(() =>
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }),
    )
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
    if (!initial.filtersActive && initial.featured.length > 0) {
      const excludeParam = initial.featured
        .map((card) => String(card.id))
        .slice(0, 6)
        .join(',')
      if (excludeParam) {
        params.set('exclude', excludeParam)
      }
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
    initial.featured,
    initial.filtersActive,
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

  return (
    <div className="container space-y-10 py-10 md:py-14">
      {!initial.filtersActive ? (
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
          {initial.featured.length > 0 ? (
            <CatalogGrid cards={initial.featured} locale={copyLocale} />
          ) : (
            <p className="rounded-[20px] border border-border/60 bg-muted/20 p-5 text-sm text-muted-foreground">
              {copy.featuredEmpty}
            </p>
          )}
        </section>
      ) : null}

      <section aria-labelledby="wingsgo-all-tours">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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
          <div
            aria-label={copy.filtersAriaLabel}
            className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
            role="group"
          >
            <label className="text-xs font-semibold text-muted-foreground">
              {copy.filterMarket}
              <select
                className="mt-1 block min-h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                onChange={(event) => updateFilter('market', event.target.value)}
                value={queryValue(initialFilters, 'market')}
              >
                <option value="">{copy.allMarkets}</option>
                <option value="korea">{copy.marketKorea}</option>
                <option value="japan">{copy.marketJapan}</option>
                <option value="china">{copy.marketChina}</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              {copy.filterSort}
              <select
                className="mt-1 block min-h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                onChange={(event) => updateFilter('sort', event.target.value)}
                value={queryValue(initialFilters, 'sort')}
              >
                <option value="next-departure">{copy.sortNextDeparture}</option>
                <option value="price">{copy.sortPrice}</option>
                <option value="title">{copy.sortTitle}</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              {copy.filterDurationMin}
              <input
                className="mt-1 block min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                inputMode="numeric"
                min="1"
                onChange={(event) => updateFilter('durationMin', event.target.value)}
                placeholder={copy.durationMinPlaceholder}
                type="number"
                value={queryValue(initialFilters, 'durationMin')}
              />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              {copy.filterDurationMax}
              <input
                className="mt-1 block min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                inputMode="numeric"
                min="1"
                onChange={(event) => updateFilter('durationMax', event.target.value)}
                placeholder={copy.durationMaxPlaceholder}
                type="number"
                value={queryValue(initialFilters, 'durationMax')}
              />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              {copy.filterPriceMin}
              <input
                className="mt-1 block min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                inputMode="numeric"
                min="0"
                onChange={(event) => updateFilter('priceMin', event.target.value)}
                placeholder={copy.priceMinPlaceholder}
                type="number"
                value={queryValue(initialFilters, 'priceMin')}
              />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              {copy.filterPriceMax}
              <input
                className="mt-1 block min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                inputMode="numeric"
                min="0"
                onChange={(event) => updateFilter('priceMax', event.target.value)}
                placeholder={copy.priceMaxPlaceholder}
                type="number"
                value={queryValue(initialFilters, 'priceMax')}
              />
            </label>
          </div>
        </div>
        {cards.length > 0 ? (
          <CatalogGrid cards={cards} locale={copyLocale} />
        ) : (
          <p className="rounded-[20px] border border-border/60 bg-muted/20 p-5 text-sm text-muted-foreground">
            {copy.emptyFiltered}
          </p>
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
                className="min-h-10 rounded-full border border-border bg-background px-4 font-semibold"
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
