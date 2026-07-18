import {
  ArrowRightIcon,
  BedDoubleIcon,
  CalendarDaysIcon,
  CheckIcon,
  Clock3Icon,
  MapPinIcon,
  UtensilsIcon,
  XIcon,
} from 'lucide-react'
import React from 'react'

import { Media } from '@/components/Media'
import { SiteLink } from '@/components/SiteLink'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'

import type { TourResolvedData } from './types'
import { buildWingSideTourViewModel, type WingSideTourViewModel } from './wingsSideTourViewModel'

const localeTag: Record<string, string> = {
  en: 'en-GB',
  es: 'es-ES',
  it: 'it-IT',
  pt: 'pt-PT',
  vi: 'vi-VN',
}

const formatDate = (value: string, locale: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(localeTag[locale] || localeTag.en, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

const formatPrice = (value: number, currency: string, locale: string) =>
  new Intl.NumberFormat(localeTag[locale] || localeTag.en, {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value)

const mediaAlt = (media: unknown, fallback: string) => {
  if (media && typeof media === 'object' && 'alt' in media) {
    const alt = String((media as { alt?: unknown }).alt || '').trim()
    if (alt) return alt
  }
  return fallback
}

const SectionTitle = ({ eyebrow, id, title }: { eyebrow: string; id?: string; title: string }) => (
  <div className="mb-7 max-w-3xl">
    <p className="site-brand-kicker text-xs font-bold uppercase tracking-[0.2em]">{eyebrow}</p>
    <h2 className="mt-2 text-3xl font-semibold leading-tight text-foreground md:text-4xl" id={id}>{title}</h2>
  </div>
)

const WingSideTourHero = ({ vm }: { vm: WingSideTourViewModel }) => (
  <section className="wingsside-tour-hero overflow-hidden border-y border-[var(--site-border)] bg-[var(--site-surface-strong)]">
    <div className={`container grid min-h-[38rem] gap-0 px-0 ${vm.heroMedia ? 'lg:grid-cols-[1.08fr_0.92fr]' : 'grid-cols-1'}`}>
      {vm.heroMedia ? (
        <div className="relative min-h-[22rem] overflow-hidden lg:min-h-full">
          <Media
            alt={mediaAlt(vm.heroMedia, vm.title)}
            fill
            imgClassName="object-cover"
            pictureClassName="absolute inset-0"
            priority
            resource={vm.heroMedia}
            size="(max-width: 1024px) 100vw, 56vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        </div>
      ) : null}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
        <p className="site-brand-kicker text-xs font-bold uppercase tracking-[0.22em]">
          {vm.copy.journey}
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.04] text-foreground md:text-5xl xl:text-6xl">
          {vm.title}
        </h1>
        {vm.summary ? (
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            {vm.summary}
          </p>
        ) : null}
        <dl className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {vm.duration ? <div className="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] p-4">
            <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <Clock3Icon aria-hidden="true" className="h-4 w-4" />
              {vm.copy.durationLabel}
            </dt>
            <dd className="mt-2 font-semibold text-foreground">{vm.duration}</dd>
          </div> : null}
          {vm.market && !vm.routeStops.some((stop) => stop.toLocaleLowerCase('en') === vm.market.toLocaleLowerCase('en')) ? (
            <div className="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] p-4">
              <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <MapPinIcon aria-hidden="true" className="h-4 w-4" />
                {vm.copy.destination}
              </dt>
              <dd className="mt-2 font-semibold text-foreground">{vm.market}</dd>
            </div>
          ) : null}
          {vm.routeStops.length > 0 ? (
            <div className="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] p-4">
              <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <MapPinIcon aria-hidden="true" className="h-4 w-4" />
                {vm.copy.route}
              </dt>
              <dd className="mt-2 line-clamp-2 font-semibold text-foreground">
                {vm.routeStops.join(' · ')}
              </dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <SiteLink className="site-header-cta inline-flex min-h-12 items-center gap-2 px-6 no-underline" href={vm.ctaHref}>
            {vm.copy.request}
            <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
          </SiteLink>
          {vm.priceState.kind === 'contact' ? (
            <span className="font-semibold text-[var(--site-wine)]">{vm.copy.contact}</span>
          ) : null}
        </div>
      </div>
    </div>
  </section>
)

export const WingSideTourDetailPage = ({
  data,
  locale,
}: {
  data: TourResolvedData
  locale: SupportedLocaleCode
}) => {
  const vm = buildWingSideTourViewModel({ data, locale })

  return (
    <div className="wingsside-tour-detail pb-24">
      <WingSideTourHero vm={vm} />

      {vm.gallery.length > 0 ? (
        <section aria-labelledby="wingsside-tour-gallery" className="container py-16 md:py-20">
          <SectionTitle eyebrow={vm.copy.journey} id="wingsside-tour-gallery" title={vm.copy.gallery} />
          <div className="grid auto-rows-[13rem] grid-cols-2 gap-3 md:auto-rows-[18rem] md:grid-cols-4">
            {vm.gallery.slice(0, 8).map((media, index) => (
              <div
                className={`relative overflow-hidden rounded-2xl bg-muted ${index === 0 ? 'col-span-2 row-span-2' : ''}`}
                key={String((media as { id?: unknown }).id || (media as { url?: unknown }).url || index)}
              >
                <Media
                  alt={mediaAlt(media, `${vm.title} — ${vm.copy.gallery} ${index + 1}`)}
                  fill
                  imgClassName="object-cover transition-transform duration-500 hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100"
                  pictureClassName="absolute inset-0"
                  resource={media}
                  size={index === 0 ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 50vw, 25vw'}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {vm.routeStops.length > 0 ? (
        <section aria-labelledby="wingsside-tour-overview" className="border-y border-[var(--site-border)] bg-[var(--site-surface-strong)] py-16 md:py-20">
          <div className="container">
            <SectionTitle eyebrow={vm.copy.route} id="wingsside-tour-overview" title={vm.copy.overview} />
            <ol className="flex flex-wrap items-center gap-2">
              {vm.routeStops.map((stop, index) => (
                <React.Fragment key={`${stop}-${index}`}>
                  <li className="rounded-full border border-[var(--site-border)] bg-[var(--site-surface)] px-5 py-3 font-semibold">
                    {stop}
                  </li>
                  {index < vm.routeStops.length - 1 ? (
                    <ArrowRightIcon aria-hidden="true" className="h-4 w-4 text-[var(--site-gold)]" />
                  ) : null}
                </React.Fragment>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {vm.itinerary.length > 0 ? (
        <section aria-labelledby="wingsside-tour-itinerary" className="container py-16 md:py-24">
          <SectionTitle eyebrow={vm.copy.journey} id="wingsside-tour-itinerary" title={vm.copy.itinerary} />
          <div className="space-y-5">
            {vm.itinerary.map((day) => (
              <article className="grid overflow-hidden rounded-[24px] border border-[var(--site-border)] bg-[var(--site-surface)] shadow-sm md:grid-cols-[10rem_1fr_auto]" key={day.dayNumber}>
                <div className="flex items-center justify-center bg-[var(--site-foreground)] px-6 py-6 text-[var(--site-background)] md:flex-col">
                  <span className="text-xs font-bold uppercase tracking-[0.18em]">{vm.copy.dayLabel}</span>
                  <strong className="ml-2 text-4xl md:ml-0 md:mt-1">{day.dayNumber}</strong>
                </div>
                <div className="p-6 md:p-8">
                  {day.title ? <h3 className="text-2xl font-semibold text-foreground">{day.title}</h3> : null}
                  {day.route ? (
                    <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--site-brand)]">
                      <MapPinIcon aria-hidden="true" className="h-4 w-4" /> {day.route}
                    </p>
                  ) : null}
                  {day.summary ? <p className="mt-4 leading-7 text-muted-foreground">{day.summary}</p> : null}
                  {day.meals || day.accommodation ? (
                    <dl className="mt-5 flex flex-wrap gap-3 text-sm">
                      {day.meals ? (
                        <div className="inline-flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2">
                          <UtensilsIcon aria-hidden="true" className="h-4 w-4" />
                          <dt className="font-semibold">{vm.copy.meals}:</dt><dd>{day.meals}</dd>
                        </div>
                      ) : null}
                      {day.accommodation ? (
                        <div className="inline-flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2">
                          <BedDoubleIcon aria-hidden="true" className="h-4 w-4" />
                          <dt className="font-semibold">{vm.copy.accommodation}:</dt><dd>{day.accommodation}</dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}
                </div>
                {day.media ? (
                  <div className="relative min-h-52 w-full md:w-64">
                    <Media
                      alt={mediaAlt(day.media, `${vm.title} — ${vm.copy.dayLabel} ${day.dayNumber}`)}
                      fill
                      imgClassName="object-cover"
                      pictureClassName="absolute inset-0"
                      resource={day.media}
                      size="(max-width: 768px) 100vw, 256px"
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {vm.includes.length > 0 || vm.excludes.length > 0 ? (
        <section className="border-y border-[var(--site-border)] bg-[var(--site-surface-strong)] py-16 md:py-20">
          <div className="container grid gap-6 md:grid-cols-2">
            {vm.includes.length > 0 ? (
              <div className="rounded-[24px] border border-[var(--site-border)] bg-[var(--site-surface)] p-7">
                <h2 className="text-2xl font-semibold">{vm.copy.includes}</h2>
                <ul className="mt-5 space-y-3">
                  {vm.includes.map((item) => <li className="flex gap-3" key={item}><CheckIcon aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-[var(--site-brand)]" /><span>{item}</span></li>)}
                </ul>
              </div>
            ) : null}
            {vm.excludes.length > 0 ? (
              <div className="rounded-[24px] border border-[var(--site-border)] bg-[var(--site-surface)] p-7">
                <h2 className="text-2xl font-semibold">{vm.copy.excludes}</h2>
                <ul className="mt-5 space-y-3">
                  {vm.excludes.map((item) => <li className="flex gap-3" key={item}><XIcon aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-[var(--site-wine)]" /><span>{item}</span></li>)}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="container py-16 md:py-20">
        {vm.priceState.kind === 'contact' ? (
          <div className="rounded-[28px] bg-[var(--site-foreground)] p-8 text-[var(--site-background)] md:flex md:items-center md:justify-between md:p-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--site-gold)]">{vm.copy.contactEyebrow}</p>
              <h2 className="mt-3 text-3xl font-semibold">{vm.copy.contact}</h2>
              <p className="mt-3 max-w-2xl text-[var(--site-background)]/75">{vm.copy.contactDetail}</p>
            </div>
            <SiteLink className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--site-gold)] px-6 font-bold text-[var(--site-foreground)] no-underline md:mt-0" href={vm.ctaHref}>
              {vm.copy.request}<ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
            </SiteLink>
          </div>
        ) : (
          <div>
            <SectionTitle eyebrow={vm.copy.price} title={vm.copy.availableDepartures} />
            <p className="mb-6 text-3xl font-semibold">{vm.copy.price} {formatPrice(vm.priceState.price, vm.priceState.currency, locale)}</p>
            <ul className="grid gap-4 md:grid-cols-2">
              {vm.priceState.departures.map((departure) => (
                <li className="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] p-5" key={departure.id}>
                  <p className="flex items-center gap-2 font-semibold"><CalendarDaysIcon aria-hidden="true" className="h-4 w-4" />{vm.copy.departure}: {formatDate(departure.departureDate, locale)}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{formatPrice(departure.price, departure.currency, locale)}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <aside className="fixed bottom-4 left-1/2 z-30 flex w-[min(54rem,calc(100%-2rem))] -translate-x-1/2 items-center justify-center gap-4 rounded-full border border-[var(--site-border)] bg-[var(--site-surface)]/95 px-4 py-3 shadow-xl backdrop-blur sm:justify-between sm:px-5">
        <div className="hidden min-w-0 sm:block">
          <p className="truncate text-sm font-semibold">{vm.title}</p>
          <p className="text-xs text-muted-foreground">{vm.priceState.kind === 'contact' ? vm.copy.contact : `${vm.copy.price} ${formatPrice(vm.priceState.price, vm.priceState.currency, locale)}`}</p>
        </div>
        <SiteLink className="inline-flex max-w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--site-gold)] px-5 py-3 text-center text-sm font-bold text-[var(--site-foreground)] no-underline" href={vm.ctaHref}>
          {vm.copy.request}<ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
        </SiteLink>
      </aside>
    </div>
  )
}
