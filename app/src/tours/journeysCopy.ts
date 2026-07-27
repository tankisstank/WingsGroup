import type { DiscoveryDurationCode, DiscoveryFilterKey } from './discoveryCore'
import type { TourDestinationKey, TourTravelStyleKey } from './taxonomy'

export const wingSideJourneyLocales = ['en', 'vi', 'it', 'es', 'pt'] as const
export type WingSideJourneyLocale = (typeof wingSideJourneyLocales)[number]

type JourneyCopy = {
  all: string
  contact: string
  destination: string
  duration: string
  emptyBody: string
  emptyTitle: string
  filters: string
  invalidNotice: string
  journey: string
  metaDescription: string
  metaTitle: string
  plan: string
  relaxed: Record<DiscoveryFilterKey, string>
  relaxedPrefix: string
  reset: string
  results: string
  style: string
  title: string
  view: string
}

export const destinationLabels: Record<
  WingSideJourneyLocale,
  Record<TourDestinationKey, string>
> = {
  en: {
    'da-nang': 'Da Nang',
    halong: 'Ha Long',
    hanoi: 'Hanoi',
    'ho-chi-minh-city': 'Ho Chi Minh City',
    hoian: 'Hoi An',
    hue: 'Hue',
    'mai-chau': 'Mai Chau',
    mekong: 'Mekong Delta',
    'ninh-binh': 'Ninh Binh',
    'ninh-thuan': 'Ninh Thuan',
    'phu-quoc': 'Phu Quoc',
    sapa: 'Sa Pa',
    'siem-reap': 'Siem Reap',
  },
  vi: {
    'da-nang': 'Đà Nẵng',
    halong: 'Hạ Long',
    hanoi: 'Hà Nội',
    'ho-chi-minh-city': 'TP. Hồ Chí Minh',
    hoian: 'Hội An',
    hue: 'Huế',
    'mai-chau': 'Mai Châu',
    mekong: 'Đồng bằng sông Cửu Long',
    'ninh-binh': 'Ninh Bình',
    'ninh-thuan': 'Ninh Thuận',
    'phu-quoc': 'Phú Quốc',
    sapa: 'Sa Pa',
    'siem-reap': 'Siem Reap',
  },
  it: {
    'da-nang': 'Da Nang',
    halong: 'Ha Long',
    hanoi: 'Hanoi',
    'ho-chi-minh-city': 'Ho Chi Minh City',
    hoian: 'Hoi An',
    hue: 'Hue',
    'mai-chau': 'Mai Chau',
    mekong: 'Delta del Mekong',
    'ninh-binh': 'Ninh Binh',
    'ninh-thuan': 'Ninh Thuan',
    'phu-quoc': 'Phu Quoc',
    sapa: 'Sa Pa',
    'siem-reap': 'Siem Reap',
  },
  es: {
    'da-nang': 'Da Nang',
    halong: 'Ha Long',
    hanoi: 'Hanói',
    'ho-chi-minh-city': 'Ciudad Ho Chi Minh',
    hoian: 'Hoi An',
    hue: 'Hue',
    'mai-chau': 'Mai Chau',
    mekong: 'Delta del Mekong',
    'ninh-binh': 'Ninh Binh',
    'ninh-thuan': 'Ninh Thuan',
    'phu-quoc': 'Phu Quoc',
    sapa: 'Sa Pa',
    'siem-reap': 'Siem Reap',
  },
  pt: {
    'da-nang': 'Da Nang',
    halong: 'Ha Long',
    hanoi: 'Hanói',
    'ho-chi-minh-city': 'Cidade de Ho Chi Minh',
    hoian: 'Hoi An',
    hue: 'Hue',
    'mai-chau': 'Mai Chau',
    mekong: 'Delta do Mekong',
    'ninh-binh': 'Ninh Binh',
    'ninh-thuan': 'Ninh Thuan',
    'phu-quoc': 'Phu Quoc',
    sapa: 'Sa Pa',
    'siem-reap': 'Siem Reap',
  },
}

export const styleLabels: Record<WingSideJourneyLocale, Record<TourTravelStyleKey, string>> = {
  en: {
    adventure: 'Adventure',
    business: 'Business',
    culture: 'Culture',
    family: 'Family',
    luxury: 'Luxury',
    romance: 'Romance',
    wellness: 'Wellness',
  },
  vi: {
    adventure: 'Phiêu lưu',
    business: 'Công vụ',
    culture: 'Văn hóa',
    family: 'Gia đình',
    luxury: 'Sang trọng',
    romance: 'Lãng mạn',
    wellness: 'Nghỉ dưỡng',
  },
  it: {
    adventure: 'Avventura',
    business: 'Business',
    culture: 'Cultura',
    family: 'Famiglia',
    luxury: 'Lusso',
    romance: 'Romantico',
    wellness: 'Benessere',
  },
  es: {
    adventure: 'Aventura',
    business: 'Negocios',
    culture: 'Cultura',
    family: 'Familia',
    luxury: 'Lujo',
    romance: 'Romance',
    wellness: 'Bienestar',
  },
  pt: {
    adventure: 'Aventura',
    business: 'Negócios',
    culture: 'Cultura',
    family: 'Família',
    luxury: 'Luxo',
    romance: 'Romance',
    wellness: 'Bem-estar',
  },
}

export const durationLabels: Record<
  WingSideJourneyLocale,
  Record<DiscoveryDurationCode, string>
> = {
  en: { '1-7': '1-7 days', '8-14': '8-14 days', '15-plus': '15+ days' },
  vi: { '1-7': '1-7 ngày', '8-14': '8-14 ngày', '15-plus': '15+ ngày' },
  it: { '1-7': '1-7 giorni', '8-14': '8-14 giorni', '15-plus': '15+ giorni' },
  es: { '1-7': '1-7 días', '8-14': '8-14 días', '15-plus': '15+ días' },
  pt: { '1-7': '1-7 dias', '8-14': '8-14 dias', '15-plus': '15+ dias' },
}

const copy: Record<WingSideJourneyLocale, JourneyCopy> = {
  en: {
    all: 'All',
    contact: 'Contact us',
    destination: 'Destination',
    duration: 'Duration',
    emptyBody: 'Share your trip preferences and our planning team will shape suitable options.',
    emptyTitle: 'No published journey matches yet',
    filters: 'Filters',
    invalidNotice: 'Some filter values were removed because they are not available.',
    journey: 'Private journey',
    metaDescription:
      'Explore published WingSide private journeys by destination, travel style, and duration.',
    metaTitle: 'Journeys',
    plan: 'Plan trip',
    relaxed: { destination: 'destination', duration: 'duration', style: 'travel style' },
    relaxedPrefix: 'No exact match. Showing broader results after removing',
    reset: 'Reset filters',
    results: 'Results',
    style: 'Style',
    title: 'Find a private Vietnam journey',
    view: 'View journey',
  },
  vi: {
    all: 'Tất cả',
    contact: 'Liên hệ',
    destination: 'Điểm đến',
    duration: 'Thời lượng',
    emptyBody: 'Gửi thông tin chuyến đi để đội ngũ tư vấn đề xuất lựa chọn phù hợp.',
    emptyTitle: 'Chưa có hành trình đã xuất bản phù hợp',
    filters: 'Bộ lọc',
    invalidNotice: 'Một số giá trị lọc đã được bỏ vì không khả dụng.',
    journey: 'Hành trình riêng',
    metaDescription: 'Khám phá hành trình riêng WingSide theo điểm đến, phong cách và thời lượng.',
    metaTitle: 'Hành trình',
    plan: 'Lên kế hoạch',
    relaxed: { destination: 'điểm đến', duration: 'thời lượng', style: 'phong cách' },
    relaxedPrefix: 'Chưa có kết quả khớp đủ. Đang hiển thị rộng hơn sau khi bỏ',
    reset: 'Xóa bộ lọc',
    results: 'Kết quả',
    style: 'Phong cách',
    title: 'Tìm hành trình Việt Nam riêng',
    view: 'Xem hành trình',
  },
  it: {
    all: 'Tutti',
    contact: 'Contattaci',
    destination: 'Destinazione',
    duration: 'Durata',
    emptyBody: 'Invia la tua richiesta e il nostro team creerà proposte adatte al viaggio.',
    emptyTitle: 'Nessun viaggio pubblicato corrisponde ancora',
    filters: 'Filtri',
    invalidNotice: 'Alcuni valori filtro sono stati rimossi perché non disponibili.',
    journey: 'Viaggio privato',
    metaDescription: 'Esplora viaggi privati WingSide per destinazione, stile e durata.',
    metaTitle: 'Viaggi',
    plan: 'Pianifica',
    relaxed: { destination: 'destinazione', duration: 'durata', style: 'stile di viaggio' },
    relaxedPrefix: 'Nessuna corrispondenza esatta. Risultati più ampi dopo aver rimosso',
    reset: 'Reimposta filtri',
    results: 'Risultati',
    style: 'Stile',
    title: 'Trova un viaggio privato in Vietnam',
    view: 'Vedi viaggio',
  },
  es: {
    all: 'Todos',
    contact: 'Contáctanos',
    destination: 'Destino',
    duration: 'Duración',
    emptyBody:
      'Envía tus preferencias y el equipo de planificación preparará opciones adecuadas.',
    emptyTitle: 'Aún no hay viajes publicados que coincidan',
    filters: 'Filtros',
    invalidNotice: 'Se eliminaron algunos valores de filtro porque no están disponibles.',
    journey: 'Viaje privado',
    metaDescription: 'Explora viajes privados WingSide por destino, estilo y duración.',
    metaTitle: 'Viajes',
    plan: 'Planifica',
    relaxed: { destination: 'destino', duration: 'duración', style: 'estilo de viaje' },
    relaxedPrefix: 'No hay coincidencia exacta. Mostrando resultados más amplios tras quitar',
    reset: 'Restablecer filtros',
    results: 'Resultados',
    style: 'Estilo',
    title: 'Encuentra un viaje privado por Vietnam',
    view: 'Ver viaje',
  },
  pt: {
    all: 'Todos',
    contact: 'Fale conosco',
    destination: 'Destino',
    duration: 'Duração',
    emptyBody: 'Envie as suas preferências e a equipa de planeamento criará opções adequadas.',
    emptyTitle: 'Ainda não há viagens publicadas correspondentes',
    filters: 'Filtros',
    invalidNotice: 'Alguns valores de filtro foram removidos por não estarem disponíveis.',
    journey: 'Viagem privada',
    metaDescription: 'Explore viagens privadas WingSide por destino, estilo e duração.',
    metaTitle: 'Viagens',
    plan: 'Planear',
    relaxed: { destination: 'destino', duration: 'duração', style: 'estilo de viagem' },
    relaxedPrefix: 'Sem correspondência exata. A mostrar resultados mais amplos após remover',
    reset: 'Repor filtros',
    results: 'Resultados',
    style: 'Estilo',
    title: 'Encontre uma viagem privada no Vietname',
    view: 'Ver viagem',
  },
}

export const isWingSideJourneyLocale = (locale?: null | string): locale is WingSideJourneyLocale =>
  wingSideJourneyLocales.includes(locale as WingSideJourneyLocale)

export const getWingSideJourneysCopy = (locale: WingSideJourneyLocale) => copy[locale]
