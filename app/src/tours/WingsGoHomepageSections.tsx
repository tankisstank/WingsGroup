/* eslint-disable @next/next/no-img-element */
import type { SupportedLocaleCode } from '@/utilities/sitePaths'

import { SiteLink } from '@/components/SiteLink'
import { WingsGoTourCard } from './WingsGoTourCard'
import type { WingsGoCatalogCard } from './wingsGoCatalog'
import { getResolvedScheduleData } from './queries'
import {
  formatTourDate,
  formatTourPrice,
  getFutureDepartures,
  getPriorityMarketDeparture,
  getAvailabilityLabel,
  getTourInquiryPath,
  isDeparturePublishable,
} from './utils'

const marketCards = [
  {
    badge: { en: 'Top Pick', vi: 'Yêu thích nhất' },
    departuresHint: { en: 'Weekly departures', vi: 'Khởi hành đều hàng tuần' },
    emoji: '🇰🇷',
    highlights: { en: 'Seoul • Nami • Everland • Jeju', vi: 'Seoul • Đảo Nami • Everland • Jeju' },
    image: '/media/dao-nami-17.jpg',
    key: 'korea',
    label: { en: 'South Korea', vi: 'Hàn Quốc' },
    slug: 'han-quoc',
  },
  {
    badge: { en: 'Seasonal Peak', vi: 'Mùa đẹp nhất' },
    departuresHint: { en: 'Golden route: Autumn leaves & Snow', vi: 'Cung đường vàng mùa lá đỏ & tuyết trắng' },
    emoji: '🇯🇵',
    highlights: { en: 'Tokyo • Mt. Fuji • Kyoto • Osaka', vi: 'Tokyo • Núi Phú Sĩ • Kyoto • Osaka' },
    image: '/media/nuiphusimuathu.jpg',
    key: 'japan',
    label: { en: 'Japan', vi: 'Nhật Bản' },
    slug: 'nhat-ban',
  },
  {
    badge: { en: 'Hot Route', vi: 'Tuyến Hot' },
    departuresHint: { en: 'Direct flights, premier routes', vi: 'Bay thẳng tiện lợi, khám phá cổ trấn & kỳ quan' },
    emoji: '🇨🇳',
    highlights: { en: 'Shanghai • Wuzhen • Beijing • Hangzhou', vi: 'Thượng Hải • Ô Trấn • Bắc Kinh • Hàng Châu' },
    image: '/media/thebund.jpg',
    key: 'china',
    label: { en: 'China', vi: 'Trung Quốc' },
    slug: 'trung-quoc',
  },
] as const

const asDoc = <T extends object>(value: T | number | string | null | undefined): T | null =>
  value && typeof value === 'object' ? value : null

const sectionHeadingClass = 'text-2xl font-semibold tracking-tight text-foreground md:text-3xl'

export const WingsGoHomepageSections = async ({
  featuredTours = [],
  locale,
}: {
  featuredTours?: WingsGoCatalogCard[]
  locale: SupportedLocaleCode
}) => {
  const isEn = locale === 'en'
  const schedule = await getResolvedScheduleData({ draft: false, locale })
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
              {isEn ? 'Upcoming departure schedule' : 'Lịch khởi hành sắp tới'}
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

      {featuredTours.length > 0 ? (
        <section aria-labelledby="wingsgo-hot-tours-title" className="container theme-section">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="site-brand-kicker text-xs font-semibold uppercase tracking-[0.18em]">
                {isEn ? 'WingsGo picks' : 'WingsGo gợi ý'}
              </p>
              <h2 className={sectionHeadingClass} id="wingsgo-hot-tours-title">
                {isEn ? '🔥 Tours guests are asking about' : '🔥 Tour đang được quan tâm nhất'}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                {isEn
                  ? 'Priority itineraries curated by WingsGo from our latest published tours.'
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
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {featuredTours.slice(0, 4).map((card) => (
              <WingsGoTourCard card={card} key={String(card.id)} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}

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
        <div className="grid gap-5 md:grid-cols-3">
          {marketCards.map(
            ({ badge, departuresHint, emoji, highlights, image, key, label, slug }) => (
              <SiteLink
                className="group relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-[24px] border border-border/70 p-6 no-underline shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-[var(--site-brand)]/50 hover:shadow-2xl"
                href={`/thi-truong/${slug}`}
                key={key}
              >
                <img
                  alt={label[isEn ? 'en' : 'vi']}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                  src={image}
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20 transition-opacity duration-300 group-hover:from-black/95 group-hover:via-black/50"
                />

                <div className="relative z-10 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                    <span aria-hidden="true" className="text-base">
                      {emoji}
                    </span>
                    <span>{label[isEn ? 'en' : 'vi']}</span>
                  </span>
                  <span className="inline-flex rounded-full bg-[var(--site-brand)]/90 px-2.5 py-1 text-[11px] font-bold text-white shadow">
                    {badge[isEn ? 'en' : 'vi']}
                  </span>
                </div>

                <div className="relative z-10 mt-auto pt-16">
                  <h3 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm md:text-3xl">
                    {label[isEn ? 'en' : 'vi']}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-white/90">
                    {highlights[isEn ? 'en' : 'vi']}
                  </p>
                  <p className="mt-1 text-xs text-white/70">
                    {departuresHint[isEn ? 'en' : 'vi']}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3">
                    <span className="text-xs font-semibold text-white/95 transition group-hover:text-white">
                      {isEn ? 'Explore tours & departures' : 'Khám phá tour & lịch bay'}
                    </span>
                    <span
                      aria-hidden="true"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition duration-300 group-hover:translate-x-1 group-hover:bg-[var(--site-brand)]"
                    >
                      →
                    </span>
                  </div>
                </div>
              </SiteLink>
            ),
          )}
        </div>
      </section>
    </div>
  )
}
