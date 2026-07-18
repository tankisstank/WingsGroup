'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import React, { useEffect } from 'react'

import type { Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { useSitePath } from '@/utilities/useSitePath'
import { heroPresentationComponents, type HeroPresentationProps } from '@/heros/presentations'
import { type HeroPresentationKey } from '@/heros/presentations/registry'
import { resolveHeroPresentationConfig } from '@/heros/presentations/resolver'
import type { SiteHeroDefaultsLike } from '@/heros/presentations/types'
import type { SupportedLocaleCode } from '@/utilities/locales'
import {
  BadgeCheckIcon,
  CalendarDaysIcon,
  CameraIcon,
  CompassIcon,
  MapPinnedIcon,
  PlaneIcon,
  UsersIcon,
} from 'lucide-react'

const retailDepartures = [
  {
    airline: 'VJ',
    date: '12/06/2026',
    price: 'từ 13.990.000đ',
    title: 'Seoul - Nami - Everland',
  },
  {
    airline: 'VN',
    date: '19/06/2026',
    price: 'từ 18.990.000đ',
    title: 'Seoul - Jeju - Camellia Hill',
  },
  {
    airline: 'CA',
    date: '26/06/2026',
    price: 'từ 11.990.000đ',
    title: 'Bắc Kinh - Vạn Lý Trường Thành',
  },
]

const retailHighlights = [
  { icon: CalendarDaysIcon, label: 'Lịch rõ ngày' },
  { icon: PlaneIcon, label: 'Bay theo hãng' },
  { icon: BadgeCheckIcon, label: 'Giá minh bạch' },
]

const plannerHighlightIcons = {
  localMoments: CameraIcon,
  privateGroups: UsersIcon,
  routeDesign: MapPinnedIcon,
} as const

type PublicPlannerLocale = Extract<SupportedLocaleCode, 'en' | 'es' | 'it' | 'pt' | 'vi'>

type PlannerPanelCopy = {
  ariaLabel: string
  cuesAriaLabel: string
  ctaLabel: string
  description: string
  destinationLabel: string
  destinations: readonly { label: string; value: string }[]
  durationLabel: string
  durations: readonly { label: string; value: string }[]
  highlights: readonly {
    icon: (typeof plannerHighlightIcons)[keyof typeof plannerHighlightIcons]
    label: string
  }[]
  miniLabel: string
  title: string
}

const plannerPanelCopyByLocale = {
  en: {
    ariaLabel: 'Trip planning starter',
    cuesAriaLabel: 'WingsSide planning cues',
    ctaLabel: 'Plan your trip',
    description: 'Choose a starting direction and send it into the trip planning flow.',
    destinationLabel: 'Destination',
    destinations: [
      { label: 'Choose a destination', value: '' },
      { label: 'Ha Noi and Ha Long', value: 'ha-noi-ha-long' },
      { label: 'Hue and Hoi An', value: 'hue-hoi-an' },
      { label: 'Mekong Delta', value: 'mekong-delta' },
      { label: 'Multi-region Vietnam', value: 'multi-region-vietnam' },
    ],
    durationLabel: 'Duration',
    durations: [
      { label: 'Choose duration', value: '' },
      { label: '5-7 days', value: '5-7-days' },
      { label: '8-10 days', value: '8-10-days' },
      { label: '11-14 days', value: '11-14-days' },
      { label: '15+ days', value: '15-plus-days' },
    ],
    highlights: [
      { icon: plannerHighlightIcons.routeDesign, label: 'Route design' },
      { icon: plannerHighlightIcons.localMoments, label: 'Local moments' },
      { icon: plannerHighlightIcons.privateGroups, label: 'Private groups' },
    ],
    miniLabel: 'Start with',
    title: 'Plan a private Vietnam journey',
  },
  es: {
    ariaLabel: 'Inicio de planificación de viaje',
    cuesAriaLabel: 'Señales de planificación WingsSide',
    ctaLabel: 'Planifica tu viaje',
    description: 'Elige una dirección inicial y envíala al flujo de planificación.',
    destinationLabel: 'Destino',
    destinations: [
      { label: 'Elige un destino', value: '' },
      { label: 'Hanói y Ha Long', value: 'ha-noi-ha-long' },
      { label: 'Hue y Hoi An', value: 'hue-hoi-an' },
      { label: 'Delta del Mekong', value: 'mekong-delta' },
      { label: 'Vietnam multi-región', value: 'multi-region-vietnam' },
    ],
    durationLabel: 'Duración',
    durations: [
      { label: 'Elige duración', value: '' },
      { label: '5-7 días', value: '5-7-days' },
      { label: '8-10 días', value: '8-10-days' },
      { label: '11-14 días', value: '11-14-days' },
      { label: '15+ días', value: '15-plus-days' },
    ],
    highlights: [
      { icon: plannerHighlightIcons.routeDesign, label: 'Diseño de ruta' },
      { icon: plannerHighlightIcons.localMoments, label: 'Momentos locales' },
      { icon: plannerHighlightIcons.privateGroups, label: 'Grupos privados' },
    ],
    miniLabel: 'Empieza con',
    title: 'Planifica un viaje privado a Vietnam',
  },
  it: {
    ariaLabel: 'Inizio pianificazione viaggio',
    cuesAriaLabel: 'Segnali di pianificazione WingsSide',
    ctaLabel: 'Pianifica il viaggio',
    description: 'Scegli una direzione iniziale e inviala al flusso di pianificazione.',
    destinationLabel: 'Destinazione',
    destinations: [
      { label: 'Scegli una destinazione', value: '' },
      { label: 'Hanoi e Ha Long', value: 'ha-noi-ha-long' },
      { label: 'Hue e Hoi An', value: 'hue-hoi-an' },
      { label: 'Delta del Mekong', value: 'mekong-delta' },
      { label: 'Vietnam multi-regione', value: 'multi-region-vietnam' },
    ],
    durationLabel: 'Durata',
    durations: [
      { label: 'Scegli durata', value: '' },
      { label: '5-7 giorni', value: '5-7-days' },
      { label: '8-10 giorni', value: '8-10-days' },
      { label: '11-14 giorni', value: '11-14-days' },
      { label: '15+ giorni', value: '15-plus-days' },
    ],
    highlights: [
      { icon: plannerHighlightIcons.routeDesign, label: 'Disegno della rotta' },
      { icon: plannerHighlightIcons.localMoments, label: 'Momenti locali' },
      { icon: plannerHighlightIcons.privateGroups, label: 'Gruppi privati' },
    ],
    miniLabel: 'Inizia con',
    title: 'Pianifica un viaggio privato in Vietnam',
  },
  pt: {
    ariaLabel: 'Início do planeamento da viagem',
    cuesAriaLabel: 'Sinais de planeamento WingsSide',
    ctaLabel: 'Planear a viagem',
    description: 'Escolha uma direção inicial e envie-a para o fluxo de planeamento.',
    destinationLabel: 'Destino',
    destinations: [
      { label: 'Escolha um destino', value: '' },
      { label: 'Hanói e Ha Long', value: 'ha-noi-ha-long' },
      { label: 'Hue e Hoi An', value: 'hue-hoi-an' },
      { label: 'Delta do Mekong', value: 'mekong-delta' },
      { label: 'Vietname multi-região', value: 'multi-region-vietnam' },
    ],
    durationLabel: 'Duração',
    durations: [
      { label: 'Escolha duração', value: '' },
      { label: '5-7 dias', value: '5-7-days' },
      { label: '8-10 dias', value: '8-10-days' },
      { label: '11-14 dias', value: '11-14-days' },
      { label: '15+ dias', value: '15-plus-days' },
    ],
    highlights: [
      { icon: plannerHighlightIcons.routeDesign, label: 'Desenho de rota' },
      { icon: plannerHighlightIcons.localMoments, label: 'Momentos locais' },
      { icon: plannerHighlightIcons.privateGroups, label: 'Grupos privados' },
    ],
    miniLabel: 'Comece por',
    title: 'Planear uma viagem privada ao Vietname',
  },
  vi: {
    ariaLabel: 'Khởi tạo kế hoạch chuyến đi',
    cuesAriaLabel: 'Gợi ý lập kế hoạch WingsSide',
    ctaLabel: 'Lên kế hoạch',
    description: 'Chọn hướng đi ban đầu và gửi vào luồng lập kế hoạch.',
    destinationLabel: 'Điểm đến',
    destinations: [
      { label: 'Chọn điểm đến', value: '' },
      { label: 'Hà Nội và Hạ Long', value: 'ha-noi-ha-long' },
      { label: 'Huế và Hội An', value: 'hue-hoi-an' },
      { label: 'Đồng bằng Mekong', value: 'mekong-delta' },
      { label: 'Việt Nam nhiều vùng', value: 'multi-region-vietnam' },
    ],
    durationLabel: 'Thời lượng',
    durations: [
      { label: 'Chọn thời lượng', value: '' },
      { label: '5-7 ngày', value: '5-7-days' },
      { label: '8-10 ngày', value: '8-10-days' },
      { label: '11-14 ngày', value: '11-14-days' },
      { label: '15+ ngày', value: '15-plus-days' },
    ],
    highlights: [
      { icon: plannerHighlightIcons.routeDesign, label: 'Thiết kế tuyến' },
      { icon: plannerHighlightIcons.localMoments, label: 'Khoảnh khắc địa phương' },
      { icon: plannerHighlightIcons.privateGroups, label: 'Nhóm riêng' },
    ],
    miniLabel: 'Bắt đầu với',
    title: 'Lên kế hoạch chuyến Việt Nam riêng',
  },
} as const satisfies Record<PublicPlannerLocale, PlannerPanelCopy>

const heroVariantCopy = {
  planner: {
    badge: 'Vietnam journeys, designed with care',
    postcards: ['Ha Noi old quarter', 'Ha Long bay', 'Hoi An lanterns'],
  },
  'retail-departures': {
    badge: 'Tour rõ lịch, rõ giá, dễ chốt',
    postcards: ['Jeju summer', 'Seoul - Nami', 'Tokyo mùa lá'],
  },
  standard: {
    badge: 'WingsGroup service ecosystem',
    postcards: ['Travel planning', 'Local support', 'Trusted service'],
  },
  utility: {
    badge: 'Dịch vụ rõ giá, đặt nhanh',
    postcards: ['Fast track', 'Airport add-on', 'Booking support'],
  },
} as const

type HighImpactHeroData = Page['hero'] & {
  presentation?: HeroPresentationKey | null
  supportingMedia?: HeroPresentationProps['supportingMedia']
}

const getPlannerPanelCopy = (locale?: null | SupportedLocaleCode): PlannerPanelCopy =>
  plannerPanelCopyByLocale[(locale as PublicPlannerLocale) || 'en'] || plannerPanelCopyByLocale.en

export const HighImpactHero: React.FC<
  Page['hero'] & {
    resolvedLocale?: SupportedLocaleCode
    siteHeroDefaults?: SiteHeroDefaultsLike | null
  }
> = (props) => {
  const { links, media, richText, supportingMedia } = props as HighImpactHeroData
  const resolved = resolveHeroPresentationConfig({
    hero: props as HighImpactHeroData,
    siteDefaults: props.siteHeroDefaults,
  })
  const variant = ((props as { variant?: keyof typeof heroVariantCopy }).variant ||
    props.siteHeroDefaults?.variant ||
    'standard') as keyof typeof heroVariantCopy
  const copy = heroVariantCopy[variant] || heroVariantCopy.standard
  const presentation = resolved.key
  const Presentation = heroPresentationComponents[presentation]
  const { setHeaderTheme } = useHeaderTheme()
  const isRetailDepartures = variant === 'retail-departures'
  const isPlanner = variant === 'planner'
  const plannerCopy = getPlannerPanelCopy(props.resolvedLocale)
  const toSitePath = useSitePath()

  useEffect(() => {
    setHeaderTheme('light')
  }, [setHeaderTheme])

  const businessPanel = isRetailDepartures ? (
    <aside aria-label="Lịch khởi hành nổi bật" className="site-hero__commerce-panel">
      <div className="site-hero__panel-head">
        <div className="site-panel-icon">
          <CalendarDaysIcon aria-hidden="true" className="h-5 w-5" />
        </div>
        <div>
          <p className="site-mini-label">Lịch gần nhất</p>
          <h2>Tour đang mở bán</h2>
        </div>
      </div>
      <div className="site-departure-stack">
        {retailDepartures.map((departure) => (
          <div className="site-departure-row" key={`${departure.title}-${departure.date}`}>
            <div>
              <h2>{departure.title}</h2>
              <p>
                {departure.date} · {departure.airline}
              </p>
            </div>
            <strong>{departure.price}</strong>
          </div>
        ))}
      </div>
      <div className="site-trust-row" aria-label="Điểm mạnh WingsGo">
        {retailHighlights.map(({ icon: Icon, label }) => (
          <span key={label}>
            <Icon aria-hidden="true" className="h-4 w-4" />
            {label}
          </span>
        ))}
      </div>
      <CMSLink
        appearance="default"
        className="site-panel-cta"
        label="Xem toàn bộ lịch"
        type="custom"
        url="/lich-khoi-hanh"
      />
    </aside>
  ) : isPlanner ? (
    <aside aria-label={plannerCopy.ariaLabel} className="site-hero__planner-panel">
      <div className="site-hero__planner-intro">
        <div className="site-panel-icon">
          <CompassIcon aria-hidden="true" className="h-5 w-5" />
        </div>
        <p className="site-mini-label">{plannerCopy.miniLabel}</p>
        <strong>{plannerCopy.title}</strong>
        <span>{plannerCopy.description}</span>
      </div>
      <form action={toSitePath('/plan-your-trip')} className="site-hero__planner-form" method="get">
        <label className="site-hero__planner-field">
          <span>{plannerCopy.destinationLabel}</span>
          <select aria-label={plannerCopy.destinationLabel} name="destination">
            {plannerCopy.destinations.map((option) => (
              <option key={option.value || 'destination-placeholder'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="site-hero__planner-field">
          <span>{plannerCopy.durationLabel}</span>
          <select aria-label={plannerCopy.durationLabel} name="duration">
            {plannerCopy.durations.map((option) => (
              <option key={option.value || 'duration-placeholder'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button className="site-panel-cta site-hero__planner-submit" type="submit">
          {plannerCopy.ctaLabel}
        </button>
      </form>
      <div className="site-trust-row site-trust-row--wide" aria-label={plannerCopy.cuesAriaLabel}>
        {plannerCopy.highlights.map(({ icon: Icon, label }) => (
          <span key={label}>
            <Icon aria-hidden="true" className="h-4 w-4" />
            {label}
          </span>
        ))}
      </div>
    </aside>
  ) : null

  return (
    <section
      className="site-hero site-hero--presented relative -mt-[8.2rem] overflow-hidden"
      data-hero-presentation={presentation}
      data-hero-preset={resolved.presetKey}
      data-hero-source={resolved.source}
      data-hero-template={resolved.key}
      data-hero-variant={variant}
      data-theme="light"
    >
      <Presentation
        badge={resolved.preset?.slots?.showBadge === false ? '' : copy.badge}
        behavior={resolved.behavior}
        businessPanel={resolved.preset?.slots?.showBusinessPanel === false ? null : businessPanel}
        links={links}
        media={media}
        postcards={resolved.preset?.slots?.showPostcards === false ? [] : copy.postcards}
        preset={resolved.preset}
        richText={richText}
        slides={(props as HighImpactHeroData & { slides?: HeroPresentationProps['slides'] }).slides}
        supportingMedia={supportingMedia}
        video={(props as HighImpactHeroData & { video?: HeroPresentationProps['video'] }).video}
      />
    </section>
  )
}
