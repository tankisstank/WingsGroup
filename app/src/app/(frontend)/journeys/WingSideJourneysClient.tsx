'use client'

import { ArrowRightIcon } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import React, { useEffect, useMemo } from 'react'

import { SiteLink } from '@/components/SiteLink'
import type { DiscoveryContext } from '@/tours/discoveryCore'
import { discoveryDurationCodes, stripDiscoveryQueryMeta } from '@/tours/discoveryCore'
import { buildTourDetailDiscoveryHref, buildTourEnquiryHref } from '@/tours/enquiryContext'
import {
  destinationLabels,
  durationLabels,
  getWingSideJourneysCopy,
  styleLabels,
  type WingSideJourneyLocale,
} from '@/tours/journeysCopy'
import { tourDestinationOptions, tourTravelStyleOptions } from '@/tours/taxonomy'
import { replaceDocumentLocation } from '@/utilities/fullDocumentNavigation'
import { useSitePath } from '@/utilities/useSitePath'

import './journeys.css'

const fieldOrder = ['destination', 'style', 'duration'] as const

const journeysNavigationRestoreKey = 'wingsside:journeys:navigation-restore'

type JourneyFilterName = (typeof fieldOrder)[number]

type Props = {
  context: DiscoveryContext
  locale: WingSideJourneyLocale
}

export const WingSideJourneysClient = ({ context, locale }: Props) => {
  const copy = getWingSideJourneysCopy(locale)
  const toSitePath = useSitePath()
  const searchParams = useSearchParams()
  const current = context.query
  const normalizedQuery = stripDiscoveryQueryMeta(current)

  const planHref = buildTourEnquiryHref({
    basePath: '/plan-your-trip',
    context: { discovery: normalizedQuery, source: 'journeys' },
    intent: 'inquiry',
  })
  const contactHref = buildTourEnquiryHref({
    basePath: '/contact-us',
    context: { discovery: normalizedQuery, source: 'journeys' },
    intent: 'contact',
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    let rawMarker: string | null = null
    try {
      rawMarker = window.sessionStorage.getItem(journeysNavigationRestoreKey)
      window.sessionStorage.removeItem(journeysNavigationRestoreKey)
    } catch {
      return
    }
    if (!rawMarker) return

    try {
      const marker = JSON.parse(rawMarker) as { focusName?: string; href?: string; scrollY?: number }
      const currentHref = `${window.location.pathname}${window.location.search}`
      if (marker.href !== currentHref) return

      const focusName = marker.focusName as JourneyFilterName
      if (fieldOrder.includes(focusName)) {
        document.querySelector<HTMLSelectElement>(`select[name="${focusName}"]`)?.focus()
      }

      if (typeof marker.scrollY === 'number') {
        window.scrollTo(0, marker.scrollY)
      }
    } catch {
      // Ignore stale or malformed restore markers from older sessions.
    }
  }, [])

  const replaceQuery = (key: JourneyFilterName, value: string) => {
    const next = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : searchParams?.toString(),
    )
    if (value) next.set(key, value)
    else next.delete(key)
    const ordered = new URLSearchParams()
    for (const paramKey of fieldOrder) {
      const paramValue = next.get(paramKey)
      if (paramValue) ordered.set(paramKey, paramValue)
    }
    const pathname = toSitePath('/journeys')
    const query = ordered.toString()
    const href = query ? `${pathname}?${query}` : pathname
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(
          journeysNavigationRestoreKey,
          JSON.stringify({ focusName: key, href, scrollY: window.scrollY }),
        )
      } catch {
        // Navigation correctness must not depend on restore marker storage.
      }
      replaceDocumentLocation(href)
    }
  }

  const status = useMemo(() => {
    const notices = []
    if (current.unknownValueCount > 0) notices.push(copy.invalidNotice)
    if (context.result.relaxed) {
      notices.push(`${copy.relaxedPrefix} ${copy.relaxed[context.result.relaxed.removed]}.`)
    }
    return notices.length > 0 ? notices.join(' ') : null
  }, [context.result.relaxed, copy, current.unknownValueCount])

  return (
    <div className="ws-journeys" data-testid="wingsside-journeys">
      <section className="ws-journeys__hero" data-testid="journeys-hero">
        <div className="ws-journeys__hero-copy">
          <p className="kicker">WingSide</p>
          <h1>{copy.title}</h1>
          <p>{copy.metaDescription}</p>
          <div className="ws-journeys__actions">
            <SiteLink className="btn btn-primary" href={planHref}>
              {copy.plan}
            </SiteLink>
            <SiteLink className="btn btn-ghost" href={contactHref}>
              {copy.contact}
            </SiteLink>
          </div>
        </div>
      </section>

      <section aria-label={copy.filters} className="ws-journeys__filters">
        <FilterSelect
          allLabel={copy.all}
          label={copy.destination}
          name="destination"
          onChange={replaceQuery}
          options={tourDestinationOptions.map(({ value }) => ({
            label: destinationLabels[locale][value],
            value,
          }))}
          value={normalizedQuery.destination || ''}
        />
        <FilterSelect
          allLabel={copy.all}
          label={copy.style}
          name="style"
          onChange={replaceQuery}
          options={tourTravelStyleOptions.map(({ value }) => ({
            label: styleLabels[locale][value],
            value,
          }))}
          value={normalizedQuery.style || ''}
        />
        <FilterSelect
          allLabel={copy.all}
          label={copy.duration}
          name="duration"
          onChange={replaceQuery}
          options={discoveryDurationCodes.map((value) => ({
            label: durationLabels[locale][value],
            value,
          }))}
          value={normalizedQuery.duration || ''}
        />
        <SiteLink className="ws-journeys__reset" href="/journeys">
          {copy.reset}
        </SiteLink>
      </section>

      {status ? (
        <p aria-live="polite" className="ws-journeys__notice" data-testid="journeys-notice">
          {status}
        </p>
      ) : null}

      <section className="ws-journeys__results" aria-labelledby="journeys-results-title">
        <div className="ws-journeys__results-head">
          <p className="kicker">{copy.results}</p>
          <h2 id="journeys-results-title">{context.result.total}</h2>
        </div>
        {context.result.items.length ? (
          <div className="ws-journeys__grid">
            {context.result.items.map((item) => (
              <SiteLink
                className="ws-journeys-card"
                href={buildTourDetailDiscoveryHref(item.href, normalizedQuery)}
                key={item.id}
              >
                <span className="ws-journeys-card__media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={item.hero.alt} decoding="async" loading="lazy" src={item.hero.url} />
                </span>
                <span className="ws-journeys-card__body">
                  <span className="ws-journeys-card__meta">
                    {formatJourneyDuration(item.duration, locale)}
                  </span>
                  <strong>{item.title}</strong>
                  <span>{item.summary}</span>
                  <span className="ws-journeys-card__price">
                    <span>{formatJourneyPrice(item.price, locale)}</span>
                    <small>{priceHonestyCopy[locale] || priceHonestyCopy.en}</small>
                  </span>
                  <span className="ws-journeys-card__chips">
                    {item.destinationTags.slice(0, 2).map((tag) => (
                      <i key={tag}>{destinationLabels[locale][tag]}</i>
                    ))}
                    {item.travelStyles.slice(0, 2).map((tag) => (
                      <i key={tag}>{styleLabels[locale][tag]}</i>
                    ))}
                  </span>
                  <span className="ws-journeys-card__action">
                    {copy.view}
                    <ArrowRightIcon aria-hidden="true" />
                  </span>
                </span>
              </SiteLink>
            ))}
          </div>
        ) : (
          <div className="ws-journeys__empty" data-testid="journeys-empty">
            <h2>{copy.emptyTitle}</h2>
            <p>{copy.emptyBody}</p>
            <div className="ws-journeys__actions">
              <SiteLink className="btn btn-primary" href={planHref}>
                {copy.plan}
              </SiteLink>
              <SiteLink className="btn btn-ghost" href={contactHref}>
                {copy.contact}
              </SiteLink>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

const FilterSelect = ({
  allLabel,
  label,
  name,
  onChange,
  options,
  value,
}: {
  allLabel: string
  label: string
  name: 'destination' | 'duration' | 'style'
  onChange: (name: 'destination' | 'duration' | 'style', value: string) => void
  options: Array<{ label: string; value: string }>
  value: string
}) => (
  <label className="ws-journeys-filter">
    <span>{label}</span>
    <select
      aria-label={label}
      name={name}
      onChange={(event) => onChange(name, event.target.value)}
      value={value}
    >
      <option value="">{allLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
)

const formatJourneyDuration = (
  duration: { days: number; nights: null | number },
  locale: WingSideJourneyLocale,
) => {
  if (locale === 'vi') {
    return duration.nights == null
      ? `${duration.days} ngày`
      : `${duration.days} ngày / ${duration.nights} đêm`
  }

  const copyByLocale = {
    en: { days: 'days', nights: 'nights' },
    es: { days: 'días', nights: 'noches' },
    it: { days: 'giorni', nights: 'notti' },
    pt: { days: 'dias', nights: 'noites' },
    vi: { days: 'ngày', nights: 'đêm' },
  } as const
  const units = copyByLocale[locale] || copyByLocale.en

  return duration.nights == null
    ? `${duration.days} ${units.days}`
    : `${duration.days} ${units.days} / ${duration.nights} ${units.nights}`
}

const priceCopy = {
  en: { from: 'From', onRequest: 'Price on request' },
  es: { from: 'Desde', onRequest: 'Precio bajo solicitud' },
  it: { from: 'Da', onRequest: 'Prezzo su richiesta' },
  pt: { from: 'Desde', onRequest: 'Preco sob consulta' },
  vi: { from: 'Gia tu', onRequest: 'Gia theo yeu cau' },
} as const

const priceHonestyCopy = {
  en: 'Final price is confirmed before any hold.',
  es: 'El precio final se confirma antes de cualquier reserva.',
  it: 'Il prezzo finale viene confermato prima di qualsiasi opzione.',
  pt: 'O preco final e confirmado antes de qualquer bloqueio.',
  vi: 'Gia cuoi cung duoc xac nhan truoc khi giu cho.',
} as const

const localeNumberFormat = {
  en: 'en-US',
  es: 'es-ES',
  it: 'it-IT',
  pt: 'pt-PT',
  vi: 'vi-VN',
} as const

const formatJourneyPrice = (
  price: DiscoveryContext['result']['items'][number]['price'],
  locale: WingSideJourneyLocale,
) => {
  const copy = priceCopy[locale] || priceCopy.en
  if (price.kind === 'on-request') return copy.onRequest

  try {
    const value = new Intl.NumberFormat(localeNumberFormat[locale] || localeNumberFormat.en, {
      currency: price.currency,
      maximumFractionDigits: 0,
      style: 'currency',
    }).format(price.value)

    return `${copy.from} ${value}`
  } catch {
    return `${copy.from} ${price.currency} ${price.value}`
  }
}
