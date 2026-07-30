'use client'

import { ArrowRightIcon } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useMemo, useRef, useState, useTransition } from 'react'

import { SiteLink } from '@/components/SiteLink'
import type { DiscoveryContext } from '@/tours/discoveryCore'
import {
  buildDiscoveryHref,
  discoveryDurationCodes,
  stripDiscoveryQueryMeta,
} from '@/tours/discoveryCore'
import { buildTourDetailDiscoveryHref, buildTourEnquiryHref } from '@/tours/enquiryContext'
import {
  destinationLabels,
  durationLabels,
  getWingSideJourneysCopy,
  styleLabels,
  type WingSideJourneyLocale,
} from '@/tours/journeysCopy'
import { tourDestinationOptions, tourTravelStyleOptions } from '@/tours/taxonomy'
import { useSitePath } from '@/utilities/useSitePath'

import './journeys.css'

const fieldOrder = ['q', 'type', 'destination', 'style', 'duration'] as const

const journeysNavigationRestoreKey = 'wingsside:journeys:navigation-restore'
const initialVisibleJourneyCount = 8

type JourneyFilterName = (typeof fieldOrder)[number]

type Props = {
  context: DiscoveryContext
  locale: WingSideJourneyLocale
}

export const WingSideJourneysClient = ({ context, locale }: Props) => {
  const copy = getWingSideJourneysCopy(locale)
  const uxCopy = journeyUxCopy[locale]
  const router = useRouter()
  const toSitePath = useSitePath()
  const searchParams = useSearchParams()
  const pendingSearchRef = useRef(searchParams?.toString() || '')
  const [isPending, startTransition] = useTransition()
  const [sort, setSort] = useState<'duration' | 'recommended'>('recommended')
  const [visibleCount, setVisibleCount] = useState(initialVisibleJourneyCount)
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
  const removeStyleHref = normalizedQuery.style
    ? buildDiscoveryHref({
        ...(normalizedQuery.destination ? { destination: normalizedQuery.destination } : {}),
        ...(normalizedQuery.duration ? { duration: normalizedQuery.duration } : {}),
      })
    : null
  const activeFilters = [
    normalizedQuery.q ? `“${normalizedQuery.q}”` : null,
    normalizedQuery.type ? (normalizedQuery.type === 'group' ? 'Small group' : 'Private') : null,
    normalizedQuery.destination ? destinationLabels[locale][normalizedQuery.destination] : null,
    normalizedQuery.style ? styleLabels[locale][normalizedQuery.style] : null,
    normalizedQuery.duration ? durationLabels[locale][normalizedQuery.duration] : null,
  ].filter((label): label is string => Boolean(label))

  const filteredItems = useMemo(() => {
    const matches = [...context.result.items]

    if (sort === 'duration') {
      matches.sort((left, right) => left.duration.days - right.duration.days)
    }

    return matches
  }, [context.result.items, sort])
  const visibleItems = filteredItems.slice(0, visibleCount)
  const resultSummary = buildResultSummary(
    filteredItems.length,
    activeFilters,
    uxCopy.journey,
    uxCopy.journeys,
    uxCopy.preferencesConnector,
  )

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
      const marker = JSON.parse(rawMarker) as {
        focusName?: string
        href?: string
        scrollY?: number
      }
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

  useEffect(() => {
    pendingSearchRef.current = searchParams?.toString() || ''
  }, [searchParams])

  useEffect(() => {
    setVisibleCount(initialVisibleJourneyCount)
  }, [context.result.items])

  const replaceQuery = (key: JourneyFilterName, value: string) => {
    const next = new URLSearchParams(pendingSearchRef.current)
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
    pendingSearchRef.current = query
    if (typeof window !== 'undefined') {
      startTransition(() => router.replace(href, { scroll: false }))
    }
  }

  const status = useMemo(() => {
    const notices = []
    if (current.unknownValueCount > 0) notices.push(copy.invalidNotice)
    return notices.length > 0 ? notices.join(' ') : null
  }, [copy, current.unknownValueCount])

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

      <section aria-busy={isPending} aria-label={copy.filters} className="ws-journeys__filters">
        <label className="ws-journeys-filter ws-journeys-filter--search">
          <span>{uxCopy.search}</span>
          <input
            aria-label={uxCopy.search}
            maxLength={80}
            name="q"
            onChange={(event) => replaceQuery('q', event.target.value)}
            placeholder={uxCopy.searchPlaceholder}
            type="search"
            value={normalizedQuery.q || ''}
          />
        </label>
        <FilterSelect
          allLabel="All tours"
          label="Tour type"
          name="type"
          onChange={replaceQuery}
          options={[
            { label: 'Small group', value: 'group' },
            { label: 'Private', value: 'private' },
          ]}
          value={normalizedQuery.type || ''}
        />
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

      <p aria-live="polite" className="ws-journeys__sr-status" role="status">
        {isPending ? uxCopy.updating : resultSummary}
      </p>

      {status ? (
        <p aria-live="polite" className="ws-journeys__notice" data-testid="journeys-notice">
          {status}
        </p>
      ) : null}

      {activeFilters.length > 0 ? (
        <div
          aria-label={copy.activeFilters}
          className="ws-journeys__active-filters"
          data-testid="journeys-active-filters"
        >
          {activeFilters.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      ) : null}

      <section
        aria-busy={isPending}
        aria-labelledby="journeys-results-title"
        className="ws-journeys__results"
      >
        <div className="ws-journeys__results-head">
          <div>
            <p className="kicker">{copy.results}</p>
            <h2 id="journeys-results-title">{resultSummary}</h2>
          </div>
          <div className="ws-journeys__tools">
            <label>
              <span>{uxCopy.sort}</span>
              <select
                onChange={(event) => {
                  setSort(event.target.value as 'duration' | 'recommended')
                  setVisibleCount(initialVisibleJourneyCount)
                }}
                value={sort}
              >
                <option value="recommended">{uxCopy.recommended}</option>
                <option value="duration">{uxCopy.duration}</option>
              </select>
            </label>
          </div>
        </div>
        {filteredItems.length ? (
          <>
            <div className="ws-journeys__grid" data-pending={isPending ? 'true' : undefined}>
              {visibleItems.map((item) => (
                <SiteLink
                  className="ws-journeys-card"
                  href={buildTourDetailDiscoveryHref(item.href, normalizedQuery)}
                  key={item.id}
                >
                  <span className="ws-journeys-card__media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt={item.hero.alt} decoding="async" loading="lazy" src={item.hero.url} />
                    <i className={`ws-journeys-card__type ws-journeys-card__type--${item.tourType || 'private'}`}>
                      {item.tourType === 'group' ? 'Small group' : 'Private'}
                    </i>
                  </span>
                  <span className="ws-journeys-card__body">
                    <span className="ws-journeys-card__meta">
                      {item.routeLabel ? `${item.routeLabel} · ` : ''}{formatJourneyDuration(item.duration, locale)}
                    </span>
                    <strong>{item.title}</strong>
                    <span>{item.summary}</span>
                    <span className="ws-journeys-card__price">
                      <span>{item.tourType === 'group' ? 'Schedule on request' : 'Tailor-made quote'}</span>
                      <small>{item.tourType === 'group' ? 'Dates and availability are confirmed with the team.' : 'Designed around your dates and service level.'}</small>
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
                      {item.tourType === 'group' ? 'Check availability' : 'Request quote'}
                      <ArrowRightIcon aria-hidden="true" />
                    </span>
                  </span>
                </SiteLink>
              ))}
            </div>
            {visibleItems.length < filteredItems.length ? (
              <div className="ws-journeys__load-more">
                <button
                  className="btn btn-ghost"
                  onClick={() => setVisibleCount((count) => count + initialVisibleJourneyCount)}
                  type="button"
                >
                  {uxCopy.loadMore}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="ws-journeys__empty" data-testid="journeys-empty">
            <h2>{copy.emptyTitle}</h2>
            <p>{copy.emptyBody}</p>
            <div className="ws-journeys__actions">
              <SiteLink className="btn btn-primary" href={planHref}>
                {copy.shareBrief}
              </SiteLink>
              {removeStyleHref && normalizedQuery.style ? (
                <SiteLink className="btn btn-ghost" href={removeStyleHref}>
                  {copy.removeStyle} {styleLabels[locale][normalizedQuery.style]}
                </SiteLink>
              ) : null}
              <SiteLink className="btn btn-ghost" href="/journeys">
                {copy.clearAll}
              </SiteLink>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

const journeyUxCopy = {
  en: {
    clearSearch: 'Clear search',
    duration: 'Duration (shortest first)',
    journey: 'journey',
    journeys: 'journeys',
    loadMore: 'Load more journeys',
    noSearchBody: 'Try a place, journey name, or travel style.',
    noSearchTitle: 'No journeys match this search.',
    preferencesConnector: 'for',
    recommended: 'Recommended',
    search: 'Search journeys',
    searchPlaceholder: 'Place, name, or style',
    sort: 'Sort',
    updating: 'Updating journey results…',
  },
  vi: {
    clearSearch: 'Xóa tìm kiếm',
    duration: 'Thời lượng (ngắn trước)',
    journey: 'hành trình',
    journeys: 'hành trình',
    loadMore: 'Xem thêm hành trình',
    noSearchBody: 'Hãy thử tên điểm đến, hành trình hoặc phong cách du lịch.',
    noSearchTitle: 'Không có hành trình phù hợp với tìm kiếm này.',
    preferencesConnector: 'cho',
    recommended: 'Đề xuất',
    search: 'Tìm hành trình',
    searchPlaceholder: 'Điểm đến, tên hoặc phong cách',
    sort: 'Sắp xếp',
    updating: 'Đang cập nhật kết quả hành trình…',
  },
  it: {
    clearSearch: 'Cancella ricerca',
    duration: 'Durata (più breve prima)',
    journey: 'viaggio',
    journeys: 'viaggi',
    loadMore: 'Mostra altri viaggi',
    noSearchBody: 'Prova una destinazione, il nome di un viaggio o uno stile.',
    noSearchTitle: 'Nessun viaggio corrisponde alla ricerca.',
    preferencesConnector: 'per',
    recommended: 'Consigliati',
    search: 'Cerca viaggi',
    searchPlaceholder: 'Luogo, nome o stile',
    sort: 'Ordina',
    updating: 'Aggiornamento dei risultati…',
  },
  es: {
    clearSearch: 'Borrar búsqueda',
    duration: 'Duración (más corta primero)',
    journey: 'viaje',
    journeys: 'viajes',
    loadMore: 'Ver más viajes',
    noSearchBody: 'Prueba con un destino, el nombre de un viaje o un estilo.',
    noSearchTitle: 'Ningún viaje coincide con la búsqueda.',
    preferencesConnector: 'para',
    recommended: 'Recomendados',
    search: 'Buscar viajes',
    searchPlaceholder: 'Destino, nombre o estilo',
    sort: 'Ordenar',
    updating: 'Actualizando los resultados…',
  },
  pt: {
    clearSearch: 'Limpar pesquisa',
    duration: 'Duração (mais curta primeiro)',
    journey: 'viagem',
    journeys: 'viagens',
    loadMore: 'Ver mais viagens',
    noSearchBody: 'Experimente um destino, o nome de uma viagem ou um estilo.',
    noSearchTitle: 'Nenhuma viagem corresponde à pesquisa.',
    preferencesConnector: 'para',
    recommended: 'Recomendadas',
    search: 'Pesquisar viagens',
    searchPlaceholder: 'Destino, nome ou estilo',
    sort: 'Ordenar',
    updating: 'A atualizar os resultados…',
  },
} as const

const buildResultSummary = (
  count: number,
  activeFilters: string[],
  singular: string,
  plural: string,
  connector: string,
) =>
  `${count} ${count === 1 ? singular : plural}${
    activeFilters.length > 0 ? ` ${connector} ${activeFilters.join(' · ')}` : ''
  }`

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
  name: 'destination' | 'duration' | 'style' | 'type'
  onChange: (name: JourneyFilterName, value: string) => void
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
