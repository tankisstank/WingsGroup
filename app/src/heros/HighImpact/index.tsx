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
import type { WingsGoCatalogCard } from '@/tours/wingsGoCatalog'
import { WingsGoHeroTourRow } from '@/heros/WingsGoCommerceHero'
import {
  BadgeCheckIcon,
  CalendarDaysIcon,
  CameraIcon,
  FlameIcon,
  MapPinnedIcon,
  PlaneIcon,
  UsersIcon,
} from 'lucide-react'

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
  formTitle: string
  fullBriefLink: string
  fullBriefPrefix: string
  highlights: readonly {
    icon: (typeof plannerHighlightIcons)[keyof typeof plannerHighlightIcons]
    label: string
  }[]
  miniLabel: string
  /** Full accessible month field name (base + hint). */
  monthLabel: string
  monthLabelBase: string
  monthLabelHint: string
  months: readonly { label: string; value: string }[]
  points: readonly string[]
  sameTeamNote: string
  styleLabel: string
  styles: readonly { label: string; value: string }[]
  title: string
}

const plannerMonths = [
  { label: 'Month', value: '' },
  { label: 'Jan', value: '01' },
  { label: 'Feb', value: '02' },
  { label: 'Mar', value: '03' },
  { label: 'Apr', value: '04' },
  { label: 'May', value: '05' },
  { label: 'Jun', value: '06' },
  { label: 'Jul', value: '07' },
  { label: 'Aug', value: '08' },
  { label: 'Sep', value: '09' },
  { label: 'Oct', value: '10' },
  { label: 'Nov', value: '11' },
  { label: 'Dec', value: '12' },
] as const

const plannerStyles = [
  { label: 'Family', value: 'family' },
  { label: 'Luxury', value: 'luxury' },
  { label: 'Culture', value: 'culture' },
  { label: 'Adventure', value: 'adventure' },
  { label: 'Wellness', value: 'wellness' },
  { label: 'Business', value: 'business' },
] as const

const plannerPanelCopyByLocale = {
  en: {
    ariaLabel: 'Trip planning starter',
    cuesAriaLabel: 'WingSide planning cues',
    ctaLabel: 'Plan trip →',
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
    formTitle: 'Start here',
    fullBriefLink: 'full brief on Plan your trip',
    fullBriefPrefix: 'Or open the',
    highlights: [
      { icon: plannerHighlightIcons.routeDesign, label: 'Route design' },
      { icon: plannerHighlightIcons.localMoments, label: 'Local moments' },
      { icon: plannerHighlightIcons.privateGroups, label: 'Private groups' },
    ],
    miniLabel: 'Quick path · Home',
    monthLabel: 'Travel month (recommended)',
    monthLabelBase: 'Travel month',
    monthLabelHint: '(recommended)',
    months: plannerMonths,
    points: [
      'Typical reply: 1 business day (GMT+7)',
      'Destination + duration + style → first direction',
      'Need more fields? Open the full planning brief',
    ],
    sameTeamNote: 'same team',
    styleLabel: 'Travel style',
    styles: plannerStyles,
    title: 'Plan a private Vietnam journey',
  },
  es: {
    ariaLabel: 'Inicio de planificación de viaje',
    cuesAriaLabel: 'Señales de planificación WingSide',
    ctaLabel: 'Planifica →',
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
    formTitle: 'Empieza aquí',
    fullBriefLink: 'brief completo en Planifica tu viaje',
    fullBriefPrefix: 'O abre el',
    highlights: [
      { icon: plannerHighlightIcons.routeDesign, label: 'Diseño de ruta' },
      { icon: plannerHighlightIcons.localMoments, label: 'Momentos locales' },
      { icon: plannerHighlightIcons.privateGroups, label: 'Grupos privados' },
    ],
    miniLabel: 'Ruta rápida · Inicio',
    monthLabel: 'Mes de viaje (recomendado)',
    monthLabelBase: 'Mes de viaje',
    monthLabelHint: '(recomendado)',
    months: plannerMonths,
    points: [
      'Respuesta típica: 1 día laborable (GMT+7)',
      'Destino + duración + estilo → primera dirección',
      '¿Más campos? Abre el brief completo',
    ],
    sameTeamNote: 'mismo equipo',
    styleLabel: 'Estilo de viaje',
    styles: plannerStyles,
    title: 'Planifica un viaje privado a Vietnam',
  },
  it: {
    ariaLabel: 'Inizio pianificazione viaggio',
    cuesAriaLabel: 'Segnali di pianificazione WingSide',
    ctaLabel: 'Pianifica →',
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
    formTitle: 'Inizia qui',
    fullBriefLink: 'brief completo su Pianifica il viaggio',
    fullBriefPrefix: 'Oppure apri il',
    highlights: [
      { icon: plannerHighlightIcons.routeDesign, label: 'Disegno della rotta' },
      { icon: plannerHighlightIcons.localMoments, label: 'Momenti locali' },
      { icon: plannerHighlightIcons.privateGroups, label: 'Gruppi privati' },
    ],
    miniLabel: 'Percorso rapido · Home',
    monthLabel: 'Mese di viaggio (consigliato)',
    monthLabelBase: 'Mese di viaggio',
    monthLabelHint: '(consigliato)',
    months: plannerMonths,
    points: [
      'Risposta tipica: 1 giorno lavorativo (GMT+7)',
      'Destinazione + durata + stile → prima direzione',
      'Servono più campi? Apri il brief completo',
    ],
    sameTeamNote: 'stesso team',
    styleLabel: 'Stile di viaggio',
    styles: plannerStyles,
    title: 'Pianifica un viaggio privato in Vietnam',
  },
  pt: {
    ariaLabel: 'Início do planeamento da viagem',
    cuesAriaLabel: 'Sinais de planeamento WingSide',
    ctaLabel: 'Planear →',
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
    formTitle: 'Comece aqui',
    fullBriefLink: 'brief completo em Planear a viagem',
    fullBriefPrefix: 'Ou abra o',
    highlights: [
      { icon: plannerHighlightIcons.routeDesign, label: 'Desenho de rota' },
      { icon: plannerHighlightIcons.localMoments, label: 'Momentos locais' },
      { icon: plannerHighlightIcons.privateGroups, label: 'Grupos privados' },
    ],
    miniLabel: 'Caminho rápido · Home',
    monthLabel: 'Mês de viagem (recomendado)',
    monthLabelBase: 'Mês de viagem',
    monthLabelHint: '(recomendado)',
    months: plannerMonths,
    points: [
      'Resposta típica: 1 dia útil (GMT+7)',
      'Destino + duração + estilo → primeira direção',
      'Precisa de mais campos? Abra o brief completo',
    ],
    sameTeamNote: 'mesma equipa',
    styleLabel: 'Estilo de viagem',
    styles: plannerStyles,
    title: 'Planear uma viagem privada ao Vietname',
  },
  vi: {
    ariaLabel: 'Khởi tạo kế hoạch chuyến đi',
    cuesAriaLabel: 'Gợi ý lập kế hoạch WingSide',
    ctaLabel: 'Lên kế hoạch →',
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
    formTitle: 'Bắt đầu tại đây',
    fullBriefLink: 'brief đầy đủ tại Lên kế hoạch',
    fullBriefPrefix: 'Hoặc mở',
    highlights: [
      { icon: plannerHighlightIcons.routeDesign, label: 'Thiết kế tuyến' },
      { icon: plannerHighlightIcons.localMoments, label: 'Khoảnh khắc địa phương' },
      { icon: plannerHighlightIcons.privateGroups, label: 'Nhóm riêng' },
    ],
    miniLabel: 'Lối tắt · Home',
    monthLabel: 'Tháng đi (khuyến nghị)',
    monthLabelBase: 'Tháng đi',
    monthLabelHint: '(khuyến nghị)',
    months: plannerMonths,
    points: [
      'Phản hồi điển hình: 1 ngày làm việc (GMT+7)',
      'Điểm đến + thời lượng + phong cách → hướng đi đầu',
      'Cần thêm trường? Mở brief đầy đủ',
    ],
    sameTeamNote: 'cùng team',
    styleLabel: 'Phong cách đi',
    styles: plannerStyles,
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
    heroFeaturedTours?: WingsGoCatalogCard[]
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
  const [overridePresentation, setOverridePresentation] =
    React.useState<HeroPresentationKey | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const heroParam = params.get('hero') as HeroPresentationKey | null
      if (heroParam && heroParam in heroPresentationComponents) {
        setOverridePresentation(heroParam)
      }
    }
  }, [])

  const presentation = overridePresentation || resolved.key
  const Presentation =
    heroPresentationComponents[presentation] || heroPresentationComponents[resolved.key]
  const { setHeaderTheme } = useHeaderTheme()
  const isRetailDepartures = variant === 'retail-departures'
  const isPlanner = variant === 'planner'
  const plannerCopy = getPlannerPanelCopy(props.resolvedLocale)
  const toSitePath = useSitePath()
  const isEn = props.resolvedLocale === 'en'

  useEffect(() => {
    setHeaderTheme('light')
  }, [setHeaderTheme])

  const catalogTours = props.heroFeaturedTours || []

  const businessPanel = isRetailDepartures ? (
    <aside
      aria-label={isEn ? 'Featured tours' : 'Tour nổi bật'}
      className="site-hero__commerce-panel"
    >
      <div className="site-hero__panel-head">
        <div className="site-panel-icon">
          <FlameIcon aria-hidden="true" className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <p className="site-mini-label">{isEn ? 'Hot offers' : 'Ưu đãi hot'}</p>
          <h2>{isEn ? 'Trending tours' : 'Tour đang được quan tâm'}</h2>
        </div>
      </div>
      <div className="site-departure-stack">
        {catalogTours.length > 0 ? (
          catalogTours.slice(0, 3).map((item) => (
            <WingsGoHeroTourRow
              key={item.id}
              locale={props.resolvedLocale}
              tour={item}
            />
          ))
        ) : (
          <div className="p-4 text-sm text-muted-foreground text-center">
            {isEn
              ? 'No featured tours available at the moment. Explore our full catalog below.'
              : 'Hiện chưa có tour nổi bật. Xem toàn bộ tour đang mở bán bên dưới.'}
          </div>
        )}
      </div>
      <div className="site-trust-row" aria-label={isEn ? 'WingsGo values' : 'Điểm mạnh WingsGo'}>
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
        label={isEn ? 'View all tours' : 'Xem tất cả các tour'}
        type="custom"
        url="/tour"
      />
    </aside>
  ) : isPlanner ? (
    <aside
      aria-label={plannerCopy.ariaLabel}
      className="site-hero__planner-panel site-hero__planner-panel--hifi-dense"
      data-planner-variant="hifi-dense"
      id="home-planner"
    >
      <div className="site-hero__planner-intro">
        <p className="site-mini-label">{plannerCopy.miniLabel}</p>
        <h2 className="site-hero__planner-title">{plannerCopy.title}</h2>
        <ul className="site-hero__planner-points">
          {plannerCopy.points.map((point, index) => (
            <li key={point}>{index === 0 ? <strong>{point}</strong> : point}</li>
          ))}
        </ul>
      </div>
      <div className="site-hero__planner-form-wrap">
        <h3 className="site-hero__planner-form-title">{plannerCopy.formTitle}</h3>
        <form
          action={toSitePath('/plan-your-trip')}
          className="site-hero__planner-form"
          method="get"
        >
          <label className="site-hero__planner-field">
            <span>{plannerCopy.destinationLabel}</span>
            <select
              aria-label={plannerCopy.destinationLabel}
              className="site-hero__planner-input"
              name="destination"
            >
              {plannerCopy.destinations.map((option) => (
                <option key={option.value || 'destination-placeholder'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="site-hero__planner-field">
            <span>{plannerCopy.durationLabel}</span>
            <select
              aria-label={plannerCopy.durationLabel}
              className="site-hero__planner-input"
              name="duration"
            >
              {plannerCopy.durations.map((option) => (
                <option key={option.value || 'duration-placeholder'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="site-hero__planner-field">
            <span className="site-hero__planner-field-label">
              {plannerCopy.monthLabelBase}
              {'\u00A0'}
              <span className="site-hero__planner-field-hint">{plannerCopy.monthLabelHint}</span>
            </span>
            <select
              aria-label={plannerCopy.monthLabel}
              className="site-hero__planner-input"
              name="month"
            >
              {plannerCopy.months.map((option) => (
                <option key={option.value || 'month-placeholder'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="site-hero__planner-styles">
            <legend>{plannerCopy.styleLabel}</legend>
            <div
              className="site-hero__planner-style-chips"
              role="group"
              aria-label={plannerCopy.styleLabel}
            >
              {plannerCopy.styles.map((style, index) => (
                <label className="site-hero__planner-style-chip" key={style.value}>
                  <input
                    defaultChecked={index === 0}
                    name="style"
                    type="radio"
                    value={style.value}
                  />
                  <span>{style.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button className="site-hero__planner-submit" type="submit">
            {plannerCopy.ctaLabel}
          </button>
        </form>
        <p className="site-hero__planner-footnote">
          {plannerCopy.fullBriefPrefix}{' '}
          <CMSLink
            appearance="inline"
            className="site-hero__planner-footnote-link"
            label={plannerCopy.fullBriefLink}
            type="custom"
            url="/plan-your-trip"
          />
          <span className="site-hero__planner-footnote-sep"> · </span>
          <span className="site-hero__planner-footnote-note">{plannerCopy.sameTeamNote}</span>
        </p>
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
        preset={{
          ...(resolved.preset || {}),
          key: resolved.preset?.key || resolved.presetKey,
        }}
        resolvedLocale={props.resolvedLocale}
        richText={richText}
        slides={(props as HighImpactHeroData & { slides?: HeroPresentationProps['slides'] }).slides}
        supportingMedia={supportingMedia}
        video={(props as HighImpactHeroData & { video?: HeroPresentationProps['video'] }).video}
      />
    </section>
  )
}
