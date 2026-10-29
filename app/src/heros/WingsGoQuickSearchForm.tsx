'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

import {
  WINGSGO_CATALOG_MARKETS,
  type WingsGoCatalogFilters,
} from '@/tours/wingsGoCatalog'
import { getWingsGoCatalogCopy } from '@/tours/wingsGoCatalogCopy'

export const WINGSGO_MARKET_LABELS: Record<string, { en: string; vi: string }> = {
  cambodia: { en: 'Cambodia', vi: 'Campuchia' },
  china: { en: 'China', vi: 'Trung Quốc' },
  indochina: { en: 'Indochina', vi: 'Đông Dương' },
  japan: { en: 'Japan', vi: 'Nhật Bản' },
  korea: { en: 'South Korea', vi: 'Hàn Quốc' },
  laos: { en: 'Laos', vi: 'Lào' },
  myanmar: { en: 'Myanmar', vi: 'Myanmar' },
  other: { en: 'Other destinations', vi: 'Tuyến khác' },
  thailand: { en: 'Thailand', vi: 'Thái Lan' },
  vietnam: { en: 'Vietnam', vi: 'Việt Nam' },
}

export type MonthOption = {
  label: string
  value: string
}

export const WingsGoQuickSearchForm: React.FC<{
  initialFilters?: WingsGoCatalogFilters
  locale?: string | null
  monthOptions: MonthOption[]
}> = ({ initialFilters, locale = 'vi', monthOptions }) => {
  const router = useRouter()
  const copy = getWingsGoCatalogCopy(locale)
  const isEn = locale === 'en'

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)

    const market = (formData.get('market') as string)?.trim()
    const departureMonth = (formData.get('departureMonth') as string)?.trim()
    const season = (formData.get('season') as string)?.trim()

    const params = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : '',
    )

    if (market) {
      params.set('market', market)
    } else {
      params.delete('market')
    }

    if (departureMonth) {
      params.set('departureMonth', departureMonth)
    } else {
      params.delete('departureMonth')
    }

    if (season) {
      params.set('season', season)
    } else {
      params.delete('season')
    }

    // Drop pagination cursor & offset when submitting new filters
    params.delete('cursor')
    params.delete('offset')

    const queryString = params.toString()
    const basePath = isEn ? '/en/tour' : '/tour'
    const targetUrl = queryString ? `${basePath}?${queryString}` : basePath

    router.push(targetUrl, { scroll: false })
  }

  return (
    <form
      aria-label={copy.quickSearchTitle}
      className="rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm backdrop-blur-xs md:p-5"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
          <span>{copy.quickSearchMarketLabel}</span>
          <select
            aria-label={copy.quickSearchMarketLabel}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-[var(--site-brand)] focus:outline-hidden"
            defaultValue={initialFilters?.market || ''}
            name="market"
          >
            <option value="">{copy.quickSearchMarketAll}</option>
            {WINGSGO_CATALOG_MARKETS.map((m) => (
              <option key={m} value={m}>
                {WINGSGO_MARKET_LABELS[m]?.[isEn ? 'en' : 'vi'] || m}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
          <span>{copy.quickSearchMonthLabel}</span>
          <select
            aria-label={copy.quickSearchMonthLabel}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-[var(--site-brand)] focus:outline-hidden"
            defaultValue={initialFilters?.departureMonth || ''}
            name="departureMonth"
          >
            <option value="">{copy.quickSearchMonthAll}</option>
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
          <span>{copy.quickSearchSeasonLabel}</span>
          <select
            aria-label={copy.quickSearchSeasonLabel}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-[var(--site-brand)] focus:outline-hidden"
            defaultValue={initialFilters?.season || ''}
            name="season"
          >
            <option value="">{copy.quickSearchSeasonAll}</option>
            <option value="spring">{copy.seasonSpring}</option>
            <option value="summer">{copy.seasonSummer}</option>
            <option value="autumn">{copy.seasonAutumn}</option>
            <option value="winter">{copy.seasonWinter}</option>
          </select>
        </label>

        <div>
          <button
            className="h-10 w-full rounded-lg bg-[var(--site-brand,#e11d48)] px-4 text-sm font-semibold text-white shadow-xs transition-opacity hover:opacity-90 focus:outline-hidden"
            type="submit"
          >
            {copy.quickSearchSubmit}
          </button>
        </div>
      </div>
    </form>
  )
}
