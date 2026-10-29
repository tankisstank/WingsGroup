/* eslint-disable @next/next/no-img-element */
'use client'

import React, { useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { PromotionPrice } from './PromotionPrice'
import type { WingsGoCatalogMarketSummary } from './wingsGoCatalog'
import {
  getWingsGoCatalogCopy,
  resolveWingsGoCopyLocale,
  WINGSGO_MARKET_LABELS,
} from './wingsGoCatalogCopy'
import { cn } from '@/utilities/ui'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'

export type WingsGoMarketTilesProps = {
  locale?: SupportedLocaleCode | string | null
  markets?: WingsGoCatalogMarketSummary[]
  selectedMarket?: string
}

export const WingsGoMarketTiles: React.FC<WingsGoMarketTilesProps> = ({
  locale = 'vi',
  markets = [],
  selectedMarket,
}) => {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  if (!markets || markets.length === 0) {
    return null
  }

  const copyLocale = resolveWingsGoCopyLocale(locale)
  const copy = getWingsGoCatalogCopy(copyLocale)

  const handleMarketClick = (marketCode: string) => {
    const nextMarket = selectedMarket === marketCode ? '' : marketCode
    const params = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : '',
    )

    if (nextMarket) {
      params.set('market', nextMarket)
    } else {
      params.delete('market')
    }
    params.delete('offset')
    params.delete('cursor')

    const query = params.toString()
    const targetUrl = query ? `${pathname}?${query}` : pathname

    startTransition(() => {
      router.replace(targetUrl, { scroll: false })
    })

    if (typeof window !== 'undefined') {
      const targetEl = document.getElementById('wingsgo-all-tours')
      if (targetEl) {
        const prefersReduced =
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const yOffset = -40
        const scrollY = window.scrollY ?? window.pageYOffset ?? 0
        const y = targetEl.getBoundingClientRect().top + scrollY + yOffset
        window.scrollTo({
          behavior: prefersReduced ? 'auto' : 'smooth',
          top: Math.max(0, y),
        })
      }
    }
  }

  return (
    <section aria-labelledby="wingsgo-market-tiles-heading" className="space-y-5">
      <div className="flex flex-col gap-1">
        <p className="site-brand-kicker text-xs font-semibold uppercase tracking-[0.18em]">
          {copy.marketTilesKicker}
        </p>
        <h2
          className="text-2xl font-bold tracking-tight text-foreground md:text-3xl"
          id="wingsgo-market-tiles-heading"
        >
          {copy.marketTilesTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          {copy.marketTilesDescription}
        </p>
      </div>

      <div
        aria-label={copy.marketTilesTitle}
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        role="group"
      >
        {markets.map((item) => {
          const isSelected = selectedMarket === item.market
          const label = WINGSGO_MARKET_LABELS[item.market]?.[copyLocale] || item.market

          return (
            <button
              aria-pressed={isSelected}
              className={cn(
                'group relative flex min-h-[140px] flex-col justify-end overflow-hidden rounded-[20px] border p-4 text-left shadow-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-brand)] motion-reduce:transition-none',
                isSelected
                  ? 'border-[var(--site-brand)] ring-2 ring-[var(--site-brand)] shadow-md'
                  : 'border-border/70 bg-card hover:-translate-y-0.5 hover:border-[var(--site-brand)]/50 hover:shadow-md motion-reduce:hover:translate-y-0',
              )}
              key={item.market}
              onClick={() => handleMarketClick(item.market)}
              type="button"
            >
              {item.image?.url ? (
                <>
                  <img
                    alt={item.image.alt || label}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    src={item.image.url}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent" />
                </>
              ) : (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-br from-[var(--site-brand)]/20 via-muted to-muted/80"
                >
                  <svg
                    className="absolute -right-2 -bottom-2 h-20 w-20 text-[var(--site-brand)]/15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-.778.099-1.533.284-2.253"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}

              <div
                className={cn(
                  'relative z-10 space-y-1',
                  item.image?.url ? 'text-white' : 'text-foreground',
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <h3 className="text-base font-bold leading-tight drop-shadow-xs">
                    {label}
                  </h3>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      item.image?.url
                        ? 'bg-black/40 text-white/90 backdrop-blur-xs'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {copy.marketToursCount(item.count)}
                  </span>
                </div>

                <p
                  className={cn(
                    'text-xs',
                    item.image?.url ? 'text-white/80' : 'text-muted-foreground',
                  )}
                >
                  <span className="font-medium uppercase tracking-wider text-[10px]">
                    {copy.marketLowestPriceFrom}{' '}
                  </span>
                  {item.lowestPrice ? (
                    <PromotionPrice
                      contactLabel={copy.contactPriceLabel}
                      currency={item.lowestPrice.currency}
                      originalPrice={item.lowestPrice.originalPrice}
                      price={item.lowestPrice.value}
                    />
                  ) : (
                    copy.contactPriceLabel
                  )}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
