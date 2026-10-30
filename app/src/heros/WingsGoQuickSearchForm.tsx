'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

import {
  WINGSGO_CATALOG_MARKETS,
  type WingsGoCatalogFilters,
} from '@/tours/wingsGoCatalog'
import { getWingsGoCatalogCopy, WINGSGO_MARKET_LABELS } from '@/tours/wingsGoCatalogCopy'

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

  const fieldClass =
    'block min-w-0 border-border px-4 pb-3 pt-2.5 sm:border-r sm:last:border-r-0 max-sm:border-b max-sm:last:border-b-0'
  const labelClass =
    'block text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground'
  const selectClass =
    'mt-1 min-h-[30px] w-full cursor-pointer truncate border-0 bg-transparent p-0 pr-5 text-[15px] font-semibold text-foreground focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--site-brand)]'

  return (
    <form
      aria-label={copy.quickSearchTitle}
      className="rounded-3xl border border-border bg-card p-2.5 shadow-[0_8px_24px_color-mix(in_oklch,var(--site-brand)_8%,transparent)]"
      onSubmit={handleSubmit}
    >
      <div className="grid sm:grid-cols-3">
        <label className={fieldClass}>
          <span className={labelClass}>{copy.quickSearchMarketLabel}</span>
          <select
            aria-label={copy.quickSearchMarketLabel}
            className={selectClass}
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

        <label className={fieldClass}>
          <span className={labelClass}>{copy.quickSearchMonthLabel}</span>
          <select
            aria-label={copy.quickSearchMonthLabel}
            className={selectClass}
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

        <label className={fieldClass}>
          <span className={labelClass}>{copy.quickSearchSeasonLabel}</span>
          <select
            aria-label={copy.quickSearchSeasonLabel}
            className={selectClass}
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
      </div>

      <div className="mt-1 flex justify-end border-t border-border px-1.5 pb-1 pt-2">
        <button
          className="inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-full bg-[var(--site-accent)] px-6 text-[15px] font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-brand)] focus-visible:ring-offset-2 sm:w-auto"
          type="submit"
        >
          {copy.quickSearchSubmit}
          <ArrowRight aria-hidden="true" className="h-[18px] w-[18px]" />
        </button>
      </div>
    </form>
  )
}
