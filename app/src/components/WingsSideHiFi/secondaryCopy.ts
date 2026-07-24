import type { WingsSideHiFiAssetKey } from '@/utilities/wingsSideHiFiMedia'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'

export type WingsSideSecondaryRoute =
  | '/about-us'
  | '/contact-us'
  | '/destinations'
  | '/packages'
  | '/styles'
  | '/travel-guide'

export type WingsSideSecondaryHeroCopy = {
  breadcrumb: string
  eyebrow: string
  lede: string
  media: WingsSideHiFiAssetKey
  mediaCap: string
  primary: string
  secondary: string
  title: string
}

type LocaleCopy = Record<WingsSideSecondaryRoute, WingsSideSecondaryHeroCopy>

const en: LocaleCopy = {
  '/destinations': {
    breadcrumb: 'Destinations',
    eyebrow: 'Destination hub',
    title: 'Explore Vietnam by destination',
    lede: "From Ha Long's karsts to Hoi An's lantern streets - pick a region to start shaping your private route. Six gateways. Endless combinations.",
    primary: 'Browse destinations',
    secondary: 'Not sure? Plan a trip',
    media: 'hoian',
    mediaCap: 'Hoi An - heritage coast',
  },
  '/styles': {
    breadcrumb: 'Travel styles',
    eyebrow: 'Self-qualify',
    title: 'How do you want to travel Vietnam?',
    lede: 'Pick a rhythm before places. Style pages help you self-qualify - then carry that choice into your planning brief.',
    primary: 'Browse styles',
    secondary: 'Start a brief',
    media: 'luxury',
    mediaCap: 'Luxury pacing - curated stays',
  },
  '/packages': {
    breadcrumb: 'Sample journeys',
    eyebrow: 'Samples - not departures',
    title: 'Which Vietnam story pulls you in first?',
    lede: 'Private frames with indicative pricing - react to the shape, then we rewrite around your dates. Not locked group departures.',
    primary: 'Browse samples',
    secondary: 'Have dates? Plan your trip',
    media: 'hanoi',
    mediaCap: 'Multi-region starting frame',
  },
  '/travel-guide': {
    breadcrumb: 'Travel guide',
    eyebrow: 'Notes - trust + SEO',
    title: 'Vietnam travel notes from a local planning team',
    lede: 'Seasonality, logistics, and destination context - written for guests preparing a private journey, not as an SEO memo.',
    primary: 'Read latest notes',
    secondary: 'Plan a trip',
    media: 'culture',
    mediaCap: 'Practical notes - local desk',
  },
  '/about-us': {
    breadcrumb: 'About',
    eyebrow: 'Trust',
    title: 'Local planners for private Vietnam journeys',
    lede: 'WingSide designs inbound Vietnam trips with destination-led discovery and consultative planning - private groups, families, and business travelers.',
    primary: 'Plan your trip',
    secondary: 'Contact',
    media: 'adventure',
    mediaCap: 'On-ground planning - Vietnam',
  },
  '/contact-us': {
    breadcrumb: 'Contact',
    eyebrow: 'Inquiry hub',
    title: 'Tell us about your Vietnam journey',
    lede: 'Share dates and ideas - we reply within 1 business day (GMT+7). Prefer a full planning brief? Use Plan your trip.',
    primary: 'Write a message',
    secondary: 'Full planning brief',
    media: 'hue',
    mediaCap: 'One visual - real place',
  },
}

const localize = (overrides: Partial<Record<WingsSideSecondaryRoute, Partial<WingsSideSecondaryHeroCopy>>>): LocaleCopy =>
  Object.fromEntries(
    Object.entries(en).map(([route, value]) => [route, { ...value, ...(overrides[route as WingsSideSecondaryRoute] || {}) }]),
  ) as LocaleCopy

const vi = localize({
  '/destinations': { breadcrumb: 'Điểm đến', eyebrow: 'Trung tâm điểm đến', title: 'Khám phá Việt Nam theo điểm đến', lede: 'Từ núi đá Hạ Long đến phố đèn lồng Hội An - chọn một vùng để bắt đầu định hình tuyến riêng.', primary: 'Xem điểm đến', secondary: 'Chưa chắc? Lên kế hoạch' },
  '/styles': { breadcrumb: 'Phong cách du lịch', eyebrow: 'Chọn đúng nhịp', title: 'Bạn muốn đi Việt Nam theo cách nào?', lede: 'Chọn nhịp trước khi chọn nơi. Đưa lựa chọn đó vào brief lập kế hoạch.', primary: 'Xem phong cách', secondary: 'Bắt đầu brief' },
  '/packages': { breadcrumb: 'Hành trình mẫu', eyebrow: 'Mẫu tham khảo - không phải tour ghép', title: 'Câu chuyện Việt Nam nào thu hút bạn trước?', lede: 'Khung hành trình riêng với giá tham khảo - chúng tôi viết lại theo ngày của bạn.', primary: 'Xem hành trình mẫu', secondary: 'Đã có ngày? Gửi brief' },
  '/travel-guide': { breadcrumb: 'Cẩm nang', eyebrow: 'Ghi chú địa phương', title: 'Ghi chú du lịch Việt Nam từ đội lập kế hoạch địa phương', lede: 'Mùa vụ, logistics và bối cảnh điểm đến cho khách chuẩn bị hành trình riêng.', primary: 'Đọc ghi chú mới', secondary: 'Lên kế hoạch' },
  '/about-us': { breadcrumb: 'Giới thiệu', eyebrow: 'Tin cậy', title: 'Đội lập kế hoạch địa phương cho hành trình Việt Nam riêng', lede: 'WingSide thiết kế chuyến Việt Nam theo điểm đến và tư vấn cho đoàn riêng, gia đình và khách công vụ.', primary: 'Lên kế hoạch', secondary: 'Liên hệ' },
  '/contact-us': { breadcrumb: 'Liên hệ', eyebrow: 'Trung tâm yêu cầu', title: 'Hãy kể về hành trình Việt Nam của bạn', lede: 'Chia sẻ ngày và ý tưởng - chúng tôi phản hồi trong 1 ngày làm việc (GMT+7).', primary: 'Gửi tin nhắn', secondary: 'Mở brief đầy đủ' },
})

const it = localize({
  '/destinations': { breadcrumb: 'Destinazioni', title: 'Esplora il Vietnam per destinazione', primary: 'Esplora destinazioni', secondary: 'Pianifica il viaggio' },
  '/styles': { breadcrumb: 'Stili di viaggio', title: 'Come vuoi viaggiare in Vietnam?', primary: 'Esplora gli stili', secondary: 'Inizia il brief' },
  '/packages': { breadcrumb: 'Viaggi di esempio', title: 'Quale storia del Vietnam ti attira per prima?', primary: 'Esplora esempi', secondary: 'Pianifica il viaggio' },
  '/travel-guide': { breadcrumb: 'Guida', title: 'Note sul Vietnam dal team locale', primary: 'Leggi le note', secondary: 'Pianifica' },
  '/about-us': { breadcrumb: 'Chi siamo', title: 'Planner locali per viaggi privati in Vietnam', primary: 'Pianifica', secondary: 'Contatti' },
  '/contact-us': { breadcrumb: 'Contatti', title: 'Raccontaci il tuo viaggio in Vietnam', primary: 'Scrivi un messaggio', secondary: 'Brief completo' },
})

const es = localize({
  '/destinations': { breadcrumb: 'Destinos', title: 'Explora Vietnam por destino', primary: 'Ver destinos', secondary: 'Planifica el viaje' },
  '/styles': { breadcrumb: 'Estilos de viaje', title: 'Como quieres viajar por Vietnam?', primary: 'Ver estilos', secondary: 'Inicia el brief' },
  '/packages': { breadcrumb: 'Viajes de muestra', title: 'Que historia de Vietnam te atrae primero?', primary: 'Ver muestras', secondary: 'Planifica el viaje' },
  '/travel-guide': { breadcrumb: 'Guia', title: 'Notas de Vietnam del equipo local', primary: 'Leer notas', secondary: 'Planifica' },
  '/about-us': { breadcrumb: 'Nosotros', title: 'Planificadores locales para viajes privados por Vietnam', primary: 'Planifica', secondary: 'Contacto' },
  '/contact-us': { breadcrumb: 'Contacto', title: 'Cuentanos tu viaje por Vietnam', primary: 'Escribe un mensaje', secondary: 'Brief completo' },
})

const pt = localize({
  '/destinations': { breadcrumb: 'Destinos', title: 'Explore o Vietname por destino', primary: 'Ver destinos', secondary: 'Planear viagem' },
  '/styles': { breadcrumb: 'Estilos de viagem', title: 'Como quer viajar pelo Vietname?', primary: 'Ver estilos', secondary: 'Iniciar brief' },
  '/packages': { breadcrumb: 'Viagens de exemplo', title: 'Que historia do Vietname o atrai primeiro?', primary: 'Ver exemplos', secondary: 'Planear viagem' },
  '/travel-guide': { breadcrumb: 'Guia', title: 'Notas do Vietname da equipa local', primary: 'Ler notas', secondary: 'Planear' },
  '/about-us': { breadcrumb: 'Sobre', title: 'Planeadores locais para viagens privadas no Vietname', primary: 'Planear', secondary: 'Contacto' },
  '/contact-us': { breadcrumb: 'Contacto', title: 'Conte-nos sobre a sua viagem ao Vietname', primary: 'Enviar mensagem', secondary: 'Brief completo' },
})

const copies: Partial<Record<SupportedLocaleCode, LocaleCopy>> = { en, es, it, pt, vi }

export const getWingsSideSecondaryHeroCopy = (locale: null | string | undefined, route: WingsSideSecondaryRoute) =>
  (copies[(locale as SupportedLocaleCode) || 'en'] || en)[route]
