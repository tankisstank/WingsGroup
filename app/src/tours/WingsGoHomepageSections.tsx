import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { Site } from '@/payload-types'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'

import { SiteLink } from '@/components/SiteLink'
import { getResolvedScheduleData } from './queries'
import { WingsGoTourCard } from './WingsGoTourCard'
import {
  formatTourDate,
  formatTourPrice,
  getFutureDepartures,
  getPriorityMarketDeparture,
  getAvailabilityLabel,
  getTourInquiryPath,
  isDeparturePublishable,
} from './utils'
import { queryWingsGoTourCatalog, type WingsGoCatalogPage } from './wingsGoCatalog'

const marketCards = [
  { emoji: '🇰🇷', key: 'korea', label: { en: 'South Korea', vi: 'Hàn Quốc' }, slug: 'han-quoc' },
  { emoji: '🇯🇵', key: 'japan', label: { en: 'Japan', vi: 'Nhật Bản' }, slug: 'nhat-ban' },
  { emoji: '🇨🇳', key: 'china', label: { en: 'China', vi: 'Trung Quốc' }, slug: 'trung-quoc' },
] as const

const asDoc = <T extends object>(value: T | number | string | null | undefined): T | null =>
  value && typeof value === 'object' ? value : null

const sectionHeadingClass = 'text-2xl font-semibold tracking-tight text-foreground md:text-3xl'

export const WingsGoHomepageSections = async ({
  locale,
  site,
}: {
  locale: SupportedLocaleCode
  site: Site
}) => {
  const isEn = locale === 'en'
  const payload = await getPayload({ config: configPromise })
  const [schedule, catalogPageResult] = await Promise.all([
    getResolvedScheduleData({ draft: false, locale }),
    payload.find({
      collection: 'pages',
      depth: 0,
      draft: false,
      fallbackLocale: 'vi',
      limit: 1,
      locale,
      overrideAccess: true,
      pagination: false,
      where: {
        and: [
          { _status: { equals: 'published' } },
          { pathname: { equals: '/tour' } },
          { site: { equals: site.id } },
        ],
      },
    }),
  ])
  const catalogPage = catalogPageResult.docs[0] as unknown as WingsGoCatalogPage | undefined
  const catalog = catalogPage
    ? await queryWingsGoTourCatalog({
        limit: 4,
        page: catalogPage,
        payload,
        site: { code: String(site.code), id: site.id },
      })
    : null
  const curatedTourIDs = new Set(
    (catalogPage?.wingsGoTourCatalog?.featuredTours || []).flatMap((tour) => {
      const id = tour && typeof tour === 'object' && 'id' in tour ? tour.id : tour
      return typeof id === 'number' || typeof id === 'string' ? [String(id)] : []
    }),
  )
  const curatedMatches =
    catalog?.featured.filter((tour) => curatedTourIDs.has(String(tour.id))) || []
  const fallbackFeatured =
    catalog?.featured.filter((tour) => !curatedTourIDs.has(String(tour.id))) || []
  const featuredTours = [...curatedMatches, ...fallbackFeatured].slice(0, 4)
  const nearestByMarket = marketCards.map((market) => ({
    ...market,
    departure: getPriorityMarketDeparture(schedule.departures, market.key),
    hasUnpublishedDeparture: getFutureDepartures(schedule.departures).some((departure) => {
      const product = asDoc<{ market?: string }>(departure.tourProduct)
      return product?.market === market.key && !isDeparturePublishable(departure)
    }),
  }))

  return (
    <div className="space-y-8 md:space-y-12" data-wingsgo-homepage-sections="true">
      <section
        aria-labelledby="wingsgo-nearest-departures-title"
        className="container theme-section"
      >
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="site-brand-kicker text-xs font-semibold uppercase tracking-[0.18em]">
              {isEn ? 'Departures opening soon' : 'Lịch gần nhất'}
            </p>
            <h2 className={sectionHeadingClass} id="wingsgo-nearest-departures-title">
              {isEn ? 'Upcoming tours now on sale' : 'Tour đang mở bán'}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              {isEn
                ? 'Dates marked by WingsGo or with limited seats appear first; all schedule and price details come from the same departure record.'
                : 'Ưu tiên đợt được WingsGo đánh dấu nổi bật hoặc sắp hết chỗ; ngày, hãng bay, giá và tình trạng lấy từ cùng một lịch khởi hành.'}
            </p>
          </div>
          <SiteLink
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold no-underline"
            href="/lich-khoi-hanh"
          >
            {isEn ? 'View all departures' : 'Xem toàn bộ lịch'}
          </SiteLink>
        </div>

        <ul className="mb-4 flex flex-wrap gap-2" aria-label={isEn ? 'WingsGo commitments' : 'Cam kết WingsGo'}>
          {(isEn
            ? ['Clear dates', 'Airline shown', 'Transparent prices']
            : ['Lịch rõ ngày', 'Bay theo hãng', 'Giá minh bạch']
          ).map((label) => (
            <li
              className="rounded-full border border-border/70 bg-card px-3 py-2 text-xs font-semibold text-foreground"
              key={label}
            >
              {label}
            </li>
          ))}
        </ul>

        <div className="grid gap-4 lg:grid-cols-3">
          {nearestByMarket.map(({ departure, emoji, hasUnpublishedDeparture, key, label }) => {
            const product = departure
              ? asDoc<{
                  id?: number | string
                  slug?: null | string
                  title?: string
                  market?: string
                }>(departure.tourProduct)
              : null
            const verified = departure
              ? departure.commerceVerified ?? Boolean(departure.availabilityStatus)
              : false
            const soldOut = verified && departure?.availabilityStatus === 'sold-out'
            const inquiryHref = departure
              ? getTourInquiryPath({
                  departureDate: departure.departureDate?.slice(0, 10),
                  departureId: departure.id,
                  intent: !verified || soldOut ? 'inquiry' : 'hold-seat',
                  siteCode: 'wings-go',
                  source: 'homepage-departures',
                  tourId: product?.id,
                  tourSlug: product?.slug,
                })
              : '/lien-he'

            return (
              <article
                className="flex h-full flex-col rounded-[24px] border border-border/70 bg-card p-5 shadow-sm"
                key={key}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <span aria-hidden="true">{emoji} </span>
                  {label[isEn ? 'en' : 'vi']}
                </p>
                {departure && product ? (
                  <>
                    <h3 className="mt-3 text-lg font-semibold leading-snug text-foreground">
                      {product.title}
                    </h3>
                    <dl className="mt-4 grid gap-3 text-sm">
                      <div>
                        <dt className="text-muted-foreground">{isEn ? 'Departure date' : 'Ngày khởi hành'}</dt>
                        <dd className="font-semibold">
                          {formatTourDate(departure.departureDate, locale) || '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{isEn ? 'Airline / flight' : 'Hãng bay / mã chuyến'}</dt>
                        <dd className="font-semibold">
                          {departure.airline || (isEn ? 'Updating' : 'Đang cập nhật')}
                          {departure.flightNumber ? ` · ${departure.flightNumber}` : ''}
                        </dd>
                      </div>
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <dt className="text-muted-foreground">{isEn ? 'Tour price' : 'Giá tour'}</dt>
                          <dd className="text-lg font-bold text-[var(--site-brand)]">
                            {formatTourPrice(departure.priceFrom, departure.currency) ||
                              (isEn ? 'Contact us' : 'Liên hệ')}
                          </dd>
                        </div>
                        {(() => {
                          const label = !verified
                            ? isEn
                              ? 'Confirm availability'
                              : 'Liên hệ xác nhận'
                            : departure.availabilityBadge ||
                              getAvailabilityLabel(departure.availabilityStatus, locale)
                          return label ? (
                            <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                              {label}
                            </span>
                          ) : null
                        })()}
                      </div>
                    </dl>
                    <div className="mt-auto flex flex-wrap gap-2 pt-5">
                      <SiteLink
                        className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--site-brand)] px-4 text-sm font-semibold text-white no-underline"
                        href={inquiryHref}
                      >
                        {!verified || soldOut
                          ? isEn
                            ? 'Send request'
                            : 'Gửi yêu cầu'
                          : isEn
                            ? 'Hold a seat'
                            : 'Giữ chỗ ngay'}
                      </SiteLink>
                      {product.slug ? (
                        <SiteLink
                          className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-4 text-sm font-semibold no-underline"
                          href={`/tour/${product.slug}`}
                        >
                          {isEn ? 'View tour' : 'Xem tour'}
                        </SiteLink>
                      ) : null}
                    </div>
                  </>
                ) : hasUnpublishedDeparture ? (
                  <div className="mt-4 flex flex-1 flex-col justify-between gap-4">
                    <div className="space-y-3">
                      <span className="inline-flex rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-sky-700 dark:text-sky-300">
                        {isEn ? 'Upcoming schedule' : 'Lịch đang cập nhật'}
                      </span>
                      <p className="text-sm leading-7 text-muted-foreground">
                        {isEn
                          ? 'Schedule and pricing for this route are being updated. Please contact us for the latest departure dates.'
                          : 'Lịch bay và giá cho tuyến này đang được chuyên viên cập nhật. Quý khách vui lòng liên hệ để nhận lịch mở bán mới nhất.'}
                      </p>
                    </div>
                    <SiteLink
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-4 text-sm font-semibold no-underline transition-colors hover:bg-muted/40"
                      href="/lien-he"
                    >
                      {isEn ? 'Ask WingsGo' : 'Hỏi WingsGo'}
                    </SiteLink>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-1 flex-col justify-between gap-4">
                    <p className="text-sm leading-7 text-muted-foreground">
                      {isEn
                        ? 'No upcoming departure is listed yet. Contact the team to request a suitable date.'
                        : 'Chưa có lịch khởi hành sắp tới. Liên hệ WingsGo để hỏi ngày đi phù hợp.'}
                    </p>
                    <SiteLink
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-4 text-sm font-semibold no-underline"
                      href="/lien-he"
                    >
                      {isEn ? 'Ask WingsGo' : 'Hỏi WingsGo'}
                    </SiteLink>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="wingsgo-hot-tours-title" className="container theme-section">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="site-brand-kicker text-xs font-semibold uppercase tracking-[0.18em]">
              {isEn ? 'WingsGo picks' : 'WingsGo gợi ý'}
            </p>
            <h2 className={sectionHeadingClass} id="wingsgo-hot-tours-title">
              {isEn
                ? '🔥 Tours guests are asking about'
                : '🔥 Tour đang được quan tâm nhất'}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              {isEn
                ? 'Four tours prioritized in the WingsGo catalog, ordered by the editorial selection.'
                : 'Những hành trình được WingsGo ưu tiên giới thiệu, theo thứ tự biên tập trong catalog tour.'}
            </p>
          </div>
          <SiteLink
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold no-underline"
            href="/tour"
          >
            {isEn ? 'View all tours ➤' : 'Xem tất cả các Tour ➤'}
          </SiteLink>
        </div>
        {featuredTours.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {featuredTours.map((card) => (
              <WingsGoTourCard badge="Hot" card={card} key={String(card.id)} locale={locale} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-5 text-sm text-muted-foreground">
            {isEn
              ? 'The catalog has no eligible tours with future departures yet.'
              : 'Catalog chưa có đủ tour được publish kèm lịch khởi hành sắp tới.'}
          </p>
        )}
      </section>

      <section aria-labelledby="wingsgo-destinations-title" className="container theme-section">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="site-brand-kicker text-xs font-semibold uppercase tracking-[0.18em]">
              {isEn ? 'Choose a destination' : 'Chọn điểm đến'}
            </p>
            <h2 className={sectionHeadingClass} id="wingsgo-destinations-title">
              {isEn ? 'Where would you like to go?' : 'Bạn đang muốn đi đâu?'}
            </h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {isEn
                ? 'Choose a destination; WingsGo will help with the rest.'
                : 'Chọn điểm đến - WingsGo lo phần còn lại!'}
            </p>
          </div>
          <SiteLink
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold no-underline"
            href="/thi-truong"
          >
            {isEn ? 'Explore all destinations ➤' : 'Khám phá tất cả các điểm đến ➤'}
          </SiteLink>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {marketCards.map(({ emoji, key, label, slug }) => (
            <SiteLink
              className="group flex min-h-40 items-center justify-between gap-4 rounded-[24px] border border-border/70 bg-card p-6 no-underline shadow-sm transition hover:-translate-y-1 hover:border-[var(--site-brand)]/40 hover:shadow-lg"
              href={`/thi-truong/${slug}`}
              key={key}
            >
              <span>
                <span className="text-3xl" aria-hidden="true">{emoji}</span>
                <span className="mt-3 block text-xl font-semibold text-foreground">
                  {label[isEn ? 'en' : 'vi']}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {isEn ? 'Explore tours and departures' : 'Khám phá tour và lịch khởi hành'}
                </span>
              </span>
              <span aria-hidden="true" className="text-xl font-semibold text-[var(--site-brand)] transition group-hover:translate-x-1">
                →
              </span>
            </SiteLink>
          ))}
        </div>
      </section>
    </div>
  )
}
