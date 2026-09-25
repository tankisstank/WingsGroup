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
  const v2 = journeyV2Copy[locale]
  const tourTypeCopy = journeyTourTypeCopy[locale]
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
  const privatePlanHref = buildTourEnquiryHref({
    basePath: '/plan-your-trip',
    context: { discovery: { ...normalizedQuery, type: 'private' }, source: 'journeys' },
    intent: 'request-quote',
  })
  const removeStyleHref = normalizedQuery.style
    ? buildDiscoveryHref({ ...normalizedQuery, style: undefined })
    : null
  const activeFilters = [
    normalizedQuery.q ? `“${normalizedQuery.q}”` : null,
    normalizedQuery.type
      ? normalizedQuery.type === 'group'
        ? tourTypeCopy.group
        : tourTypeCopy.private
      : null,
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
          allLabel={tourTypeCopy.all}
          label={tourTypeCopy.label}
          name="type"
          onChange={replaceQuery}
          options={[
            { label: tourTypeCopy.group, value: 'group' },
            { label: tourTypeCopy.private, value: 'private' },
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
              {visibleItems.map((item) => {
                const detailHref = buildTourDetailDiscoveryHref(item.href, normalizedQuery)
                const needsContact =
                  !item.commerce && (item.tourType === 'group' || item.tourType === 'hybrid')
                const needsQuote =
                  item.tourType === 'private' || (!item.commerce && item.tourType === 'hybrid')
                const actionHref =
                  needsContact || needsQuote
                    ? buildTourEnquiryHref({
                        basePath: '/contact-us',
                        context: {
                          discovery: normalizedQuery,
                          source: 'journeys',
                          tourId: item.id,
                          tourSlug: item.slug,
                          tourTitle: item.title,
                        },
                        intent: needsQuote ? 'request-quote' : 'contact',
                      })
                    : detailHref

                return (
                  <article aria-label={item.title} className="ws-journeys-card" key={item.id}>
                    <SiteLink className="ws-journeys-card__detail" href={detailHref}>
                      <span className="ws-journeys-card__media">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={item.hero.alt}
                          decoding="async"
                          loading="lazy"
                          src={item.hero.url}
                        />
                        <i
                          className={`ws-journeys-card__type ws-journeys-card__type--${item.tourType || 'private'}`}
                        >
                          {item.tourType === 'group'
                            ? tourTypeCopy.group
                            : item.tourType === 'hybrid'
                              ? `${tourTypeCopy.group} / ${tourTypeCopy.private}`
                              : tourTypeCopy.private}
                        </i>
                      </span>
                      <span className="ws-journeys-card__body">
                        <span className="ws-journeys-card__meta">
                          {item.routeLabel ? `${item.routeLabel} · ` : ''}
                          {formatJourneyDuration(item.duration, locale)}
                        </span>
                        <strong>{item.title}</strong>
                        <span>{item.summary}</span>
                        <span className="ws-journeys-card__price">
                          <span>
                            {item.tourType === 'hybrid'
                              ? item.commerce
                                ? `${formatJourneyPrice(item.commerce.price, locale)} · ${v2.quote}`
                                : `${tourTypeCopy.group} / ${tourTypeCopy.private}`
                              : item.tourType === 'group'
                                ? item.commerce
                                  ? formatJourneyPrice(item.commerce.price, locale)
                                  : v2.schedule
                                : v2.quote}
                          </span>
                          <small>
                            {item.tourType === 'hybrid'
                              ? item.commerce
                                ? `${formatJourneyDeparture(item.commerce.departureDate, locale)} · ${item.commerce.availability} · ${v2.quoteBody}`
                                : `${v2.scheduleBody} ${v2.quoteBody}`
                              : item.tourType === 'group'
                                ? item.commerce
                                  ? `${formatJourneyDeparture(item.commerce.departureDate, locale)} · ${item.commerce.availability}`
                                  : v2.scheduleBody
                                : v2.quoteBody}
                          </small>
                        </span>
                        <span className="ws-journeys-card__chips">
                          {item.destinationTags.slice(0, 2).map((tag) => (
                            <i key={tag}>{destinationLabels[locale][tag]}</i>
                          ))}
                          {item.travelStyles.slice(0, 2).map((tag) => (
                            <i key={tag}>{styleLabels[locale][tag]}</i>
                          ))}
                        </span>
                      </span>
                    </SiteLink>
                    <SiteLink className="ws-journeys-card__action" href={actionHref}>
                      {item.tourType === 'hybrid'
                        ? item.commerce
                          ? v2.departures
                          : v2.requestQuote
                        : item.tourType === 'group'
                          ? item.commerce?.canBook
                            ? v2.book
                            : item.commerce
                              ? v2.departures
                              : v2.availability
                          : v2.requestQuote}
                      <ArrowRightIcon aria-hidden="true" />
                    </SiteLink>
                  </article>
                )
              })}
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
      <section className="ws-journeys__paths">
        <div>
          <p className="kicker">{v2.twoWays}</p>
          <h2>{v2.freedom}</h2>
          <p>{v2.pathBody}</p>
          <div className="ws-journeys__actions">
            <SiteLink
              className="btn btn-primary"
              href={buildDiscoveryHref({ ...normalizedQuery, type: 'group' })}
            >
              {v2.groups}
            </SiteLink>
            <SiteLink
              className="btn btn-ghost"
              href={privatePlanHref}
            >
              {v2.private}
            </SiteLink>
          </div>
        </div>
        <ol>
          <li>
            <strong>{v2.groupTitle}</strong>
            <span>{v2.groupBody}</span>
          </li>
          <li>
            <strong>{v2.privateTitle}</strong>
            <span>{v2.privateBody}</span>
          </li>
        </ol>
      </section>
      <section className="ws-journeys__destinations">
        <p className="kicker">{v2.explore}</p>
        <h2>{v2.landscape}</h2>
        <div>
          {tourDestinationOptions.slice(0, 3).map(({ value }) => (
            <SiteLink
              key={value}
              href={buildDiscoveryHref({ ...normalizedQuery, destination: value })}
            >
              {destinationLabels[locale][value]}
            </SiteLink>
          ))}
        </div>
      </section>
      <section className="ws-journeys__faq">
        <div>
          <p className="kicker">{v2.before}</p>
          <h2>{v2.facts}</h2>
        </div>
        <div>
          {v2.faq.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="ws-journeys__final">
        <h2>{v2.final}</h2>
        <div className="ws-journeys__actions">
          <SiteLink
            className="btn btn-primary"
            href={buildDiscoveryHref({ ...normalizedQuery, type: 'group' })}
          >
            {v2.groups}
          </SiteLink>
          <SiteLink className="btn btn-ghost" href={privatePlanHref}>
            {v2.private}
          </SiteLink>
        </div>
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

// Five-locale contract for the type filter and card anatomy. Keeping this
// adjacent to the other Journeys contracts prevents public English leakage.
const journeyTourTypeCopy = {
  en: { all: 'All tours', group: 'Small group', label: 'Tour type', private: 'Private' },
  vi: { all: 'Tất cả tour', group: 'Nhóm nhỏ', label: 'Loại tour', private: 'Riêng tư' },
  it: { all: 'Tutti i tour', group: 'Piccolo gruppo', label: 'Tipo di tour', private: 'Privato' },
  es: { all: 'Todos los tours', group: 'Grupo pequeño', label: 'Tipo de tour', private: 'Privado' },
  pt: { all: 'Todos os tours', group: 'Grupo pequeno', label: 'Tipo de tour', private: 'Privado' },
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
  const copyByLocale = {
    en: { day: 'day', days: 'days', night: 'night', nights: 'nights' },
    es: { day: 'día', days: 'días', night: 'noche', nights: 'noches' },
    it: { day: 'giorno', days: 'giorni', night: 'notte', nights: 'notti' },
    pt: { day: 'dia', days: 'dias', night: 'noite', nights: 'noites' },
    vi: { day: 'ngày', days: 'ngày', night: 'đêm', nights: 'đêm' },
  } as const
  const units = copyByLocale[locale]
  const formatUnit = (count: number, singular: string, plural: string) =>
    `${count} ${count === 1 ? singular : plural}`
  const days = formatUnit(duration.days, units.day, units.days)

  return duration.nights == null
    ? days
    : `${days} / ${formatUnit(duration.nights, units.night, units.nights)}`
}

const priceCopy = {
  en: { from: 'From', onRequest: 'Price on request' },
  es: { from: 'Desde', onRequest: 'Precio bajo solicitud' },
  it: { from: 'Da', onRequest: 'Prezzo su richiesta' },
  pt: { from: 'Desde', onRequest: 'Preço sob consulta' },
  vi: { from: 'Giá từ', onRequest: 'Giá theo yêu cầu' },
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

export const formatJourneyDeparture = (value: string, locale: WingSideJourneyLocale) =>
  new Intl.DateTimeFormat(localeNumberFormat[locale] || localeNumberFormat.en, {
    dateStyle: 'medium',
    // Payload stores departureDate as a day-only value. UTC preserves that
    // calendar date across SSR and every visitor timezone.
    timeZone: 'UTC',
  }).format(new Date(value))

const journeyV2Copy = {
  en: {
    availability: 'Check availability',
    before: 'Before you choose',
    book: 'Book',
    departures: 'View departures',
    explore: 'Explore by place',
    facts: 'A better choice starts with the right facts.',
    final: 'Travel together—or make it entirely yours.',
    freedom: 'Choose the freedom that fits.',
    groupBody: 'Shared departures with published facts when available.',
    groupTitle: 'Small-group tours',
    groups: 'Explore group tours',
    landscape: 'Start with a landscape.',
    pathBody: 'Join a scheduled group or shape a private route around your dates.',
    private: 'Design a private tour',
    privateBody: 'Flexible dates, pace and service level.',
    privateTitle: 'Private tours',
    quote: 'Tailor-made quote',
    quoteBody: 'Designed around your dates and service level.',
    requestQuote: 'Request quote',
    schedule: 'Schedule on request',
    scheduleBody: 'Dates and availability are confirmed with the team.',
    twoWays: 'Two ways to travel',
    faq: [
      {
        q: 'What changes between a small-group and private tour?',
        a: 'Groups use published departures; private journeys are shaped around you.',
      },
      {
        q: 'Will my filters remain when I contact WingSide?',
        a: 'Yes. Your validated journey context is retained.',
      },
    ],
  },
  vi: {
    availability: 'Kiểm tra chỗ',
    before: 'Trước khi chọn',
    book: 'Đặt chỗ',
    departures: 'Xem khởi hành',
    explore: 'Khám phá theo nơi chốn',
    facts: 'Lựa chọn tốt hơn bắt đầu từ thông tin đúng.',
    final: 'Đi cùng nhau—hoặc theo cách của riêng bạn.',
    freedom: 'Chọn sự tự do phù hợp.',
    groupBody: 'Khởi hành chung với thông tin đã công bố.',
    groupTitle: 'Tour nhóm nhỏ',
    groups: 'Khám phá tour nhóm',
    landscape: 'Bắt đầu từ một vùng đất.',
    pathBody: 'Tham gia nhóm hoặc thiết kế hành trình riêng.',
    private: 'Thiết kế tour riêng',
    privateBody: 'Linh hoạt ngày đi, nhịp độ và dịch vụ.',
    privateTitle: 'Tour riêng',
    quote: 'Báo giá thiết kế riêng',
    quoteBody: 'Thiết kế theo ngày đi và dịch vụ của bạn.',
    requestQuote: 'Yêu cầu báo giá',
    schedule: 'Lịch theo yêu cầu',
    scheduleBody: 'Đội ngũ xác nhận ngày và tình trạng chỗ.',
    twoWays: 'Hai cách để du lịch',
    faq: [
      {
        q: 'Tour nhóm và tour riêng khác nhau thế nào?',
        a: 'Tour nhóm theo lịch công bố; tour riêng được thiết kế cho bạn.',
      },
      {
        q: 'Bộ lọc có được giữ khi liên hệ không?',
        a: 'Có. Ngữ cảnh hành trình đã xác thực được giữ lại.',
      },
    ],
  },
  it: {
    availability: 'Verifica disponibilità',
    before: 'Prima di scegliere',
    book: 'Prenota',
    departures: 'Vedi partenze',
    explore: 'Esplora per luogo',
    facts: 'Una scelta migliore parte dai fatti giusti.',
    final: 'Viaggia insieme—o rendilo completamente tuo.',
    freedom: 'Scegli la libertà giusta.',
    groupBody: 'Partenze condivise con fatti pubblicati.',
    groupTitle: 'Tour per piccoli gruppi',
    groups: 'Esplora tour di gruppo',
    landscape: 'Inizia da un paesaggio.',
    pathBody: 'Unisciti a un gruppo o crea un itinerario privato.',
    private: 'Crea un tour privato',
    privateBody: 'Date, ritmo e servizio flessibili.',
    privateTitle: 'Tour privati',
    quote: 'Preventivo su misura',
    quoteBody: 'Creato per le tue date e il tuo servizio.',
    requestQuote: 'Richiedi preventivo',
    schedule: 'Programma su richiesta',
    scheduleBody: 'Date e disponibilità sono confermate dal team.',
    twoWays: 'Due modi di viaggiare',
    faq: [
      {
        q: 'Qual è la differenza?',
        a: 'I gruppi hanno partenze pubblicate; i privati sono su misura.',
      },
      { q: 'I filtri restano?', a: 'Sì. Il contesto validato viene mantenuto.' },
    ],
  },
  es: {
    availability: 'Consultar disponibilidad',
    before: 'Antes de elegir',
    book: 'Reservar',
    departures: 'Ver salidas',
    explore: 'Explora por lugar',
    facts: 'Una mejor elección empieza con los datos adecuados.',
    final: 'Viaja en grupo—o hazlo completamente tuyo.',
    freedom: 'Elige la libertad que encaja.',
    groupBody: 'Salidas compartidas con datos publicados.',
    groupTitle: 'Tours en grupo pequeño',
    groups: 'Explorar tours en grupo',
    landscape: 'Empieza con un paisaje.',
    pathBody: 'Únete a un grupo o crea una ruta privada.',
    private: 'Diseñar un tour privado',
    privateBody: 'Fechas, ritmo y servicio flexibles.',
    privateTitle: 'Tours privados',
    quote: 'Presupuesto a medida',
    quoteBody: 'Diseñado según tus fechas y servicio.',
    requestQuote: 'Solicitar presupuesto',
    schedule: 'Calendario bajo solicitud',
    scheduleBody: 'El equipo confirma fechas y disponibilidad.',
    twoWays: 'Dos formas de viajar',
    faq: [
      {
        q: '¿Cuál es la diferencia?',
        a: 'Los grupos usan salidas publicadas; los privados son a medida.',
      },
      { q: '¿Se conservan los filtros?', a: 'Sí. Se conserva el contexto validado.' },
    ],
  },
  pt: {
    availability: 'Ver disponibilidade',
    before: 'Antes de escolher',
    book: 'Reservar',
    departures: 'Ver partidas',
    explore: 'Explorar por lugar',
    facts: 'Uma escolha melhor começa com os factos certos.',
    final: 'Viaje em conjunto—ou torne-o inteiramente seu.',
    freedom: 'Escolha a liberdade certa.',
    groupBody: 'Partidas partilhadas com informação publicada.',
    groupTitle: 'Tours em pequenos grupos',
    groups: 'Explorar tours de grupo',
    landscape: 'Comece por uma paisagem.',
    pathBody: 'Junte-se a um grupo ou crie uma rota privada.',
    private: 'Criar tour privado',
    privateBody: 'Datas, ritmo e serviço flexíveis.',
    privateTitle: 'Tours privados',
    quote: 'Orçamento personalizado',
    quoteBody: 'Criado para as suas datas e serviço.',
    requestQuote: 'Pedir orçamento',
    schedule: 'Calendário sob consulta',
    scheduleBody: 'A equipa confirma datas e disponibilidade.',
    twoWays: 'Duas formas de viajar',
    faq: [
      {
        q: 'Qual é a diferença?',
        a: 'Grupos usam partidas publicadas; privados são personalizados.',
      },
      { q: 'Os filtros são mantidos?', a: 'Sim. O contexto validado é mantido.' },
    ],
  },
} as const
