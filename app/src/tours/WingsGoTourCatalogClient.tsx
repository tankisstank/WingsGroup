'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import type {
  WingsGoCatalogCard,
  WingsGoCatalogData,
  WingsGoCatalogFilters,
} from './wingsGoCatalog'
import { WINGSGO_CATALOG_BATCH_SIZE } from './wingsGoCatalog'
import { WingsGoTourCard } from './WingsGoTourCard'

type Props = {
  initial: WingsGoCatalogData
  initialFilters: WingsGoCatalogFilters
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

const CatalogGrid = ({ cards }: { cards: WingsGoCatalogCard[] }) => (
  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
    {cards.map((card) => (
      <WingsGoTourCard card={card} key={String(card.id)} />
    ))}
  </div>
)

export const WingsGoTourCatalogClient = ({ initial, initialFilters }: Props) => {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [cards, setCards] = useState(initial.all)
  const [offset, setOffset] = useState(initial.nextOffset)
  const [hasMore, setHasMore] = useState(initial.hasMore)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const currentFilterKey = useMemo(() => filterKey(initialFilters), [initialFilters])
  const previousFilterKey = useRef(currentFilterKey)

  useEffect(() => {
    if (previousFilterKey.current === currentFilterKey) return
    previousFilterKey.current = currentFilterKey
    setCards(initial.all)
    setOffset(initial.nextOffset)
    setHasMore(initial.hasMore)
    setError(null)
    setLoading(false)
  }, [currentFilterKey, initial])

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
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    params.set('limit', String(WINGSGO_CATALOG_BATCH_SIZE))
    params.set('offset', String(offset))
    for (const key of [
      'market',
      'durationMin',
      'durationMax',
      'priceMin',
      'priceMax',
      'sort',
    ] as const) {
      const value = initialFilters[key]
      if (value !== undefined) params.set(key, String(value))
    }

    try {
      const response = await fetch(`/api/wingsgo/tour-catalog?${params.toString()}`, {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) throw new Error('Không tải thêm được catalog tour.')
      const data = (await response.json()) as WingsGoCatalogData
      setCards((current) => {
        const seen = new Set(current.map((card) => String(card.id)))
        return [...current, ...data.all.filter((card) => !seen.has(String(card.id)))]
      })
      setOffset(data.nextOffset)
      setHasMore(data.hasMore)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không tải thêm được catalog tour.')
    } finally {
      setLoading(false)
    }
  }, [hasMore, initialFilters, loading, offset])

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
      <section aria-labelledby="wingsgo-featured-tours">
        <div className="mb-5">
          <p className="site-brand-kicker text-xs font-semibold uppercase tracking-[0.18em]">
            Gợi ý chọn nhanh
          </p>
          <h2
            className="mt-2 text-2xl font-semibold text-foreground md:text-3xl"
            id="wingsgo-featured-tours"
          >
            Tour nổi bật
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
            Những line tour được biên tập theo thứ tự ưu tiên; nếu chưa đủ sáu, hệ thống tự bổ sung
            tour đủ điều kiện mà không thay đổi lựa chọn trong CMS.
          </p>
        </div>
        {initial.featured.length > 0 ? (
          <CatalogGrid cards={initial.featured} />
        ) : (
          <p className="rounded-[20px] border border-border/60 bg-muted/20 p-5 text-sm text-muted-foreground">
            Hiện chưa có tour đủ điều kiện hiển thị.
          </p>
        )}
      </section>

      <section aria-labelledby="wingsgo-all-tours">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="site-brand-kicker text-xs font-semibold uppercase tracking-[0.18em]">
              Catalog WingsGo
            </p>
            <h2
              className="mt-2 text-2xl font-semibold text-foreground md:text-3xl"
              id="wingsgo-all-tours"
            >
              Tất cả tour
            </h2>
          </div>
          <div
            aria-label="Bộ lọc catalog tour"
            className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
            role="group"
          >
            <label className="text-xs font-semibold text-muted-foreground">
              Thị trường
              <select
                className="mt-1 block min-h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                onChange={(event) => updateFilter('market', event.target.value)}
                value={queryValue(initialFilters, 'market')}
              >
                <option value="">Tất cả</option>
                <option value="korea">Hàn Quốc</option>
                <option value="japan">Nhật Bản</option>
                <option value="china">Trung Quốc</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Sắp xếp
              <select
                className="mt-1 block min-h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                onChange={(event) => updateFilter('sort', event.target.value)}
                value={queryValue(initialFilters, 'sort')}
              >
                <option value="next-departure">Ngày đi gần nhất</option>
                <option value="price">Giá thấp đến cao</option>
                <option value="title">Tên tour</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Số ngày tối thiểu
              <input
                className="mt-1 block min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                inputMode="numeric"
                min="1"
                onChange={(event) => updateFilter('durationMin', event.target.value)}
                placeholder="Ví dụ 3"
                type="number"
                value={queryValue(initialFilters, 'durationMin')}
              />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Số ngày tối đa
              <input
                className="mt-1 block min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                inputMode="numeric"
                min="1"
                onChange={(event) => updateFilter('durationMax', event.target.value)}
                placeholder="Ví dụ 6"
                type="number"
                value={queryValue(initialFilters, 'durationMax')}
              />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Giá từ (VND)
              <input
                className="mt-1 block min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                inputMode="numeric"
                min="0"
                onChange={(event) => updateFilter('priceMin', event.target.value)}
                placeholder="Ví dụ 10000000"
                type="number"
                value={queryValue(initialFilters, 'priceMin')}
              />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Giá đến (VND)
              <input
                className="mt-1 block min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                inputMode="numeric"
                min="0"
                onChange={(event) => updateFilter('priceMax', event.target.value)}
                placeholder="Ví dụ 30000000"
                type="number"
                value={queryValue(initialFilters, 'priceMax')}
              />
            </label>
          </div>
        </div>
        {cards.length > 0 ? (
          <CatalogGrid cards={cards} />
        ) : (
          <p className="rounded-[20px] border border-border/60 bg-muted/20 p-5 text-sm text-muted-foreground">
            Không có tour phù hợp bộ lọc.
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
                Thử lại
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
              {loading || isPending ? 'Đang tải…' : 'Tải thêm 6 tour'}
            </button>
          ) : cards.length > 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              Đã hiển thị hết tour phù hợp.
            </p>
          ) : null}
          <div aria-hidden="true" className="h-px" ref={sentinelRef} />
        </div>
      </section>
    </div>
  )
}
