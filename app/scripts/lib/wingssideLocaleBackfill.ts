import type { Payload, PayloadRequest } from 'payload'
import type { PublicLocaleCode } from '../../src/i18n/publicCopy'
import { wingsSideLocalizationBackfillContext } from '../../src/utilities/wingsSideLocalizationBackfillContext'
import { backfillWingsSideSiteSettings } from './wingssideSiteSettingsBackfill'
import { applyWingsSideEditorialTerminology } from './wingssideEditorialTerminology'

type SupportedBackfillLocale = 'en' | 'es' | 'it' | 'pt' | 'vi'

type SeedRichText = {
  root: {
    type: 'root'
    children: Array<Record<string, unknown> & { type: string; version: number }>
    direction: 'ltr' | 'rtl' | null
    format: '' | 'center' | 'end' | 'justify' | 'left' | 'right' | 'start'
    indent: number
    version: number
  }
}

type RichTextSection =
  | {
      kind: 'heading'
      tag?: 'h1' | 'h2' | 'h3' | 'h4'
      text: string
    }
  | {
      kind: 'paragraph'
      text: string
    }

type PayloadBlock = Record<string, unknown> & {
  blockType?: string
  categories?: unknown
  form?: unknown
  media?: unknown
}

type PageDoc = {
  hero?: (Record<string, unknown> & { media?: unknown }) | null
  id: number | string
  layout?: PayloadBlock[]
  meta?: Record<string, unknown> | null
  pathname?: null | string
  relatedPages?: Array<number | string | { id: number | string }>
  slug?: null | string
  title?: null | string
}

const seedData = <T>(data: T) => data as never

const isSQLiteBusyError = (error: unknown): boolean => {
  const text = error instanceof Error ? `${error.message} ${String(error.cause || '')}` : String(error)

  return /SQLITE_BUSY|database is locked/i.test(text)
}

const withSQLiteBusyRetry = async <T>(operation: () => Promise<T>): Promise<T> => {
  let attempt = 0
  while (true) {
    try {
      return await operation()
    } catch (error) {
      attempt += 1
      if (attempt >= 5 || !isSQLiteBusyError(error)) throw error
      await new Promise((resolve) => setTimeout(resolve, attempt * 250))
    }
  }
}

const richTextFromSections = (sections: readonly RichTextSection[]): SeedRichText => ({
  root: {
    type: 'root',
    children: sections.map((section) => {
      if (section.kind === 'heading') {
        return {
          type: 'heading',
          children: [
            {
              type: 'text',
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text: section.text,
              version: 1,
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          tag: section.tag || 'h2',
          version: 1,
        }
      }

      return {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: section.text,
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        textFormat: 0,
        version: 1,
      }
    }),
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  },
})

const richText = (
  heading: string,
  paragraph: string,
  tag: 'h1' | 'h2' | 'h3' = 'h2',
): SeedRichText =>
  richTextFromSections([
    {
      kind: 'heading',
      tag,
      text: heading,
    },
    {
      kind: 'paragraph',
      text: paragraph,
    },
  ])

const linkItem = (label: string, url: string, appearance: 'default' | 'outline' = 'default') => ({
  link: {
    type: 'custom' as const,
    appearance,
    label,
    url,
  },
})

const contentBlock = (
  columns: Array<{
    paragraph: string
    size: 'full' | 'half' | 'oneThird' | 'twoThirds'
    title: string
  }>,
) => ({
  blockType: 'content' as const,
  columns: columns.map((column) => ({
    size: column.size,
    richText: richText(column.title, column.paragraph, column.size === 'full' ? 'h2' : 'h3'),
  })),
})

const featureGridBlock = (
  title: string,
  description: string,
  items: Array<
    {
      description: string
      eyebrow?: string
      imageID?: number | string
      label?: string
      meta?: string
      url?: string
    } & { title: string }
  >,
  variant: 'default' | 'highlight' | 'minimal' = 'default',
  eyebrow?: string,
  presentation:
    | 'accordion'
    | 'alternating'
    | 'before-after'
    | 'bento'
    | 'icon-grid'
    | 'icon-wall'
    | 'sticky-reveal'
    | 'tabs' = 'icon-grid',
  defaultLinkLabel = 'Explore',
) => ({
  blockType: 'featureGrid' as const,
  columns: '3',
  description,
  eyebrow,
  items: items.map((item) => ({
    description: item.description,
    eyebrow: item.eyebrow,
    enableLink: Boolean(item.url),
    image: item.imageID,
    meta: item.meta,
    title: item.title,
    ...(item.url
      ? {
          link: {
            type: 'custom' as const,
            label: item.label || defaultLinkLabel,
            url: item.url,
          },
        }
      : {}),
  })),
  presentation,
  title,
  variant,
})

const infoStripBlock = (
  title: string,
  description: string,
  items: Array<{ description?: string; label: string; value?: string }>,
  eyebrow?: string,
) => ({
  blockType: 'infoStrip' as const,
  description,
  eyebrow,
  items,
  title,
})

const statsBlock = (
  title: string,
  description: string,
  items: Array<{
    description?: string
    label: string
    progress?: number
    value: string
  }>,
  presentation:
    | 'card-grid'
    | 'editorial'
    | 'floating'
    | 'inline-bar'
    | 'logo-proof'
    | 'progress'
    | 'split-statement' = 'inline-bar',
  eyebrow?: string,
) => ({
  blockType: 'stats' as const,
  description,
  eyebrow,
  items,
  presentation,
  title,
})

const testimonialBlock = (
  title: string,
  description: string,
  items: Array<{
    country?: string
    name: string
    noteDate?: string
    quote: string
    rating?: number
    role?: string
  }>,
  presentation:
    | 'carousel'
    | 'featured'
    | 'logo-cloud'
    | 'marquee'
    | 'masonry'
    | 'quote-grid'
    | 'social-wall'
    | 'video' = 'quote-grid',
  eyebrow?: string,
) => ({
  blockType: 'testimonial' as const,
  description,
  eyebrow,
  items: items.map((item) => ({
    ...item,
    rating: item.rating ?? null,
  })),
  presentation,
  title,
})

const ctaBlock = (title: string, paragraph: string, links: Array<ReturnType<typeof linkItem>>) => ({
  blockType: 'cta' as const,
  links,
  richText: richText(title, paragraph),
})

const mediaBlock = (media: number | string) => ({
  blockType: 'mediaBlock' as const,
  media,
})

const formBlock = (form: number | string, title: string, paragraph: string) => ({
  blockType: 'formBlock' as const,
  enableIntro: true,
  form,
  introContent: richText(title, paragraph),
})

const archiveBlock = (
  categoryIDs: Array<number | string>,
  title: string,
  paragraph: string,
  limit = 3,
) => ({
  blockType: 'archive' as const,
  categories: categoryIDs,
  introContent: richText(title, paragraph),
  limit,
  populateBy: 'collection' as const,
  relationTo: 'posts' as const,
})

const stripGeneratedIDs = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stripGeneratedIDs)
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== 'id')
      .map(([key, entry]) => [key, stripGeneratedIDs(entry)]),
  )
}

const normalizeRelationID = (value: unknown): number | string | null => {
  if (!value) return null
  if (typeof value === 'number' || typeof value === 'string') return value
  if (typeof value === 'object' && 'id' in (value as Record<string, unknown>)) {
    const id = (value as { id?: number | string }).id
    return typeof id === 'number' || typeof id === 'string' ? id : null
  }

  return null
}

const relationIDs = (value: unknown): Array<number | string> =>
  Array.isArray(value)
    ? value
        .map((entry) => normalizeRelationID(entry))
        .filter((entry): entry is number | string => Boolean(entry))
    : []

const findFirstRelationValue = (
  value: unknown,
  matcher: (entryKey: string, entryValue: unknown) => number | string | null,
): number | string | null => {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const match = findFirstRelationValue(entry, matcher)
      if (match) return match
    }

    return null
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  for (const [entryKey, entryValue] of Object.entries(value as Record<string, unknown>)) {
    const directMatch = matcher(entryKey, entryValue)
    if (directMatch) return directMatch

    const nestedMatch = findFirstRelationValue(entryValue, matcher)
    if (nestedMatch) return nestedMatch
  }

  return null
}

const findFirstRelationList = (
  value: unknown,
  matcher: (entryKey: string, entryValue: unknown) => Array<number | string>,
): Array<number | string> => {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const match = findFirstRelationList(entry, matcher)
      if (match.length > 0) return match
    }

    return []
  }

  if (!value || typeof value !== 'object') {
    return []
  }

  for (const [entryKey, entryValue] of Object.entries(value as Record<string, unknown>)) {
    const directMatch = matcher(entryKey, entryValue)
    if (directMatch.length > 0) return directMatch

    const nestedMatch = findFirstRelationList(entryValue, matcher)
    if (nestedMatch.length > 0) return nestedMatch
  }

  return []
}

const relationArrayKeys = new Set(['categories', 'relatedPages'])
const relationScalarKeys = new Set(['form', 'image', 'media'])

const normalizeComparableValue = (value: unknown, key?: string): unknown => {
  if (relationArrayKeys.has(key || '')) {
    return relationIDs(value)
  }

  if (relationScalarKeys.has(key || '')) {
    return normalizeRelationID(value)
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeComparableValue(entry))
  }

  if (value === null || value === undefined) {
    return undefined
  }

  if (typeof value !== 'object') {
    return value
  }

  const objectValue = value as Record<string, unknown>
  const normalizedEntries = Object.entries(objectValue)
    .filter(([entryKey]) => entryKey !== 'id')
    .map(
      ([entryKey, entryValue]) =>
        [entryKey, normalizeComparableValue(entryValue, entryKey)] as const,
    )
    .filter(([, entryValue]) => {
      if (entryValue === undefined) return false
      if (Array.isArray(entryValue)) return true
      return !(
        entryValue &&
        typeof entryValue === 'object' &&
        Object.keys(entryValue as Record<string, unknown>).length === 0
      )
    })
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))

  return Object.fromEntries(normalizedEntries)
}

const comparablePageData = (value: Record<string, unknown>) =>
  normalizeComparableValue(stripGeneratedIDs(value)) as Record<string, unknown>

const projectToTargetShape = (current: unknown, target: unknown): unknown => {
  if (Array.isArray(target)) {
    if (!Array.isArray(current)) return current
    return current.map((entry, index) => projectToTargetShape(entry, target[index]))
  }

  if (target && typeof target === 'object') {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return current

    const currentRecord = current as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(target as Record<string, unknown>).map(([key, targetValue]) => [
        key,
        projectToTargetShape(currentRecord[key], targetValue),
      ]),
    )
  }

  return current
}

const collectDifferencePaths = (current: unknown, target: unknown, path = '$'): string[] => {
  if (JSON.stringify(current) === JSON.stringify(target)) return []

  if (Array.isArray(current) && Array.isArray(target)) {
    const differences = current.length === target.length ? [] : [`${path}.length`]
    const length = Math.max(current.length, target.length)

    for (let index = 0; index < length; index += 1) {
      differences.push(
        ...collectDifferencePaths(current[index], target[index], `${path}[${index}]`),
      )
    }

    return differences
  }

  if (
    current &&
    target &&
    typeof current === 'object' &&
    typeof target === 'object' &&
    !Array.isArray(current) &&
    !Array.isArray(target)
  ) {
    const currentRecord = current as Record<string, unknown>
    const targetRecord = target as Record<string, unknown>
    const keys = new Set([...Object.keys(currentRecord), ...Object.keys(targetRecord)])

    return [...keys].flatMap((key) =>
      collectDifferencePaths(currentRecord[key], targetRecord[key], `${path}.${key}`),
    )
  }

  return [path]
}

const updatePageLocale = async (
  payload: Payload,
  req: PayloadRequest,
  pageID: number | string,
  locale: SupportedBackfillLocale,
  data: Record<string, unknown>,
  options: {
    dryRun?: boolean
  } = {},
) => {
  const { pathname: _pathname, site: _site, slug: _slug, ...localizedData } = data
  const targetData = comparablePageData(localizedData)
  const currentLocalePage = await payload.findByID({
    collection: 'pages',
    depth: 0,
    id: pageID,
    locale,
    overrideAccess: true,
    req,
  })
  const currentComparableData = comparablePageData({
    hero: currentLocalePage.hero || null,
    layout: currentLocalePage.layout || [],
    meta: currentLocalePage.meta || null,
    relatedPages: currentLocalePage.relatedPages || [],
    title: currentLocalePage.title || null,
  })
  const currentData = projectToTargetShape(currentComparableData, targetData) as Record<
    string,
    unknown
  >

  if (JSON.stringify(currentData) === JSON.stringify(targetData)) {
    return { action: 'skip' as const }
  }

  if (process.env.WINGSSIDE_BACKFILL_DEBUG_DIFF === '1') {
    req.payload.logger.info({
      currentData,
      differencePaths: collectDifferencePaths(currentData, targetData),
      locale,
      message: 'WingSide locale backfill comparison mismatch',
      pageID,
      targetData,
    })
  }

  if (options.dryRun) {
    return { action: 'update' as const }
  }

  await withSQLiteBusyRetry(() =>
    payload.update({
      collection: 'pages',
      id: pageID,
      locale,
      req,
      context: wingsSideLocalizationBackfillContext,
      data: seedData(stripGeneratedIDs(localizedData)),
    }),
  )

  return { action: 'update' as const }
}

const localizedRouteCards = {
  en: {
    centralHeritage: 'Central Heritage',
    contactUs: 'Contact',
    destinations: 'Destinations',
    explore: 'Explore',
    family: 'Family',
    guide: 'Travel guide',
    luxury: 'Luxury',
    mekong: 'Mekong',
    northernVietnam: 'Northern Vietnam',
    packages: 'Vietnam packages',
    plan: 'Plan your trip',
    styles: 'Travel styles',
    testimonials: 'Trust',
    vietnamHighlights: 'Vietnam Highlights',
  },
  vi: {
    centralHeritage: 'Di sản miền Trung',
    contactUs: 'Liên hệ',
    destinations: 'Điểm đến',
    explore: 'Khám phá',
    family: 'Gia đình',
    guide: 'Cẩm nang du lịch',
    luxury: 'Cao cấp',
    mekong: 'Mekong',
    northernVietnam: 'Miền Bắc Việt Nam',
    packages: 'Gói Việt Nam',
    plan: 'Lên kế hoạch',
    styles: 'Phong cách du lịch',
    testimonials: 'Niềm tin',
    vietnamHighlights: 'Điểm nổi bật Việt Nam',
  },
  it: {
    centralHeritage: 'Patrimonio centrale',
    contactUs: 'Contatti',
    destinations: 'Destinazioni',
    explore: 'Scopri',
    family: 'Famiglia',
    guide: 'Guida di viaggio',
    luxury: 'Lusso',
    mekong: 'Mekong',
    northernVietnam: 'Vietnam del Nord',
    packages: 'Pacchetti Vietnam',
    plan: 'Pianifica il viaggio',
    styles: 'Stili di viaggio',
    testimonials: 'Fiducia',
    vietnamHighlights: 'Vietnam essenziale',
  },
  es: {
    centralHeritage: 'Patrimonio central',
    contactUs: 'Contacto',
    destinations: 'Destinos',
    explore: 'Explorar',
    family: 'Familia',
    guide: 'Guía de viaje',
    luxury: 'Lujo',
    mekong: 'Mekong',
    northernVietnam: 'Norte de Vietnam',
    packages: 'Paquetes Vietnam',
    plan: 'Planifica tu viaje',
    styles: 'Estilos de viaje',
    testimonials: 'Confianza',
    vietnamHighlights: 'Vietnam esencial',
  },
  pt: {
    centralHeritage: 'Património central',
    contactUs: 'Contacto',
    destinations: 'Destinos',
    explore: 'Explorar',
    family: 'Família',
    guide: 'Guia de viagem',
    luxury: 'Luxo',
    mekong: 'Mekong',
    northernVietnam: 'Norte do Vietname',
    packages: 'Pacotes Vietname',
    plan: 'Planear a viagem',
    styles: 'Estilos de viagem',
    testimonials: 'Confiança',
    vietnamHighlights: 'Vietname essencial',
  },
} as const

const planningNoteMetadata = {
  en: ['United Kingdom', 'Italy', 'Australia'],
  vi: ['Vương quốc Anh', 'Ý', 'Úc'],
  it: ['Regno Unito', 'Italia', 'Australia'],
  es: ['Reino Unido', 'Italia', 'Australia'],
  pt: ['Reino Unido', 'Itália', 'Austrália'],
} as const

const planningNoteDates = [
  '2026-07-02T00:00:00.000Z',
  '2026-07-05T00:00:00.000Z',
  '2026-07-08T00:00:00.000Z',
] as const

const additionalPlanningNotes = {
  en: [
    [
      'Spain',
      'Food and heritage brief',
      'We would like local food and heritage to connect naturally, with enough free time to enjoy each place.',
    ],
    [
      'Portugal',
      'Slow travel brief',
      'We prefer a slower journey with longer stays and fewer early departures, even if that means seeing fewer regions.',
    ],
    [
      'Singapore',
      'Short private escape brief',
      'We only have one week, so we need a focused route with private transfers and one strong cultural contrast.',
    ],
    [
      'Canada',
      'First-time Vietnam brief',
      'This is our first visit and we need help balancing iconic places with quieter experiences that feel personal.',
    ],
    [
      'Germany',
      'Active couple brief',
      'We want walking, cycling, and scenery, but also comfortable evenings and a route that does not feel rushed.',
    ],
  ],
  vi: [
    [
      'Tây Ban Nha',
      'Gợi ý ẩm thực và di sản',
      'Chúng tôi muốn kết nối ẩm thực địa phương với di sản, đồng thời có đủ thời gian tự do ở mỗi nơi.',
    ],
    [
      'Bồ Đào Nha',
      'Gợi ý du lịch chậm',
      'Chúng tôi thích ở lâu hơn và ít khởi hành sớm, ngay cả khi phải giảm số vùng ghé thăm.',
    ],
    [
      'Singapore',
      'Gợi ý kỳ nghỉ riêng ngắn ngày',
      'Chúng tôi chỉ có một tuần nên cần tuyến gọn, xe riêng và một điểm nhấn văn hóa rõ ràng.',
    ],
    [
      'Canada',
      'Gợi ý lần đầu đến Việt Nam',
      'Đây là lần đầu chúng tôi tới Việt Nam và cần cân bằng điểm nổi tiếng với trải nghiệm yên tĩnh hơn.',
    ],
    [
      'Đức',
      'Gợi ý cho cặp đôi năng động',
      'Chúng tôi muốn đi bộ, đạp xe và ngắm cảnh nhưng vẫn có buổi tối thoải mái, không vội vã.',
    ],
  ],
  it: [
    [
      'Spagna',
      'Brief cucina e patrimonio',
      'Vorremmo collegare cucina locale e patrimonio, lasciando tempo libero in ogni tappa.',
    ],
    [
      'Portogallo',
      'Brief slow travel',
      'Preferiamo soggiorni più lunghi e meno partenze presto, anche visitando meno regioni.',
    ],
    [
      'Singapore',
      'Brief fuga privata',
      'Abbiamo una settimana e cerchiamo una rotta mirata con transfer privati e contrasto culturale.',
    ],
    [
      'Canada',
      'Brief prima volta in Vietnam',
      'Vogliamo bilanciare luoghi iconici ed esperienze più tranquille e personali.',
    ],
    [
      'Germania',
      'Brief coppia attiva',
      'Cerchiamo camminate, bici e paesaggi, con serate comode e senza fretta.',
    ],
  ],
  es: [
    [
      'España',
      'Brief de gastronomía y patrimonio',
      'Queremos unir gastronomía local y patrimonio, con tiempo libre para disfrutar cada lugar.',
    ],
    [
      'Portugal',
      'Brief de viaje pausado',
      'Preferimos estancias más largas y menos salidas tempranas, aunque veamos menos regiones.',
    ],
    [
      'Singapur',
      'Brief de escapada privada',
      'Solo tenemos una semana y buscamos una ruta enfocada con traslados privados y contraste cultural.',
    ],
    [
      'Canadá',
      'Brief de primera visita',
      'Queremos equilibrar lugares icónicos con experiencias tranquilas y personales.',
    ],
    [
      'Alemania',
      'Brief de pareja activa',
      'Queremos caminar, pedalear y ver paisajes, con noches cómodas y sin prisas.',
    ],
  ],
  pt: [
    [
      'Espanha',
      'Brief de gastronomia e património',
      'Queremos ligar gastronomia local e património, com tempo livre para desfrutar de cada lugar.',
    ],
    [
      'Portugal',
      'Brief de viagem lenta',
      'Preferimos estadias mais longas e menos partidas cedo, mesmo visitando menos regiões.',
    ],
    [
      'Singapura',
      'Brief de escapadinha privada',
      'Temos uma semana e procuramos uma rota focada com transfers privados e contraste cultural.',
    ],
    [
      'Canadá',
      'Brief de primeira visita',
      'Queremos equilibrar lugares icónicos com experiências tranquilas e pessoais.',
    ],
    [
      'Alemanha',
      'Brief de casal ativo',
      'Queremos caminhadas, bicicleta e paisagem, com noites confortáveis e sem pressa.',
    ],
  ],
} as const

const planningLibraryStats = {
  en: [
    {
      label: 'Sample route frameworks',
      value: '3',
      description: 'Vietnam Highlights, Northern Vietnam, and Central Heritage.',
    },
    {
      label: 'Public languages',
      value: '5',
      description: 'Vietnamese, English, Italian, Spanish, and Portuguese.',
    },
  ],
  vi: [
    {
      label: 'Khung hành trình mẫu',
      value: '3',
      description: 'Điểm nổi bật Việt Nam, Miền Bắc và Di sản miền Trung.',
    },
    {
      label: 'Ngôn ngữ công khai',
      value: '5',
      description: 'Tiếng Việt, Anh, Ý, Tây Ban Nha và Bồ Đào Nha.',
    },
  ],
  it: [
    {
      label: 'Strutture di rotta',
      value: '3',
      description: 'Vietnam essenziale, Vietnam del Nord e Patrimonio centrale.',
    },
    {
      label: 'Lingue pubbliche',
      value: '5',
      description: 'Vietnamita, inglese, italiano, spagnolo e portoghese.',
    },
  ],
  es: [
    {
      label: 'Estructuras de ruta',
      value: '3',
      description: 'Vietnam esencial, Norte de Vietnam y Patrimonio central.',
    },
    {
      label: 'Idiomas públicos',
      value: '5',
      description: 'Vietnamita, inglés, italiano, español y portugués.',
    },
  ],
  pt: [
    {
      label: 'Estruturas de rota',
      value: '3',
      description: 'Vietname essencial, Norte do Vietname e Património central.',
    },
    {
      label: 'Idiomas públicos',
      value: '5',
      description: 'Vietnamita, inglês, italiano, espanhol e português.',
    },
  ],
} as const

const homeCopy = {
  en: {
    ctaDescription:
      'Move from inspiration into a practical planning conversation through the trip planner or the contact page.',
    ctaTitle: 'Ready to shape your Vietnam trip?',
    destinationsDescription:
      'The homepage surfaces destinations early because many inbound journeys begin with choosing where to go.',
    destinationsEyebrow: 'Destinations',
    destinationsTitle: 'Destination hub',
    heading: 'Tailor-made Vietnam journeys',
    heroEyebrow: 'Tailor-made Vietnam',
    links: [
      linkItem('Plan your trip', '/plan-your-trip'),
      linkItem('Explore destinations', '/destinations', 'outline'),
    ],
    meta: 'WingSide tailor-made Vietnam journeys',
    packagesDescription:
      'Itinerary cards are directional examples that help guests imagine what can be built without forcing a rigid catalog.',
    packagesEyebrow: 'Sample itineraries',
    packagesTitle: 'Sample itineraries',
    paragraph:
      'Private, flexible, locally designed experiences built through destination discovery, travel style guidance, and consultative planning.',
    planningNotesDescription:
      'The carousel uses sample planning notes; real reviews should only appear after clear provenance is available.',
    planningNotesEyebrow: 'Planning signals',
    planningNotesTitle: 'Traveler notes for planning',
    slideDestinationDescription:
      'Explore Hanoi, Ha Long, Hoi An, Hue, and the Mekong through route ideas that can be shaped around your group.',
    slideDestinationEyebrow: 'Destination-led planning',
    slideDestinationTitle: 'Start with places, not packages',
    slideStyleDescription:
      'Use travel styles as a briefing shortcut before the team turns your ideas into a practical route.',
    slideStyleEyebrow: 'Travel styles',
    slideStyleTitle: 'Culture, family, luxury, slow travel',
    statsDescription:
      'Published entry points help guests move from broad inspiration to a more focused travel brief.',
    statsEyebrow: 'Planning at a glance',
    statsTitle: 'Explore the planning library',
    stylesDescription:
      'Travel styles help guests self-qualify their journey before choosing a specific itinerary shape.',
    stylesEyebrow: 'Travel themes',
    stylesTitle: 'Travel styles',
    trustDescription:
      'Each path opens a deeper guide so guests can compare route ideas and prepare a more useful trip brief.',
    trustEyebrow: 'Start planning',
    trustTitle: 'Build your Vietnam journey from the right starting point',
    whyDescription:
      'Inbound guests need to trust the operator before they send a detailed planning brief.',
    whyEyebrow: 'How we plan',
    whyTitle: 'Why travel with WingSide',
  },
  vi: {
    ctaDescription:
      'Chuyển từ cảm hứng sang trao đổi lập kế hoạch thực tế qua planner hoặc trang liên hệ.',
    ctaTitle: 'Sẵn sàng định hình hành trình Việt Nam của bạn?',
    destinationsDescription:
      'Trang chủ đưa điểm đến lên sớm vì nhiều hành trình inbound bắt đầu từ việc chọn nơi muốn đi.',
    destinationsEyebrow: 'Điểm đến',
    destinationsTitle: 'Khám phá điểm đến',
    heading: 'Hành trình Việt Nam thiết kế riêng',
    heroEyebrow: 'Vietnam theo yêu cầu',
    links: [
      linkItem('Lên kế hoạch', '/plan-your-trip'),
      linkItem('Điểm đến', '/destinations', 'outline'),
    ],
    meta: 'WingSide hành trình Việt Nam thiết kế riêng',
    packagesDescription:
      'Các hành trình mẫu giúp khách hình dung những khả năng phù hợp mà không bị giới hạn trong một danh mục cứng.',
    packagesEyebrow: 'Hành trình mẫu',
    packagesTitle: 'Hành trình mẫu',
    paragraph:
      'Trải nghiệm riêng tư, linh hoạt và được thiết kế tại chỗ thông qua khám phá điểm đến, phong cách du lịch và tư vấn hành trình.',
    planningNotesDescription:
      'Phần ghi chú sử dụng các tình huống minh họa; đánh giá thật chỉ được đăng khi có nguồn xác thực rõ ràng.',
    planningNotesEyebrow: 'Gợi ý lên kế hoạch',
    planningNotesTitle: 'Ghi chú từ nhu cầu thực tế',
    slideDestinationDescription:
      'Khám phá Hà Nội, Hạ Long, Hội An, Huế và Mekong qua các gợi ý hành trình có thể điều chỉnh theo nhóm của bạn.',
    slideDestinationEyebrow: 'Lên kế hoạch theo điểm đến',
    slideDestinationTitle: 'Bắt đầu từ nơi muốn đi, không phải từ gói cứng',
    slideStyleDescription:
      'Dùng phong cách du lịch để mô tả sở thích trước khi đội ngũ biến ý tưởng thành hành trình khả thi.',
    slideStyleEyebrow: 'Phong cách du lịch',
    slideStyleTitle: 'Văn hóa, gia đình, cao cấp, chậm rãi',
    statsDescription:
      'Các chỉ dấu được quản trị để giải thích phạm vi nội dung mà không dùng giải thưởng hoặc đánh giá không có nguồn.',
    statsEyebrow: 'Chứng cứ biên tập',
    statsTitle: 'Thông tin nền tảng cho khách quốc tế',
    stylesDescription:
      'Phong cách du lịch giúp khách xác định trải nghiệm mong muốn trước khi đi vào hành trình cụ thể.',
    stylesEyebrow: 'Chủ đề hành trình',
    stylesTitle: 'Phong cách du lịch',
    trustDescription:
      'Trang chủ ưu tiên điểm đến, phong cách và thông tin hữu ích trước khi yêu cầu khách điền biểu mẫu chi tiết.',
    trustEyebrow: 'Tư vấn cho khách quốc tế',
    trustTitle: 'WingSide được thiết kế để xây dựng niềm tin',
    whyDescription:
      'Khách quốc tế cần tin tưởng đơn vị tổ chức trước khi gửi yêu cầu chuyến đi chi tiết.',
    whyEyebrow: 'Lớp niềm tin',
    whyTitle: 'Vì sao đi cùng WingSide',
  },
  it: {
    ctaDescription:
      'Passa dall’ispirazione a una conversazione concreta con lo strumento di pianificazione o la pagina contatti.',
    ctaTitle: 'Pronto a dare forma al tuo viaggio in Vietnam?',
    destinationsDescription:
      'La pagina iniziale presenta subito le destinazioni perché molti viaggiatori internazionali partono dalla scelta dei luoghi.',
    destinationsEyebrow: 'Destinazioni',
    destinationsTitle: 'Guida alle destinazioni',
    heading: 'Viaggi su misura in Vietnam',
    heroEyebrow: 'Vietnam su misura',
    links: [
      linkItem('Pianifica il viaggio', '/plan-your-trip'),
      linkItem('Destinazioni', '/destinations', 'outline'),
    ],
    meta: 'WingSide Vietnam su misura',
    packagesDescription:
      'Le schede itinerario restano esempi marketing: mostrano possibilità, non un catalogo rigido.',
    packagesEyebrow: 'Itinerari',
    packagesTitle: 'Itinerari di esempio',
    paragraph:
      'Esperienze private, flessibili e progettate localmente attraverso destinazioni, stili di viaggio e consulenza.',
    planningNotesDescription:
      'Le note mostrano situazioni esemplificative; le recensioni reali vanno pubblicate solo con una fonte verificabile.',
    planningNotesEyebrow: 'Spunti per pianificare',
    planningNotesTitle: 'Note di viaggio per pianificare',
    slideDestinationDescription:
      'Esplora Hanoi, Ha Long, Hoi An, Hue e Mekong attraverso idee di rotta adattabili al tuo gruppo.',
    slideDestinationEyebrow: 'Planning per destinazione',
    slideDestinationTitle: 'Inizia dai luoghi, non dai pacchetti',
    slideStyleDescription:
      'Usa gli stili di viaggio per descrivere le tue preferenze prima che la squadra trasformi le idee in un itinerario concreto.',
    slideStyleEyebrow: 'Stili di viaggio',
    slideStyleTitle: 'Cultura, famiglia, lusso, slow travel',
    statsDescription:
      'Indicatori governati per spiegare la copertura del contenuto senza inventare premi o recensioni.',
    statsEyebrow: 'Prova editoriale',
    statsTitle: 'Informazioni utili per i viaggiatori internazionali',
    stylesDescription:
      'Gli stili aiutano l’utente a qualificare il viaggio prima di scegliere una forma di itinerario.',
    stylesEyebrow: 'Temi di viaggio',
    stylesTitle: 'Stili di viaggio',
    trustDescription:
      'La pagina iniziale presenta destinazioni, stile e indicazioni utili prima di chiedere di compilare un modulo dettagliato.',
    trustEyebrow: 'Consulenza per viaggiatori internazionali',
    trustTitle: 'WingSide nasce per costruire fiducia',
    whyDescription:
      'I viaggiatori internazionali devono potersi fidare dell’operatore prima di inviare una richiesta dettagliata.',
    whyEyebrow: 'Sezione fiducia',
    whyTitle: 'Perché viaggiare con WingSide',
  },
  es: {
    ctaDescription:
      'Pasa de la inspiración a una conversación concreta con el planificador o la página de contacto.',
    ctaTitle: '¿Listo para dar forma a tu viaje a Vietnam?',
    destinationsDescription:
      'La página de inicio presenta los destinos desde el principio porque muchos viajeros internacionales empiezan por elegir lugares.',
    destinationsEyebrow: 'Destinos',
    destinationsTitle: 'Guía de destinos',
    heading: 'Viajes a Vietnam hechos a medida',
    heroEyebrow: 'Vietnam a medida',
    links: [
      linkItem('Planifica tu viaje', '/plan-your-trip'),
      linkItem('Destinos', '/destinations', 'outline'),
    ],
    meta: 'WingSide Vietnam a medida',
    packagesDescription:
      'Las tarjetas de itinerario son ejemplos de marketing: muestran posibilidades, no un catálogo rígido.',
    packagesEyebrow: 'Itinerarios',
    packagesTitle: 'Itinerarios de ejemplo',
    paragraph:
      'Experiencias privadas y flexibles, diseñadas localmente a partir de destinos, estilos de viaje y planificación consultiva.',
    planningNotesDescription:
      'Las notas muestran situaciones de ejemplo; las reseñas reales solo deben publicarse con una fuente verificable.',
    planningNotesEyebrow: 'Señales de planificación',
    planningNotesTitle: 'Notas de viaje para planificar',
    slideDestinationDescription:
      'Explora Hanoi, Ha Long, Hoi An, Hue y Mekong mediante ideas de ruta adaptables a tu grupo.',
    slideDestinationEyebrow: 'Planificación por destino',
    slideDestinationTitle: 'Empieza por lugares, no por paquetes',
    slideStyleDescription:
      'Usa los estilos de viaje para describir tus preferencias antes de que el equipo convierta las ideas en un itinerario concreto.',
    slideStyleEyebrow: 'Estilos de viaje',
    slideStyleTitle: 'Cultura, familia, lujo, viaje pausado',
    statsDescription:
      'Indicadores gobernados para explicar la cobertura del contenido sin inventar premios ni reseñas.',
    statsEyebrow: 'Prueba editorial',
    statsTitle: 'Información útil para viajeros internacionales',
    stylesDescription:
      'Los estilos ayudan al usuario a cualificar su viaje antes de elegir una forma de itinerario.',
    stylesEyebrow: 'Temas de viaje',
    stylesTitle: 'Estilos de viaje',
    trustDescription:
      'La portada prioriza destinos, estilo y señales de planificación antes de pedir un formulario completo.',
    trustEyebrow: 'Asesoría para viajeros internacionales',
    trustTitle: 'WingSide está diseñado para generar confianza',
    whyDescription:
      'Los viajeros internacionales necesitan confiar en el operador antes de enviar una solicitud detallada.',
    whyEyebrow: 'Sección confianza',
    whyTitle: 'Por qué viajar con WingSide',
  },
  pt: {
    ctaDescription:
      'Passe da inspiração para uma conversa concreta com o planeador ou a página de contacto.',
    ctaTitle: 'Pronto para dar forma à sua viagem ao Vietname?',
    destinationsDescription:
      'A página inicial apresenta os destinos desde cedo porque muitos viajantes internacionais começam pela escolha dos lugares.',
    destinationsEyebrow: 'Destinos',
    destinationsTitle: 'Guia de destinos',
    heading: 'Viagens ao Vietname feitas à medida',
    heroEyebrow: 'Vietname à medida',
    links: [
      linkItem('Planear a viagem', '/plan-your-trip'),
      linkItem('Destinos', '/destinations', 'outline'),
    ],
    meta: 'WingSide Vietname à medida',
    packagesDescription:
      'Os cartões de itinerário são exemplos de marketing: mostram possibilidades, não um catálogo rígido.',
    packagesEyebrow: 'Itinerários',
    packagesTitle: 'Itinerários de exemplo',
    paragraph:
      'Experiências privadas, flexíveis e desenhadas localmente através de destinos, estilos de viagem e planeamento consultivo.',
    planningNotesDescription:
      'As notas mostram situações de exemplo; as avaliações reais só devem ser publicadas com uma fonte verificável.',
    planningNotesEyebrow: 'Sinais de planeamento',
    planningNotesTitle: 'Notas de viagem para planear',
    slideDestinationDescription:
      'Explore Hanoi, Ha Long, Hoi An, Hue e Mekong através de ideias de rota adaptáveis ao seu grupo.',
    slideDestinationEyebrow: 'Planeamento por destino',
    slideDestinationTitle: 'Comece pelos lugares, não pelos pacotes',
    slideStyleDescription:
      'Use os estilos de viagem para descrever as suas preferências antes de a equipa transformar as ideias num itinerário concreto.',
    slideStyleEyebrow: 'Estilos de viagem',
    slideStyleTitle: 'Cultura, família, luxo, viagem lenta',
    statsDescription:
      'Indicadores governados para explicar a cobertura do conteúdo sem inventar prémios ou avaliações.',
    statsEyebrow: 'Prova editorial',
    statsTitle: 'Informação útil para viajantes internacionais',
    stylesDescription:
      'Os estilos ajudam o utilizador a qualificar a viagem antes de escolher uma forma de itinerário.',
    stylesEyebrow: 'Temas de viagem',
    stylesTitle: 'Estilos de viagem',
    trustDescription:
      'A homepage prioriza destinos, estilo e sinais de planeamento antes de pedir um formulário completo.',
    trustEyebrow: 'Aconselhamento para viajantes internacionais',
    trustTitle: 'A WingSide foi desenhada para gerar confiança',
    whyDescription:
      'Os viajantes internacionais precisam de confiar no operador antes de enviar um pedido detalhado.',
    whyEyebrow: 'Secção confiança',
    whyTitle: 'Porque viajar com a WingSide',
  },
} as const

const homeBlockCopy = {
  en: {
    trustItems: [
      {
        label: 'Primary action',
        value: 'Plan your trip',
        description: 'The site should feel ready for a custom inquiry, not like a retail checkout.',
      },
      {
        label: 'Navigation model',
        value: 'Destination + style',
        description: 'Guests can browse Vietnam by place or by the kind of journey they want.',
      },
      {
        label: 'Business role',
        value: 'Inbound Vietnam',
        description: 'The site serves international guests and trust-building content.',
      },
      {
        label: 'SEO path',
        value: 'Guide + destination',
        description: 'Guide and destination pages support discovery before inquiry.',
      },
    ],
    whyItems: [
      {
        title: 'Locally designed routes',
        description:
          'Destination combinations and itinerary rhythm are shaped around real on-the-ground travel.',
        meta: 'Local expertise',
      },
      {
        title: 'Flexible planning',
        description:
          'Guests are guided into consultation and customization instead of a closed catalog.',
        meta: 'Flexible planning',
      },
      {
        title: 'Travel-style matching',
        description:
          'Luxury, family, culture, and adventure qualify the brief before the first human response.',
        meta: 'Style-led',
      },
    ],
    statsItems: [
      {
        label: 'Destination clusters',
        value: '5+',
        description: 'North, Central, South, coastal, and multi-region route frames.',
      },
      {
        label: 'Style-led briefs',
        value: '6',
        description: 'Luxury, family, culture, adventure, honeymoon, and wellness entry points.',
      },
      {
        label: 'Response target',
        value: '24h',
        description: 'A soft operational target for first human follow-up, not a fake guarantee.',
      },
      {
        label: 'Ad locales',
        value: '4',
        description: 'English, Italian, Spanish, and Portuguese paid-traffic locales.',
      },
    ],
    styleItems: [
      {
        title: 'Luxury',
        description: 'Curated stays, smooth service, and refined pacing.',
        url: '/styles/luxury',
      },
      {
        title: 'Family',
        description: 'Balanced routes and easy-flow days for mixed-age groups.',
        url: '/styles/family',
      },
      {
        title: 'Culture',
        description: 'Heritage, food, stories, and context.',
        url: '/styles/culture',
      },
      {
        title: 'Adventure',
        description: 'A more active rhythm with landscape and movement.',
        url: '/styles/adventure',
      },
    ],
    packageItems: [
      {
        title: 'Vietnam Highlights',
        description: 'A first-time multi-region planning frame.',
        url: '/packages/vietnam-highlights',
      },
      {
        title: 'Northern Vietnam',
        description: 'A tighter regional route for culture and scenic contrast.',
        url: '/packages/northern-vietnam',
      },
      {
        title: 'Central Heritage',
        description: 'A heritage-led route with softer pacing and stronger storytelling.',
        url: '/packages/central-heritage',
      },
    ],
    planningNotes: [
      {
        name: 'Family route brief',
        quote:
          'We want Vietnam to feel easy for grandparents and children, with culture moments but not too many hotel changes.',
        role: 'Sample planning note',
      },
      {
        name: 'Culture-led brief',
        quote:
          'The route should explain why each city matters, not only move us from one stop to another.',
        role: 'Sample planning note',
      },
      {
        name: 'Luxury pacing brief',
        quote:
          'We care about fewer transitions, reliable hosting, and hotels that match the rhythm of the journey.',
        role: 'Sample planning note',
      },
    ],
  },
  vi: {
    trustItems: [
      {
        label: 'CTA chính',
        description:
          'Trang phải sẵn sàng cho yêu cầu hành trình riêng, không giống một quy trình mua hàng đại trà.',
      },
      {
        label: 'Cấu trúc điều hướng',
        value: 'Điểm đến + phong cách',
        description: 'Khách có thể khám phá Việt Nam theo nơi muốn đi hoặc theo kiểu hành trình.',
      },
      {
        label: 'Vai trò kinh doanh',
        value: 'Inbound Vietnam',
        description: 'Site phục vụ khách quốc tế và nội dung xây dựng niềm tin.',
      },
      {
        label: 'Đường SEO',
        value: 'Guide + destination',
        description: 'Guide và destination pages hỗ trợ khám phá trước khi gửi yêu cầu.',
      },
    ],
    whyItems: [
      {
        title: 'Route được thiết kế tại chỗ',
        description:
          'Điểm đến và nhịp itinerary được ghép theo cảm giác trải nghiệm thực tế trên tuyến.',
        meta: 'Hiểu biết địa phương',
      },
      {
        title: 'Lập kế hoạch linh hoạt',
        description:
          'Khách được dẫn vào hướng tư vấn và tùy biến thay vì kẹt trong logic catalog cứng.',
        meta: 'Lập kế hoạch linh hoạt',
      },
      {
        title: 'Khớp theo style',
        description:
          'Cao cấp, gia đình, văn hóa và phiêu lưu giúp brief rõ hơn trước phản hồi đầu tiên.',
        meta: 'Theo phong cách du lịch',
      },
    ],
    statsItems: [
      {
        label: 'Cụm điểm đến',
        value: '5+',
        description: 'Miền Bắc, miền Trung, miền Nam, vùng biển và các hành trình liên vùng.',
      },
      {
        label: 'Yêu cầu theo phong cách',
        value: '6',
        description: 'Cao cấp, gia đình, văn hóa, phiêu lưu, tuần trăng mật và chăm sóc sức khỏe.',
      },
      {
        label: 'Mục tiêu phản hồi',
        value: '24h',
        description: 'Mục tiêu vận hành mềm cho phản hồi đầu tiên, không phải cam kết giả.',
      },
      {
        label: 'Ngôn ngữ quảng cáo',
        value: '4',
        description:
          'Tiếng Anh, tiếng Ý, tiếng Tây Ban Nha và tiếng Bồ Đào Nha cho quảng cáo trả phí.',
      },
    ],
    styleItems: [
      {
        title: 'Cao cấp',
        description: 'Khách sạn chọn lọc, nhịp đi thư thả và dịch vụ đón tiếp chu đáo.',
        url: '/styles/luxury',
      },
      {
        title: 'Gia đình',
        description: 'Nhịp tuyến cân bằng cho nhiều độ tuổi.',
        url: '/styles/family',
      },
      {
        title: 'Văn hóa',
        description: 'Di sản, ẩm thực, câu chuyện và bối cảnh.',
        url: '/styles/culture',
      },
      {
        title: 'Phiêu lưu',
        description: 'Năng lượng tuyến cao hơn với thiên nhiên và chuyển động.',
        url: '/styles/adventure',
      },
    ],
    packageItems: [
      {
        title: 'Điểm nổi bật Việt Nam',
        description: 'Khung đa vùng cho chuyến đầu tiên.',
        url: '/packages/vietnam-highlights',
      },
      {
        title: 'Miền Bắc Việt Nam',
        description: 'Tập trung hơn vào văn hóa và tương phản cảnh quan miền Bắc.',
        url: '/packages/northern-vietnam',
      },
      {
        title: 'Di sản miền Trung',
        description: 'Route di sản mềm hơn, giàu lớp kể chuyện.',
        url: '/packages/central-heritage',
      },
    ],
    planningNotes: [
      {
        name: 'Yêu cầu cho gia đình',
        quote:
          'Chúng tôi muốn Việt Nam dễ chịu cho ông bà và trẻ nhỏ, có văn hóa nhưng không đổi khách sạn quá nhiều.',
        role: 'Ghi chú planning mẫu',
      },
      {
        name: 'Yêu cầu khám phá văn hóa',
        quote:
          'Hành trình cần giải thích vì sao mỗi thành phố quan trọng, không chỉ là danh sách điểm dừng.',
        role: 'Ghi chú planning mẫu',
      },
      {
        name: 'Yêu cầu hành trình cao cấp, chậm rãi',
        quote:
          'Chúng tôi ưu tiên ít lần di chuyển hơn, dịch vụ đón tiếp đáng tin cậy và khách sạn phù hợp với nhịp chuyến đi.',
        role: 'Ghi chú planning mẫu',
      },
    ],
  },
  it: {
    trustItems: [
      {
        label: 'CTA',
        description:
          'La pagina deve sembrare pronta per una richiesta su misura, non per un acquisto online standardizzato.',
      },
      {
        label: 'Navigazione',
        value: 'Destinazioni + stile',
        description: 'Gli utenti possono esplorare il Vietnam per luogo o per tipo di viaggio.',
      },
      {
        label: 'Ruolo business',
        value: 'Inbound Vietnam',
        description: 'Il sito serve ospiti internazionali e contenuti orientati alla fiducia.',
      },
      {
        label: 'SEO',
        value: 'Guida + destinazione',
        description: 'Guide e pagine destinazione supportano la scoperta prima della richiesta.',
      },
    ],
    whyItems: [
      {
        title: 'Rotte progettate localmente',
        description:
          'Combinazioni di destinazioni e ritmo pensate secondo come il viaggio si vive sul terreno.',
        meta: 'Competenza locale',
      },
      {
        title: 'Pianificazione flessibile',
        description:
          'L’esperienza guida verso personalizzazione invece di una logica da catalogo chiuso.',
        meta: 'Pianificazione flessibile',
      },
      {
        title: 'Scelta per stile',
        description:
          'Lusso, famiglia, cultura e avventura qualificano la richiesta prima della prima risposta umana.',
        meta: 'Incentrato sugli stili di viaggio',
      },
    ],
    statsItems: [
      {
        label: 'Cluster destinazione',
        value: '5+',
        description: 'Nord, Centro, Sud, coste e itinerari tra più regioni.',
      },
      {
        label: 'Brief per stile',
        value: '6',
        description: 'Viaggi di lusso, in famiglia, culturali, d’avventura, di nozze e benessere.',
      },
      {
        label: 'Obiettivo risposta',
        value: '24h',
        description:
          'Un obiettivo operativo indicativo per il primo contatto umano, non una garanzia.',
      },
      {
        label: 'Lingue per le campagne',
        value: '4',
        description: 'Inglese, italiano, spagnolo e portoghese per le campagne a pagamento.',
      },
    ],
    styleItems: [
      {
        title: 'Lusso',
        description: 'Soggiorni curati, servizio fluido e ritmo raffinato.',
        url: '/styles/luxury',
      },
      {
        title: 'Famiglia',
        description: 'Rotte equilibrate e giornate fluide per gruppi di età diverse.',
        url: '/styles/family',
      },
      {
        title: 'Cultura',
        description: 'Patrimonio, cucina, storie e contesto.',
        url: '/styles/culture',
      },
      {
        title: 'Avventura',
        description: 'Un ritmo più attivo con paesaggio e movimento.',
        url: '/styles/adventure',
      },
    ],
    packageItems: [
      {
        title: 'Vietnam essenziale',
        description: 'Una base multi-regione per un primo viaggio.',
        url: '/packages/vietnam-highlights',
      },
      {
        title: 'Vietnam del Nord',
        description: 'Una rotta regionale più focalizzata su cultura e contrasto paesaggistico.',
        url: '/packages/northern-vietnam',
      },
      {
        title: 'Patrimonio centrale',
        description: 'Rotta patrimoniale con ritmo più morbido e più narrazione.',
        url: '/packages/central-heritage',
      },
    ],
    planningNotes: [
      {
        name: 'Richiesta per un viaggio in famiglia',
        quote:
          'Vogliamo un Vietnam facile per nonni e bambini, con momenti culturali ma senza troppi cambi hotel.',
        role: 'Nota di pianificazione campione',
      },
      {
        name: 'Richiesta culturale',
        quote: 'La rotta deve spiegare perché ogni città conta, non solo spostarci tra tappe.',
        role: 'Nota di pianificazione campione',
      },
      {
        name: 'Richiesta per un viaggio di lusso e lento',
        quote:
          'Preferiamo meno trasferimenti, assistenza affidabile e hotel coerenti con il ritmo del viaggio.',
        role: 'Nota di pianificazione campione',
      },
    ],
  },
  es: {
    trustItems: [
      {
        label: 'CTA',
        description:
          'La página debe sentirse lista para una solicitud a medida, no para una compra en línea estandarizada.',
      },
      {
        label: 'Navegación',
        value: 'Destinos + estilo',
        description: 'Los usuarios pueden explorar Vietnam por lugar o por tipo de viaje.',
      },
      {
        label: 'Rol de negocio',
        value: 'Inbound Vietnam',
        description: 'El sitio sirve a viajeros internacionales y contenido orientado a confianza.',
      },
      {
        label: 'SEO',
        value: 'Guía + destino',
        description: 'Guías y páginas de destino apoyan el descubrimiento antes de la solicitud.',
      },
    ],
    whyItems: [
      {
        title: 'Rutas diseñadas localmente',
        description:
          'Combinaciones de destinos y ritmo pensados según cómo se vive el viaje sobre el terreno.',
        meta: 'Conocimiento local',
      },
      {
        title: 'Planificación flexible',
        description:
          'La experiencia guía hacia personalización en vez de lógica de catálogo cerrado.',
        meta: 'Planificación flexible',
      },
      {
        title: 'Elección por estilo',
        description:
          'Lujo, familia, cultura y aventura califican la solicitud antes de la primera respuesta humana.',
        meta: 'Centrado en los estilos de viaje',
      },
    ],
    statsItems: [
      {
        label: 'Clusters de destino',
        value: '5+',
        description: 'Norte, centro, sur, costa e itinerarios entre varias regiones.',
      },
      {
        label: 'Briefs por estilo',
        value: '6',
        description:
          'Viajes de lujo, en familia, culturales, de aventura, de luna de miel y de bienestar.',
      },
      {
        label: 'Objetivo de respuesta',
        value: '24h',
        description:
          'Un objetivo operativo orientativo para el primer contacto personal, no una garantía.',
      },
      {
        label: 'Idiomas para campañas',
        value: '4',
        description: 'Inglés, italiano, español y portugués para campañas de pago.',
      },
    ],
    styleItems: [
      {
        title: 'Lujo',
        description: 'Estancias cuidadas, servicio fluido y ritmo refinado.',
        url: '/styles/luxury',
      },
      {
        title: 'Familia',
        description: 'Rutas equilibradas y días fáciles para grupos de varias edades.',
        url: '/styles/family',
      },
      {
        title: 'Cultura',
        description: 'Patrimonio, gastronomía, historias y contexto.',
        url: '/styles/culture',
      },
      {
        title: 'Aventura',
        description: 'Un ritmo más activo con paisaje y movimiento.',
        url: '/styles/adventure',
      },
    ],
    packageItems: [
      {
        title: 'Vietnam esencial',
        description: 'Un marco multi-región para una primera visita.',
        url: '/packages/vietnam-highlights',
      },
      {
        title: 'Norte de Vietnam',
        description: 'Una ruta regional más enfocada en cultura y contraste escénico.',
        url: '/packages/northern-vietnam',
      },
      {
        title: 'Patrimonio central',
        description: 'Ruta patrimonial con ritmo más suave y más relato.',
        url: '/packages/central-heritage',
      },
    ],
    planningNotes: [
      {
        name: 'Solicitud para un viaje en familia',
        quote:
          'Queremos que Vietnam sea fácil para abuelos y niños, con cultura pero sin demasiados cambios de hotel.',
        role: 'Nota de planificación de muestra',
      },
      {
        name: 'Solicitud cultural',
        quote: 'La ruta debe explicar por qué cada ciudad importa, no solo movernos entre paradas.',
        role: 'Nota de planificación de muestra',
      },
      {
        name: 'Solicitud para un viaje de lujo y pausado',
        quote:
          'Preferimos menos traslados, atención fiable y hoteles que encajen con el ritmo del viaje.',
        role: 'Nota de planificación de muestra',
      },
    ],
  },
  pt: {
    trustItems: [
      {
        label: 'CTA',
        description:
          'A página deve parecer pronta para um pedido à medida, não para uma compra em linha padronizada.',
      },
      {
        label: 'Navegação',
        value: 'Destinos + estilo',
        description: 'Os utilizadores podem explorar o Vietname por lugar ou por tipo de viagem.',
      },
      {
        label: 'Papel do negócio',
        value: 'Inbound Vietnam',
        description: 'O site serve viajantes internacionais e conteúdo orientado para confiança.',
      },
      {
        label: 'SEO',
        value: 'Guia + destino',
        description: 'Guias e páginas de destino apoiam a descoberta antes do pedido.',
      },
    ],
    whyItems: [
      {
        title: 'Rotas desenhadas localmente',
        description:
          'Combinações de destinos e ritmo pensadas segundo a experiência real no terreno.',
        meta: 'Conhecimento local',
      },
      {
        title: 'Planeamento flexível',
        description: 'A experiência conduz à personalização em vez de lógica de catálogo fechado.',
        meta: 'Planeamento flexível',
      },
      {
        title: 'Escolha por estilo',
        description:
          'Luxo, família, cultura e aventura qualificam o pedido antes da primeira resposta humana.',
        meta: 'Centrado nos estilos de viagem',
      },
    ],
    statsItems: [
      {
        label: 'Clusters de destino',
        value: '5+',
        description: 'Norte, centro, sul, costa e itinerários entre várias regiões.',
      },
      {
        label: 'Briefs por estilo',
        value: '6',
        description:
          'Viagens de luxo, em família, culturais, de aventura, de lua de mel e de bem-estar.',
      },
      {
        label: 'Objetivo de resposta',
        value: '24h',
        description:
          'Um objetivo operacional indicativo para o primeiro contacto pessoal, não uma garantia.',
      },
      {
        label: 'Idiomas para campanhas',
        value: '4',
        description: 'Inglês, italiano, espanhol e português para campanhas pagas.',
      },
    ],
    styleItems: [
      {
        title: 'Luxo',
        description: 'Estadias cuidadas, serviço fluido e ritmo refinado.',
        url: '/styles/luxury',
      },
      {
        title: 'Família',
        description: 'Rotas equilibradas e dias fluidos para grupos de várias idades.',
        url: '/styles/family',
      },
      {
        title: 'Cultura',
        description: 'Património, gastronomia, histórias e contexto.',
        url: '/styles/culture',
      },
      {
        title: 'Aventura',
        description: 'Um ritmo mais ativo com paisagem e movimento.',
        url: '/styles/adventure',
      },
    ],
    packageItems: [
      {
        title: 'Vietname essencial',
        description: 'Um enquadramento multi-região para uma primeira visita.',
        url: '/packages/vietnam-highlights',
      },
      {
        title: 'Norte do Vietname',
        description: 'Uma rota regional mais focada em cultura e contraste cénico.',
        url: '/packages/northern-vietnam',
      },
      {
        title: 'Património central',
        description: 'Rota patrimonial com ritmo mais suave e mais narrativa.',
        url: '/packages/central-heritage',
      },
    ],
    planningNotes: [
      {
        name: 'Pedido para uma viagem em família',
        quote:
          'Queremos que o Vietname seja fácil para avós e crianças, com cultura mas sem demasiadas mudanças de hotel.',
        role: 'Nota de planeamento de exemplo',
      },
      {
        name: 'Pedido cultural',
        quote:
          'A rota deve explicar porque cada cidade importa, não apenas mover-nos entre paragens.',
        role: 'Nota de planeamento de exemplo',
      },
      {
        name: 'Pedido para uma viagem de luxo e pausada',
        quote:
          'Valorizamos menos transições, acolhimento fiável e hotéis alinhados com o ritmo da viagem.',
        role: 'Nota de planeamento de exemplo',
      },
    ],
  },
} as const

const destinationEntries = {
  '/destinations/ha-noi': {
    imageRole: 'secondary' as const,
    translations: {
      en: {
        title: 'Hanoi',
        focus:
          'Hanoi is the cultural gateway to the north and often anchors first-time itineraries with heritage, food, and urban rhythm.',
        highlights: [
          {
            title: 'Old Quarter rhythm',
            description:
              'Historic streets, walkable discovery, food culture, and atmospheric exploration.',
          },
          {
            title: 'Cultural layers',
            description: 'Museums, temples, and modern history help frame the wider journey.',
          },
          {
            title: 'Northern gateway',
            description:
              'A practical transfer point toward Ha Long, Ninh Binh, or mountain extensions.',
          },
        ],
      },
      vi: {
        title: 'Hà Nội',
        focus:
          'Hà Nội là cửa ngõ văn hóa của miền Bắc và thường neo các hành trình đầu tiên với lớp di sản, ẩm thực và nhịp đô thị.',
        highlights: [
          {
            title: 'Nhịp phố cổ',
            description:
              'Phố lịch sử, nhịp đi bộ, văn hóa ẩm thực và cảm giác khám phá theo không khí.',
          },
          {
            title: 'Lớp văn hóa - lịch sử',
            description:
              'Bảo tàng, đền chùa và các lớp lịch sử hiện đại giúp định khung hành trình.',
          },
          {
            title: 'Cửa ngõ miền Bắc',
            description:
              'Điểm trung chuyển hợp lý sang Hạ Long, Ninh Bình hoặc các mở rộng miền núi.',
          },
        ],
      },
      it: {
        title: 'Hanoi',
        focus:
          'Hanoi funziona come porta culturale del nord e spesso ancora i primi itinerari con patrimonio, cucina e ritmo urbano.',
        highlights: [
          {
            title: 'Ritmo del quartiere antico',
            description:
              'Strade storiche, passo lento, cultura gastronomica ed esplorazione atmosferica.',
          },
          {
            title: 'Livelli culturali',
            description: 'Musei, templi e storia politica aiutano a dare contesto al viaggio.',
          },
          {
            title: 'Porta del Vietnam del Nord',
            description: 'Punto utile per passare verso Ha Long, Ninh Binh o estensioni montane.',
          },
        ],
      },
      es: {
        title: 'Hanói',
        focus:
          'Hanói funciona como puerta cultural del norte y suele anclar los primeros itinerarios con patrimonio, gastronomía y ritmo urbano.',
        highlights: [
          {
            title: 'Ritmo del casco antiguo',
            description:
              'Calles históricas, paseo a pie, cultura gastronómica y exploración por ambiente.',
          },
          {
            title: 'Capas culturales',
            description: 'Museos, templos e historia política ayudan a enmarcar el viaje.',
          },
          {
            title: 'Puerta del norte de Vietnam',
            description: 'Punto útil para pasar hacia Ha Long, Ninh Binh o extensiones de montaña.',
          },
        ],
      },
      pt: {
        title: 'Hanói',
        focus:
          'Hanói funciona como porta cultural do norte e ancora muitas primeiras rotas com património, gastronomia e ritmo urbano.',
        highlights: [
          {
            title: 'Ritmo do bairro antigo',
            description:
              'Ruas históricas, ritmo pedonal, cultura gastronómica e exploração pela atmosfera.',
          },
          {
            title: 'Camadas culturais',
            description: 'Museus, templos e história política ajudam a enquadrar a viagem.',
          },
          {
            title: 'Porta do norte do Vietname',
            description: 'Ponto útil para seguir para Ha Long, Ninh Binh ou extensões de montanha.',
          },
        ],
      },
    },
  },
  '/destinations/ha-long': {
    imageRole: 'secondary' as const,
    translations: {
      en: {
        title: 'Ha Long',
        focus:
          'Ha Long adds cruise and seascape contrast to northern routes, especially for first-time Vietnam journeys.',
        highlights: [
          {
            title: 'Cruise experience',
            description:
              'A day cruise or overnight cruise frame depending on route depth and group expectations.',
          },
          {
            title: 'Landscape contrast',
            description:
              'The bay gives northern itineraries a visual register that feels very different from inland stops.',
          },
          {
            title: 'Flexible route depth',
            description:
              'It can work as a short extension or a stronger premium anchor depending on the journey style.',
          },
        ],
      },
      vi: {
        title: 'Hạ Long',
        focus:
          'Hạ Long tạo lớp tương phản giữa du thuyền và cảnh quan biển cho các route miền Bắc, đặc biệt hợp với chuyến đầu tiên.',
        highlights: [
          {
            title: 'Trải nghiệm du thuyền',
            description: 'Có thể đi trong ngày hoặc ngủ đêm tùy độ sâu route và kỳ vọng của nhóm.',
          },
          {
            title: 'Tương phản cảnh quan',
            description:
              'Vịnh biển bổ sung lớp hình ảnh rất khác cho chuỗi điểm đất liền của miền Bắc.',
          },
          {
            title: 'Độ sâu route linh hoạt',
            description:
              'Có thể là một extension ngắn hoặc một neo cao cấp mạnh hơn tùy style hành trình.',
          },
        ],
      },
      it: {
        title: 'Ha Long',
        focus:
          'Ha Long aggiunge contrasto tra crociera e paesaggio marino ai percorsi del nord e funziona bene nelle prime visite.',
        highlights: [
          {
            title: 'Esperienza crociera',
            description:
              'Cornice di crociera in giornata o con notte a bordo in base alla profondità della rotta.',
          },
          {
            title: 'Contrasto paesaggistico',
            description:
              'La baia completa la cultura di Hanoi con un registro visivo molto diverso.',
          },
          {
            title: 'Profondità flessibile',
            description:
              'Può essere una breve estensione o un’ancora luxury più forte a seconda del pacchetto.',
          },
        ],
      },
      es: {
        title: 'Ha Long',
        focus:
          'Ha Long añade contraste de crucero y paisaje marino a las rutas del norte y funciona bien en primeras visitas.',
        highlights: [
          {
            title: 'Experiencia de crucero',
            description:
              'Marco de crucero diurno o con noche a bordo según la profundidad de la ruta.',
          },
          {
            title: 'Contraste paisajístico',
            description:
              'La bahía complementa la cultura de Hanói con un registro visual muy distinto.',
          },
          {
            title: 'Profundidad flexible',
            description:
              'Puede ser una extensión corta o un ancla luxury más fuerte según el estilo del viaje.',
          },
        ],
      },
      pt: {
        title: 'Ha Long',
        focus:
          'Ha Long acrescenta contraste de cruzeiro e paisagem marítima às rotas do norte e resulta bem em primeiras viagens.',
        highlights: [
          {
            title: 'Experiência de cruzeiro',
            description: 'Cruzeiro de dia ou com noite a bordo consoante a profundidade da rota.',
          },
          {
            title: 'Contraste paisagístico',
            description:
              'A baía complementa a cultura de Hanói com um registo visual muito diferente.',
          },
          {
            title: 'Profundidade flexível',
            description:
              'Pode ser uma extensão curta ou uma âncora luxury mais forte conforme o estilo da viagem.',
          },
        ],
      },
    },
  },
  '/destinations/hoi-an': {
    imageRole: 'secondary' as const,
    translations: {
      en: {
        title: 'Hoi An',
        focus:
          'Hoi An balances heritage atmosphere, a softer evening rhythm, family-friendly pacing, and flexible links with Da Nang or Hue.',
        highlights: [
          {
            title: 'Heritage atmosphere',
            description:
              'Lantern streets, river scenes, and a compact core that is easy to explore on foot.',
          },
          {
            title: 'Soft family pacing',
            description:
              'Useful for guests who want cultural texture without an overloaded daily program.',
          },
          {
            title: 'Natural central pairing',
            description: 'Pairs smoothly with Hue and nearby coastal resort extensions.',
          },
        ],
      },
      vi: {
        title: 'Hội An',
        focus:
          'Hội An cân bằng lớp di sản, nhịp tối mềm, tính thân thiện với gia đình và khả năng ghép linh hoạt với Đà Nẵng hoặc Huế.',
        highlights: [
          {
            title: 'Không khí di sản',
            description: 'Phố đèn lồng, cảnh sông và nhịp khám phá đi bộ dễ chịu.',
          },
          {
            title: 'Nhịp gia đình mềm',
            description: 'Hợp với nhóm muốn có chiều sâu văn hóa nhưng không cần lịch quá dày.',
          },
          {
            title: 'Ghép miền Trung tự nhiên',
            description: 'Kết hợp mượt với Huế và các mở rộng nghỉ dưỡng ven biển gần đó.',
          },
        ],
      },
      it: {
        title: 'Hoi An',
        focus:
          'Hoi An bilancia patrimonio, atmosfera serale morbida, ritmo family-friendly e combinazioni flessibili con Da Nang o Hue.',
        highlights: [
          {
            title: 'Atmosfera heritage',
            description:
              'Strade di lanterne, scena sul fiume e nucleo facilmente percorribile a piedi.',
          },
          {
            title: 'Pacing family-friendly',
            description:
              'Adatto a ospiti che cercano texture culturale senza un programma troppo pesante.',
          },
          {
            title: 'Abbinamento centrale',
            description: 'Si combina in modo naturale con Hue e con estensioni costiere vicine.',
          },
        ],
      },
      es: {
        title: 'Hoi An',
        focus:
          'Hoi An equilibra patrimonio, atmósfera nocturna suave, ritmo familiar y combinaciones flexibles con Da Nang o Hue.',
        highlights: [
          {
            title: 'Atmósfera heritage',
            description:
              'Calles de faroles, escenas junto al río y un centro fácilmente caminable.',
          },
          {
            title: 'Ritmo familiar suave',
            description:
              'Sirve a viajeros que quieren textura cultural sin un programa demasiado cargado.',
          },
          {
            title: 'Pareja central natural',
            description: 'Combina de forma natural con Hue y con extensiones costeras cercanas.',
          },
        ],
      },
      pt: {
        title: 'Hoi An',
        focus:
          'Hoi An equilibra património, atmosfera noturna suave, ritmo familiar e combinações flexíveis com Da Nang ou Hue.',
        highlights: [
          {
            title: 'Atmosfera heritage',
            description:
              'Ruas de lanternas, cenas ribeirinhas e um centro fácil de percorrer a pé.',
          },
          {
            title: 'Ritmo familiar suave',
            description:
              'Adequado para quem quer textura cultural sem um programa excessivamente pesado.',
          },
          {
            title: 'Par central natural',
            description: 'Combina de forma natural com Hue e extensões costeiras próximas.',
          },
        ],
      },
    },
  },
  '/destinations/hue': {
    imageRole: 'secondary' as const,
    translations: {
      en: {
        title: 'Hue',
        focus:
          'Hue brings imperial depth, clear cultural structure, and strong storytelling rhythm to history-led central Vietnam routes.',
        highlights: [
          {
            title: 'Imperial depth',
            description:
              'The citadel and court heritage create a clear narrative layer for cultural travel.',
          },
          {
            title: 'Slower route rhythm',
            description:
              'A strong fit for groups seeking context instead of rushing across too many stops.',
          },
          {
            title: 'Pairing with Hoi An',
            description:
              'Together they create a balanced central heritage route that is easy to explain consultatively.',
          },
        ],
      },
      vi: {
        title: 'Huế',
        focus:
          'Huế mang tới chiều sâu đế đô, cấu trúc văn hóa rõ và nhịp kể chuyện tốt cho các route thiên về lịch sử ở miền Trung.',
        highlights: [
          {
            title: 'Chiều sâu hoàng thành',
            description: 'Di sản cung đình tạo lớp kể chuyện rõ ràng cho hành trình văn hóa.',
          },
          {
            title: 'Nhịp tuyến chậm hơn',
            description:
              'Phù hợp với nhóm muốn đào sâu bối cảnh thay vì chạy nhiều điểm trong ngày.',
          },
          {
            title: 'Ghép với Hội An',
            description: 'Cặp điểm đến này tạo tuyến di sản miền Trung cân bằng và dễ tư vấn.',
          },
        ],
      },
      it: {
        title: 'Hue',
        focus:
          'Hue porta profondità imperiale, struttura culturale chiara e un ritmo narrativo forte per rotte storiche nel centro del Vietnam.',
        highlights: [
          {
            title: 'Profondità imperiale',
            description:
              'La città imperiale crea un livello narrativo molto chiaro per il viaggio culturale.',
          },
          {
            title: 'Pacing più morbido',
            description: 'Adatto a gruppi che vogliono più contesto e meno corsa tra troppi stop.',
          },
          {
            title: 'Abbinamento con Hoi An',
            description:
              'La coppia crea una rotta heritage del centro equilibrata e facile da vendere in modo consultivo.',
          },
        ],
      },
      es: {
        title: 'Hue',
        focus:
          'Hue aporta profundidad imperial, estructura cultural clara y un ritmo narrativo fuerte para rutas históricas en el centro de Vietnam.',
        highlights: [
          {
            title: 'Profundidad imperial',
            description:
              'La ciudad imperial crea una capa narrativa muy clara para el viaje cultural.',
          },
          {
            title: 'Ritmo más suave',
            description:
              'Adecuado para grupos que quieren más contexto y menos carrera entre demasiadas paradas.',
          },
          {
            title: 'Pareja con Hoi An',
            description:
              'La combinación crea una ruta heritage del centro equilibrada y fácil de asesorar.',
          },
        ],
      },
      pt: {
        title: 'Hue',
        focus:
          'Hue traz profundidade imperial, estrutura cultural clara e um ritmo narrativo forte para rotas históricas no centro do Vietname.',
        highlights: [
          {
            title: 'Profundidade imperial',
            description:
              'A cidade imperial cria uma camada narrativa muito clara para a viagem cultural.',
          },
          {
            title: 'Ritmo mais suave',
            description:
              'Adequado para grupos que procuram mais contexto e menos correria entre demasiadas paragens.',
          },
          {
            title: 'Par com Hoi An',
            description:
              'A combinação cria uma rota heritage do centro equilibrada e fácil de aconselhar.',
          },
        ],
      },
    },
  },
  '/destinations/mekong': {
    imageRole: 'secondary' as const,
    translations: {
      en: {
        title: 'Mekong',
        focus:
          'The Mekong adds river rhythm, local life, and a softer southern finish to multi-region Vietnam routes.',
        highlights: [
          {
            title: 'Waterway rhythm',
            description: 'Canals and riverside life create a strong contrast with major cities.',
          },
          {
            title: 'Local-life layer',
            description:
              'A useful destination when the route needs more everyday texture and human proximity.',
          },
          {
            title: 'Southern extension',
            description:
              'Often works well as a softer extension after Ho Chi Minh City or within a cross-country route.',
          },
        ],
      },
      vi: {
        title: 'Mekong',
        focus:
          'Mekong bổ sung nhịp sông nước, đời sống bản địa và một kết thúc miền Nam mềm hơn cho các route đa vùng.',
        highlights: [
          {
            title: 'Nhịp sông nước',
            description: 'Kênh rạch và đời sống ven sông tạo tương phản mạnh với các đô thị lớn.',
          },
          {
            title: 'Lớp đời sống địa phương',
            description: 'Điểm đến phù hợp khi cần tăng cảm giác gần gũi và đời sống thường nhật.',
          },
          {
            title: 'Mở rộng miền Nam',
            description: 'Thường hoạt động tốt như extension mềm sau TP.HCM hoặc route xuyên Việt.',
          },
        ],
      },
      it: {
        title: 'Mekong',
        focus:
          'Il Mekong aggiunge ritmo fluviale, vita locale e una chiusura più morbida del sud per itinerari multi-regione.',
        highlights: [
          {
            title: 'Ritmo dei canali',
            description: 'Canali e vita sull’acqua creano un forte contrasto con le grandi città.',
          },
          {
            title: 'Vita locale',
            description:
              'Destinazione utile quando si vuole aumentare il senso di prossimità al quotidiano.',
          },
          {
            title: 'Estensione del sud',
            description:
              'Funziona bene come estensione morbida dopo Ho Chi Minh City o in una rotta nazionale.',
          },
        ],
      },
      es: {
        title: 'Mekong',
        focus:
          'El Mekong añade ritmo fluvial, vida local y un cierre más suave del sur para itinerarios multi-región.',
        highlights: [
          {
            title: 'Ritmo de canales',
            description:
              'Canales y vida sobre el agua crean un fuerte contraste con las grandes ciudades.',
          },
          {
            title: 'Vida local',
            description:
              'Destino útil cuando se quiere aumentar la sensación de cercanía con la vida diaria.',
          },
          {
            title: 'Extensión del sur',
            description:
              'Funciona bien como extensión suave tras Ho Chi Minh City o en una ruta nacional.',
          },
        ],
      },
      pt: {
        title: 'Mekong',
        focus:
          'O Mekong acrescenta ritmo fluvial, vida local e um fecho sulista mais suave para itinerários multi-região.',
        highlights: [
          {
            title: 'Ritmo dos canais',
            description:
              'Canais e vida sobre a água criam um forte contraste com as grandes cidades.',
          },
          {
            title: 'Vida local',
            description:
              'Destino útil quando se pretende aumentar a sensação de proximidade ao quotidiano.',
          },
          {
            title: 'Extensão do sul',
            description:
              'Funciona bem como extensão suave depois de Ho Chi Minh City ou numa rota nacional.',
          },
        ],
      },
    },
  },
} as const

const styleEntries = {
  '/styles/luxury': {
    translations: {
      en: {
        title: 'Luxury',
        description:
          'Luxury journeys prioritize curated hotels, smooth service, and a refined sequence of destinations.',
        points: [
          {
            title: 'Curated stays',
            description:
              'Hotels and pacing work together to create a journey that feels easier to inhabit.',
          },
          {
            title: 'Soft daily flow',
            description: 'The program favors experience quality over overloaded movement.',
          },
          {
            title: 'Private planning before quotation',
            description:
              'Premium requests usually need deeper consultation before the proposal is finalized.',
          },
        ],
      },
      vi: {
        title: 'Cao cấp',
        description:
          'Hành trình cao cấp ưu tiên khách sạn chọn lọc, cảm giác trơn tru trong vận hành và nhịp điểm đến được sắp xếp tinh tế.',
        points: [
          {
            title: 'Lưu trú chọn lọc',
            description: 'Khách sạn và nhịp tuyến phối hợp để tạo cảm giác đi thoải mái hơn.',
          },
          {
            title: 'Nhịp ngày mềm',
            description: 'Lịch trình ưu tiên chất lượng trải nghiệm hơn là nhồi dày di chuyển.',
          },
          {
            title: 'Tư vấn riêng trước báo giá',
            description: 'Các yêu cầu cao cấp thường cần trao đổi kỹ hơn trước khi chốt proposal.',
          },
        ],
      },
      it: {
        title: 'Lusso',
        description:
          'I viaggi luxury puntano su soggiorni curati, fluidità di servizio e una sequenza di destinazioni raffinata.',
        points: [
          {
            title: 'Soggiorni curati',
            description:
              'Hotel e pacing lavorano insieme per creare un ritmo più facile da vivere.',
          },
          {
            title: 'Flusso giornaliero morbido',
            description:
              'Il programma privilegia esperienze di qualità rispetto a spostamenti sovraccarichi.',
          },
          {
            title: 'Pianificazione privata',
            description:
              'Le richieste luxury beneficiano spesso di una consulenza più forte prima del preventivo.',
          },
        ],
      },
      es: {
        title: 'Lujo',
        description:
          'Los viajes luxury priorizan estancias cuidadas, suavidad de servicio y una secuencia de destinos refinada.',
        points: [
          {
            title: 'Estancias cuidadas',
            description: 'Hoteles y pacing trabajan juntos para crear un ritmo más fácil de vivir.',
          },
          {
            title: 'Flujo diario suave',
            description:
              'El programa privilegia experiencias de calidad frente a movimientos sobrecargados.',
          },
          {
            title: 'Planificación privada',
            description:
              'Las solicitudes luxury suelen beneficiarse de más consultoría antes del presupuesto.',
          },
        ],
      },
      pt: {
        title: 'Luxo',
        description:
          'As viagens luxury priorizam estadias cuidadas, fluidez de serviço e uma sequência de destinos refinada.',
        points: [
          {
            title: 'Estadias cuidadas',
            description:
              'Hotéis e pacing trabalham juntos para criar um ritmo mais fácil de viver.',
          },
          {
            title: 'Fluxo diário suave',
            description:
              'O programa privilegia experiências de qualidade em vez de movimentos sobrecarregados.',
          },
          {
            title: 'Planeamento privado',
            description:
              'Pedidos luxury costumam beneficiar de mais consultoria antes do orçamento.',
          },
        ],
      },
    },
  },
  '/styles/family': {
    translations: {
      en: {
        title: 'Family',
        description:
          'Family travel needs balanced pacing, easier transfers, flexible downtime, and destinations that work across ages.',
        points: [
          {
            title: 'Balanced rhythm',
            description: 'The route avoids exhausting movement while keeping enough variety.',
          },
          {
            title: 'Comfort and flexibility',
            description: 'The page should communicate ease, not just a list of attractions.',
          },
          {
            title: 'Multi-generation fit',
            description:
              'Good planning handles different energy levels and needs across the group.',
          },
        ],
      },
      vi: {
        title: 'Gia đình',
        description:
          'Du lịch gia đình cần nhịp cân bằng, chuyển tiếp nhẹ, thời gian nghỉ linh hoạt và điểm đến hợp nhiều độ tuổi.',
        points: [
          {
            title: 'Nhịp độ cân bằng',
            description: 'Route tránh cảm giác kiệt sức nhưng vẫn giữ đủ độ đa dạng.',
          },
          {
            title: 'Thoải mái và linh hoạt',
            description:
              'Trang family cần truyền tải sự dễ chịu chứ không chỉ là danh sách điểm tham quan.',
          },
          {
            title: 'Phù hợp đa thế hệ',
            description:
              'Kế hoạch tốt phải xử lý được khác biệt về năng lượng và nhu cầu giữa các thành viên.',
          },
        ],
      },
      it: {
        title: 'Famiglia',
        description:
          'Il viaggio family richiede pacing equilibrato, trasferimenti più facili, downtime flessibile e destinazioni adatte a età diverse.',
        points: [
          {
            title: 'Ritmo bilanciato',
            description: 'La rotta evita movimenti sfiancanti pur mantenendo varietà.',
          },
          {
            title: 'Comfort e flessibilità',
            description: 'La pagina family deve comunicare facilità, non solo liste di attrazioni.',
          },
          {
            title: 'Adatto a più generazioni',
            description:
              'Una buona pianificazione family gestisce livelli di energia e bisogni differenti.',
          },
        ],
      },
      es: {
        title: 'Familia',
        description:
          'El viaje family necesita ritmo equilibrado, traslados más fáciles, tiempos flexibles y destinos válidos para varias edades.',
        points: [
          {
            title: 'Ritmo equilibrado',
            description: 'La ruta evita movimientos agotadores y mantiene variedad.',
          },
          {
            title: 'Comodidad y flexibilidad',
            description:
              'La página family debe comunicar facilidad, no solo listas de atracciones.',
          },
          {
            title: 'Adecuado para varias generaciones',
            description:
              'Una buena planificación family gestiona diferentes niveles de energía y necesidades.',
          },
        ],
      },
      pt: {
        title: 'Família',
        description:
          'A viagem family requer ritmo equilibrado, transfers mais fáceis, tempos flexíveis e destinos adequados a várias idades.',
        points: [
          {
            title: 'Ritmo equilibrado',
            description: 'A rota evita movimentos cansativos e mantém variedade.',
          },
          {
            title: 'Conforto e flexibilidade',
            description:
              'A página family deve comunicar facilidade, não apenas listas de atrações.',
          },
          {
            title: 'Adequado para várias gerações',
            description:
              'Um bom planeamento family gere diferentes níveis de energia e necessidades.',
          },
        ],
      },
    },
  },
  '/styles/culture': {
    translations: {
      en: {
        title: 'Culture',
        description:
          'Culture-led routes revolve around heritage, local food, storytelling, and places with clear historical or social context.',
        points: [
          {
            title: 'Context-rich routes',
            description: 'The value comes from understanding the place, not only visiting it.',
          },
          {
            title: 'Heritage depth',
            description:
              'Pages should guide guests toward combinations with stronger narrative continuity.',
          },
          {
            title: 'Food and local life',
            description: 'Cultural journeys often combine visits, food, and neighborhood texture.',
          },
        ],
      },
      vi: {
        title: 'Văn hóa',
        description:
          'Các route thiên văn hóa xoay quanh di sản, ẩm thực bản địa, lớp kể chuyện và những nơi có bối cảnh lịch sử - xã hội rõ ràng.',
        points: [
          {
            title: 'Route giàu bối cảnh',
            description: 'Giá trị đến từ việc hiểu địa điểm, không chỉ ghé qua và chụp ảnh.',
          },
          {
            title: 'Chiều sâu di sản',
            description:
              'Trang cần dẫn khách đến các kết hợp điểm đến có mạch kể chuyện liền mạch hơn.',
          },
          {
            title: 'Ẩm thực và đời sống bản địa',
            description: 'Hành trình văn hóa thường ghép điểm tham quan với đồ ăn và nhịp phố xóm.',
          },
        ],
      },
      it: {
        title: 'Cultura',
        description:
          'Gli itinerari culture-led ruotano attorno a patrimonio, cibo locale, storytelling e luoghi con forte contesto storico o sociale.',
        points: [
          {
            title: 'Rotte ricche di contesto',
            description: 'Il valore nasce dal capire il luogo, non solo dal visitarlo.',
          },
          {
            title: 'Profondità heritage',
            description:
              'Le pagine devono guidare verso combinazioni con continuità narrativa più forte.',
          },
          {
            title: 'Cibo e vita locale',
            description: 'I viaggi culturali spesso uniscono visite, cibo e tessuto di quartiere.',
          },
        ],
      },
      es: {
        title: 'Cultura',
        description:
          'Los itinerarios culture-led giran alrededor de patrimonio, comida local, storytelling y lugares con fuerte contexto histórico o social.',
        points: [
          {
            title: 'Rutas ricas en contexto',
            description: 'El valor nace de entender el lugar, no solo de visitarlo.',
          },
          {
            title: 'Profundidad heritage',
            description:
              'Las páginas deben guiar hacia combinaciones con continuidad narrativa más fuerte.',
          },
          {
            title: 'Comida y vida local',
            description: 'Los viajes culturales suelen unir visitas, comida y textura de barrio.',
          },
        ],
      },
      pt: {
        title: 'Cultura',
        description:
          'Os itinerários culture-led giram em torno de património, comida local, storytelling e lugares com forte contexto histórico ou social.',
        points: [
          {
            title: 'Rotas ricas em contexto',
            description: 'O valor nasce de compreender o lugar, não apenas de o visitar.',
          },
          {
            title: 'Profundidade heritage',
            description:
              'As páginas devem conduzir a combinações com continuidade narrativa mais forte.',
          },
          {
            title: 'Comida e vida local',
            description: 'As viagens culturais costumam unir visitas, comida e textura de bairro.',
          },
        ],
      },
    },
  },
  '/styles/adventure': {
    translations: {
      en: {
        title: 'Adventure',
        description:
          'Adventure journeys emphasize movement, landscape, and a more active daily structure while keeping route logic clear.',
        points: [
          {
            title: 'Nature and movement',
            description: 'Adventure pages should put active landscapes and route energy up front.',
          },
          {
            title: 'Honest pacing',
            description:
              'Guests need to understand when the trip becomes more active or physically demanding.',
          },
          {
            title: 'Flexible layering',
            description:
              'Adventure can be added to a broader route rather than treated as a separate extreme product.',
          },
        ],
      },
      vi: {
        title: 'Phiêu lưu',
        description:
          'Hành trình phiêu lưu nhấn vào chuyển động, cảnh quan và cấu trúc ngày năng động hơn nhưng vẫn giữ logic route rõ ràng.',
        points: [
          {
            title: 'Thiên nhiên và chuyển động',
            description: 'Trang cần đưa hoạt động ngoài trời và năng lượng tuyến lên trước.',
          },
          {
            title: 'Trung thực về nhịp độ',
            description:
              'Khách cần biết khi nào hành trình đòi hỏi thể lực hoặc di chuyển nhiều hơn.',
          },
          {
            title: 'Ghép linh hoạt',
            description:
              'Adventure có thể là một lớp thêm vào route rộng hơn chứ không phải sản phẩm cực đoan tách biệt.',
          },
        ],
      },
      it: {
        title: 'Avventura',
        description:
          'I viaggi adventure enfatizzano movimento, paesaggio e una struttura quotidiana più attiva senza perdere chiarezza di rotta.',
        points: [
          {
            title: 'Natura e movimento',
            description:
              'Le pagine adventure devono mettere in primo piano paesaggi attivi ed energia di percorso.',
          },
          {
            title: 'Onestà sul ritmo',
            description:
              'Gli ospiti devono capire quando il viaggio diventa più attivo o fisicamente impegnativo.',
          },
          {
            title: 'Combinazioni flessibili',
            description:
              'L’avventura può essere stratificata dentro una rotta più ampia invece di agire come prodotto estremo isolato.',
          },
        ],
      },
      es: {
        title: 'Aventura',
        description:
          'Los viajes adventure enfatizan movimiento, paisaje y una estructura diaria más activa sin perder claridad de ruta.',
        points: [
          {
            title: 'Naturaleza y movimiento',
            description:
              'Las páginas adventure deben poner en primer plano paisajes activos y energía de recorrido.',
          },
          {
            title: 'Honestidad sobre el ritmo',
            description:
              'Los viajeros deben entender cuándo el viaje se vuelve más activo o físicamente exigente.',
          },
          {
            title: 'Combinaciones flexibles',
            description:
              'La aventura puede añadirse a una ruta más amplia en lugar de funcionar como producto extremo aislado.',
          },
        ],
      },
      pt: {
        title: 'Aventura',
        description:
          'As viagens adventure enfatizam movimento, paisagem e uma estrutura diária mais ativa sem perder clareza de rota.',
        points: [
          {
            title: 'Natureza e movimento',
            description:
              'As páginas adventure devem pôr em primeiro plano paisagens ativas e energia de percurso.',
          },
          {
            title: 'Honestidade sobre o ritmo',
            description:
              'Os viajantes devem perceber quando a viagem se torna mais ativa ou fisicamente exigente.',
          },
          {
            title: 'Combinações flexíveis',
            description:
              'A aventura pode ser acrescentada a uma rota mais ampla em vez de atuar como produto extremo isolado.',
          },
        ],
      },
    },
  },
} as const

const packageEntries = {
  '/packages/vietnam-highlights': {
    translations: {
      en: {
        title: 'Vietnam Highlights',
        summary:
          'A multi-region frame for a first Vietnam journey, built for guests who want North, Central, and South in one coherent route.',
        blocks: [
          {
            title: 'Who it suits',
            paragraph:
              'First-time inbound guests who want a balanced picture rather than an overly specialized route.',
          },
          {
            title: 'Suggested structure',
            paragraph:
              'Northern gateway, central heritage, then southern contrast, with pacing adjusted by trip length and style.',
          },
          {
            title: 'Why it converts',
            paragraph:
              'The page gives guests a concrete reference point while leaving space for consultation and customization.',
          },
          {
            title: 'Next step',
            paragraph:
              'Guests should use this page as a route reference, then move into the plan-your-trip flow.',
          },
        ],
      },
      vi: {
        title: 'Điểm nổi bật Việt Nam',
        summary:
          'Khung đa vùng cho chuyến đầu tiên, dành cho khách muốn chạm miền Bắc, miền Trung và miền Nam trong cùng một tuyến mạch lạc.',
        blocks: [
          {
            title: 'Phù hợp với ai',
            paragraph:
              'Phù hợp với khách quốc tế lần đầu đến Việt Nam, muốn một hành trình cân bằng thay vì quá chuyên biệt.',
          },
          {
            title: 'Cấu trúc gợi ý',
            paragraph:
              'Cửa ngõ miền Bắc, cụm di sản miền Trung rồi đến lớp tương phản phía Nam, với nhịp đi được điều chỉnh theo số ngày và style.',
          },
          {
            title: 'Vì sao chuyển đổi tốt',
            paragraph:
              'Trang cho khách một điểm bám đủ cụ thể nhưng vẫn để không gian cho tư vấn và tùy biến.',
          },
          {
            title: 'Bước tiếp theo',
            paragraph:
              'Khách có thể dùng trang này làm hành trình tham khảo rồi chuyển sang bước lên kế hoạch chi tiết.',
          },
        ],
      },
      it: {
        title: 'Vietnam essenziale',
        summary:
          'Una cornice multi-regione per chi vuole toccare Nord, Centro e Sud in una rotta coerente.',
        blocks: [
          {
            title: 'Per chi è adatto',
            paragraph:
              'Ideale per gli ospiti internazionali alla prima visita, che desiderano un itinerario equilibrato e non troppo specializzato.',
          },
          {
            title: 'Struttura suggerita',
            paragraph:
              'Gateway del nord, centro heritage, poi contrasto del sud con pacing adattato a durata e stile.',
          },
          {
            title: 'Perché converte',
            paragraph:
              'Il pacchetto offre un punto di partenza tangibile pur invitando alla personalizzazione.',
          },
          {
            title: 'Cosa succede dopo',
            paragraph:
              'Gli ospiti dovrebbero usare questa pagina come riferimento e poi entrare nel flow di pianificazione.',
          },
        ],
      },
      es: {
        title: 'Vietnam esencial',
        summary:
          'Un marco multi-región para quien quiere tocar Norte, Centro y Sur en una sola ruta coherente.',
        blocks: [
          {
            title: 'Para quién encaja',
            paragraph:
              'Ideal para viajeros internacionales en su primera visita, que buscan un itinerario equilibrado y no demasiado especializado.',
          },
          {
            title: 'Estructura sugerida',
            paragraph:
              'Puerta del norte, centro heritage y luego contraste del sur con ritmo adaptado a duración y estilo.',
          },
          {
            title: 'Por qué convierte',
            paragraph:
              'El paquete da un punto de partida tangible y al mismo tiempo deja espacio para personalizar.',
          },
          {
            title: 'Qué viene después',
            paragraph:
              'Los viajeros deberían usar esta página como referencia y luego pasar al flujo de planificación.',
          },
        ],
      },
      pt: {
        title: 'Vietname essencial',
        summary:
          'Um enquadramento multi-região para quem quer tocar Norte, Centro e Sul numa única rota coerente.',
        blocks: [
          {
            title: 'Para quem serve',
            paragraph:
              'Ideal para viajantes internacionais na primeira visita, que procuram um itinerário equilibrado e não demasiado especializado.',
          },
          {
            title: 'Estrutura sugerida',
            paragraph:
              'Gateway do norte, centro heritage e depois contraste do sul com ritmo adaptado à duração e ao estilo.',
          },
          {
            title: 'Porque converte',
            paragraph:
              'O pacote oferece um ponto de partida tangível e, ao mesmo tempo, deixa espaço para personalização.',
          },
          {
            title: 'O que vem a seguir',
            paragraph:
              'Os viajantes devem usar esta página como referência e depois passar para o fluxo de planeamento.',
          },
        ],
      },
    },
  },
  '/packages/northern-vietnam': {
    translations: {
      en: {
        title: 'Northern Vietnam',
        summary:
          'A focused northern route frame connecting Hanoi, Ha Long, and nearby extensions for guests who want a clearer regional focus.',
        blocks: [
          {
            title: 'Core rhythm',
            paragraph:
              'Urban culture, seascape contrast, and soft extensions into nearby nature or countryside when appropriate.',
          },
          {
            title: 'Best-fit styles',
            paragraph:
              'A good match for culture, family, and light luxury depending on hotel mix and downtime.',
          },
          {
            title: 'Journey depth',
            paragraph:
              'It can stay compact or grow into a richer regional route with more nights and side experiences.',
          },
          {
            title: 'Conversion model',
            paragraph:
              'The goal is to inspire a consultation request with a clear frame, not act like a retail departure table.',
          },
        ],
      },
      vi: {
        title: 'Miền Bắc Việt Nam',
        summary:
          'Một khung route miền Bắc kết nối Hà Nội, Hạ Long và các mở rộng lân cận cho khách muốn tập trung vùng rõ ràng hơn.',
        blocks: [
          {
            title: 'Nhịp lõi',
            paragraph:
              'Văn hóa đô thị, cảnh biển và các mở rộng mềm sang thiên nhiên hoặc vùng ven nếu phù hợp.',
          },
          {
            title: 'Phù hợp với style nào',
            paragraph:
              'Hợp với văn hóa, gia đình và cao cấp nhẹ tùy tổ hợp khách sạn và nhịp nghỉ.',
          },
          {
            title: 'Độ sâu hành trình',
            paragraph:
              'Có thể giữ gọn hoặc mở rộng thành route vùng giàu hơn với thêm đêm và trải nghiệm phụ.',
          },
          {
            title: 'Mô hình chuyển đổi',
            paragraph:
              'Mục tiêu là gợi mở yêu cầu tư vấn bằng một khung rõ ràng, không vận hành như bảng khởi hành retail.',
          },
        ],
      },
      it: {
        title: 'Vietnam del Nord',
        summary:
          'Una cornice regionale che collega Hanoi, Ha Long e la profondità vicina per chi vuole un focus più stretto sul nord.',
        blocks: [
          {
            title: 'Ritmo base',
            paragraph:
              'Cultura urbana, paesaggio marino e possibili estensioni morbide nella natura o nella campagna vicina.',
          },
          {
            title: 'Fit con gli stili',
            paragraph:
              'Funziona bene per cultura, famiglia e light luxury in base al mix di hotel.',
          },
          {
            title: 'Profondità del viaggio',
            paragraph:
              'Può restare compatto o crescere in una rotta regionale più ricca con più notti ed esperienze laterali.',
          },
          {
            title: 'Modello di conversione',
            paragraph:
              'L’obiettivo è ispirare richiesta tramite un sample strutturato, non comportarsi come una tabella partenze retail.',
          },
        ],
      },
      es: {
        title: 'Norte de Vietnam',
        summary:
          'Un marco regional que conecta Hanói, Ha Long y destinos cercanos para quien quiere un foco más estrecho en el norte.',
        blocks: [
          {
            title: 'Ritmo base',
            paragraph:
              'Cultura urbana, paisaje marino y posibles extensiones suaves a naturaleza o campo cercano.',
          },
          {
            title: 'Encaje con estilos',
            paragraph:
              'Funciona bien para cultura, familia y luxury ligero según la mezcla hotelera.',
          },
          {
            title: 'Profundidad del viaje',
            paragraph:
              'Puede mantenerse compacto o crecer hacia una ruta regional más rica con más noches y experiencias laterales.',
          },
          {
            title: 'Modelo de conversión',
            paragraph:
              'La idea es inspirar consulta con un sample estructurado, no comportarse como una tabla retail de salidas.',
          },
        ],
      },
      pt: {
        title: 'Norte do Vietname',
        summary:
          'Um enquadramento regional que liga Hanói, Ha Long e destinos próximos para quem quer foco mais estreito no norte.',
        blocks: [
          {
            title: 'Ritmo base',
            paragraph:
              'Cultura urbana, paisagem marítima e possíveis extensões suaves para natureza ou campo próximo.',
          },
          {
            title: 'Encaixe com estilos',
            paragraph:
              'Funciona bem para cultura, família e luxury leve segundo a combinação hoteleira.',
          },
          {
            title: 'Profundidade da viagem',
            paragraph:
              'Pode manter-se compacto ou crescer para uma rota regional mais rica com mais noites e experiências laterais.',
          },
          {
            title: 'Modelo de conversão',
            paragraph:
              'A ideia é inspirar consulta com um sample estruturado, não agir como uma grelha retail de partidas.',
          },
        ],
      },
    },
  },
  '/packages/central-heritage': {
    translations: {
      en: {
        title: 'Central Heritage',
        summary:
          'A heritage-focused sample itinerary for guests who want architecture, history, and a softer pace in central Vietnam.',
        blocks: [
          {
            title: 'Destination logic',
            paragraph:
              'Hue and Hoi An pair naturally to create historical depth, contrast, and atmosphere.',
          },
          {
            title: 'Experience tone',
            paragraph: 'The route should feel refined and context-rich rather than overloaded.',
          },
          {
            title: 'Who it serves',
            paragraph: 'Culture-focused guests, couples, and families who prefer a slower rhythm.',
          },
          {
            title: 'How the page should sell',
            paragraph:
              'The page should invite consultation about pacing, hotels, and route extensions.',
          },
        ],
      },
      vi: {
        title: 'Di sản miền Trung',
        summary:
          'Một itinerary mẫu thiên di sản cho khách muốn kiến trúc, lịch sử và nhịp đi mềm hơn ở miền Trung.',
        blocks: [
          {
            title: 'Logic điểm đến',
            paragraph:
              'Huế và Hội An ghép tự nhiên để tạo chiều sâu lịch sử, tương phản và không khí.',
          },
          {
            title: 'Tông trải nghiệm',
            paragraph: 'Route nên tạo cảm giác tinh tế, giàu bối cảnh hơn là nhồi quá nhiều điểm.',
          },
          {
            title: 'Phù hợp với ai',
            paragraph: 'Khách thiên văn hóa, cặp đôi và nhóm gia đình thích nhịp chậm.',
          },
          {
            title: 'Cách trang nên bán',
            paragraph:
              'Trang cần mời khách bước vào tư vấn về nhịp đi, khách sạn và mở rộng route.',
          },
        ],
      },
      it: {
        title: 'Patrimonio centrale',
        summary:
          'Un itinerario heritage per chi cerca cultura, architettura e un passo più morbido nel centro del Vietnam.',
        blocks: [
          {
            title: 'Logica delle destinazioni',
            paragraph:
              'Hue e Hoi An si abbinano naturalmente per profondità storica, contrasto e atmosfera.',
          },
          {
            title: 'Tono dell’esperienza',
            paragraph:
              'La rotta dovrebbe risultare raffinata e ricca di contesto invece di essere sovraccarica.',
          },
          {
            title: 'Per chi serve',
            paragraph: 'Viaggiatori culture-focused, coppie e famiglie dal ritmo più lento.',
          },
          {
            title: 'Come dovrebbe vendere',
            paragraph:
              'La pagina deve invitare alla consulenza su pacing, hotel ed eventuali estensioni.',
          },
        ],
      },
      es: {
        title: 'Patrimonio central',
        summary:
          'Un itinerario heritage para quien busca cultura, arquitectura y un paso más suave en el centro de Vietnam.',
        blocks: [
          {
            title: 'Lógica de destinos',
            paragraph:
              'Hue y Hoi An se combinan de forma natural para crear profundidad histórica, contraste y atmósfera.',
          },
          {
            title: 'Tono de la experiencia',
            paragraph: 'La ruta debería sentirse refinada y rica en contexto, no sobrecargada.',
          },
          {
            title: 'A quién sirve',
            paragraph: 'Viajeros culture-focused, parejas y familias de ritmo más lento.',
          },
          {
            title: 'Cómo debe vender',
            paragraph:
              'La página debe invitar a consulta sobre ritmo, hoteles y extensión de ruta.',
          },
        ],
      },
      pt: {
        title: 'Património central',
        summary:
          'Um itinerário heritage para quem procura cultura, arquitetura e um passo mais suave no centro do Vietname.',
        blocks: [
          {
            title: 'Lógica de destinos',
            paragraph:
              'Hue e Hoi An combinam naturalmente para criar profundidade histórica, contraste e atmosfera.',
          },
          {
            title: 'Tom da experiência',
            paragraph: 'A rota deve sentir-se refinada e rica em contexto, não sobrecarregada.',
          },
          {
            title: 'Para quem serve',
            paragraph: 'Viajantes culture-focused, casais e famílias de ritmo mais lento.',
          },
          {
            title: 'Como deve vender',
            paragraph:
              'A página deve convidar à consultoria sobre ritmo, hotéis e extensão de rota.',
          },
        ],
      },
    },
  },
} as const

type Assets = {
  guideCategoryID: number | string
  heroImageID: number | string
  pagesByPath: Map<string, PageDoc>
  sampleItinerariesImageID: number | string
  secondaryImageID: number | string
  travelStylesImageID: number | string
  tripPlannerFormID: number | string
}

const requiredPaths = [
  '/',
  '/about-us',
  '/contact-us',
  '/destinations',
  '/destinations/ha-noi',
  '/destinations/ha-long',
  '/destinations/hoi-an',
  '/destinations/hue',
  '/destinations/mekong',
  '/packages',
  '/packages/vietnam-highlights',
  '/packages/northern-vietnam',
  '/packages/central-heritage',
  '/plan-your-trip',
  '/styles',
  '/styles/luxury',
  '/styles/family',
  '/styles/culture',
  '/styles/adventure',
  '/testimonials',
  '/travel-guide',
] as const

const getPage = (assets: Assets, pathname: (typeof requiredPaths)[number]) => {
  const page = assets.pagesByPath.get(pathname)

  if (!page) {
    throw new Error(`Missing WingSide page ${pathname}`)
  }

  return page
}

const relatedPageIDs = (assets: Assets, pathnames: string[]) =>
  pathnames.map((pathname) => {
    const page = assets.pagesByPath.get(pathname)

    if (!page) {
      throw new Error(`Missing related page ${pathname}`)
    }

    return page.id
  })

const getBackfillPagePathname = (page: PageDoc): null | string => {
  if (typeof page.pathname === 'string' && page.pathname) {
    return page.pathname
  }

  return page.slug === 'home' ? '/' : null
}

const destinationDetailCopy: Record<
  SupportedBackfillLocale,
  {
    ctaParagraph: string
    ctaTitle: string
    experienceEyebrow: string
    experienceMeta: string
    experienceTitle: string
    experienceDescription: string
    infoDescription: string
    infoEyebrow: string
    infoTitle: (title: string) => string
    metaDescription: (title: string) => string
    rows: Array<{ description: string; label: string; value: string }>
  }
> = {
  en: {
    ctaParagraph:
      'Use the planner to combine this destination with regions, travel styles, and pacing that fit your group.',
    ctaTitle: 'Want a route tailored around this destination?',
    experienceDescription:
      'The destination page should highlight experience clusters instead of becoming a dense selling grid.',
    experienceEyebrow: 'What to expect',
    experienceMeta: 'Experience',
    experienceTitle: 'Key experience clusters',
    infoDescription:
      'A destination page should combine overview, seasonality, top experiences, related routes, and a clear path to inquiry.',
    infoEyebrow: 'Destination page structure',
    infoTitle: (title) => `${title} as an inbound planning page`,
    metaDescription: (title) => `${title} destination page for WingSide inbound Vietnam planning.`,
    rows: [
      {
        description:
          'The page helps the traveler understand why this place matters inside a wider Vietnam journey.',
        label: 'Best use',
        value: 'Destination entry',
      },
      {
        description:
          'Destination discovery should lead to inquiry once the user has seen enough trust signals.',
        label: 'Top conversion path',
        value: 'Plan your trip',
      },
      {
        description: 'These pages support both search discovery and consultative selling.',
        label: 'Content role',
        value: 'SEO + planning',
      },
    ],
  },
  es: {
    ctaParagraph:
      'Use el planificador para combinar este destino con regiones, estilos de viaje y ritmo adecuados para su grupo.',
    ctaTitle: '¿Quiere una ruta a medida alrededor de este destino?',
    experienceDescription:
      'La página del destino debe destacar grupos de experiencias en lugar de convertirse en una cuadrícula densa de venta.',
    experienceEyebrow: 'Qué esperar',
    experienceMeta: 'Experiencia',
    experienceTitle: 'Experiencias destacadas',
    infoDescription:
      'Una página de destino debe combinar visión general, temporada, experiencias clave, rutas relacionadas y un camino claro hacia la consulta.',
    infoEyebrow: 'Estructura de página de destino',
    infoTitle: (title) => `${title} como página para planificar el viaje`,
    metaDescription: (title) =>
      `Página de destino ${title} para planificar un viaje a Vietnam con WingSide.`,
    rows: [
      {
        description:
          'La página ayuda al viajero a entender por qué este lugar importa dentro de un viaje más amplio por Vietnam.',
        label: 'Mejor uso',
        value: 'Entrada por destino',
      },
      {
        description:
          'La exploración del destino debe conducir a una consulta cuando el usuario ya ve suficientes señales de confianza.',
        label: 'Ruta principal de conversión',
        value: 'Planifica tu viaje',
      },
      {
        description: 'Estas páginas sirven tanto para búsqueda como para venta consultiva.',
        label: 'Rol del contenido',
        value: 'SEO + planificación',
      },
    ],
  },
  it: {
    ctaParagraph:
      'Usa il planner per combinare questa destinazione con regioni, stili di viaggio e ritmo adatti al tuo gruppo.',
    ctaTitle: 'Vuoi una rotta su misura intorno a questa destinazione?',
    experienceDescription:
      'La pagina della destinazione deve evidenziare gruppi di esperienze invece di diventare una griglia commerciale fitta.',
    experienceEyebrow: 'Cosa aspettarsi',
    experienceMeta: 'Esperienza',
    experienceTitle: 'Esperienze principali',
    infoDescription:
      'Una pagina destinazione deve unire panoramica, stagionalità, esperienze principali, itinerari correlati e un percorso chiaro verso la richiesta.',
    infoEyebrow: 'Struttura della pagina destinazione',
    infoTitle: (title) => `${title} come pagina per pianificare il viaggio`,
    metaDescription: (title) =>
      `Pagina destinazione ${title} per pianificare un viaggio in Vietnam con WingSide.`,
    rows: [
      {
        description:
          'La pagina aiuta il viaggiatore a capire perché questo luogo conta dentro un viaggio più ampio in Vietnam.',
        label: 'Uso migliore',
        value: 'Ingresso per destinazione',
      },
      {
        description:
          "L'esplorazione della destinazione deve portare alla richiesta quando l'utente ha visto abbastanza segnali di fiducia.",
        label: 'Percorso di conversione principale',
        value: 'Pianifica il viaggio',
      },
      {
        description: 'Queste pagine supportano sia la ricerca sia la vendita consulenziale.',
        label: 'Ruolo del contenuto',
        value: 'SEO + pianificazione',
      },
    ],
  },
  pt: {
    ctaParagraph:
      'Use o planeador para combinar este destino com regiões, estilos de viagem e ritmo adequados ao seu grupo.',
    ctaTitle: 'Precisa de uma rota à medida em torno deste destino?',
    experienceDescription:
      'A página do destino deve destacar grupos de experiências em vez de se tornar uma grelha densa de venda.',
    experienceEyebrow: 'O que esperar',
    experienceMeta: 'Experiência',
    experienceTitle: 'Experiências principais',
    infoDescription:
      'Uma página de destino deve combinar visão geral, sazonalidade, experiências principais, rotas relacionadas e um caminho claro para o pedido.',
    infoEyebrow: 'Estrutura da página de destino',
    infoTitle: (title) => `${title} como página para planear a viagem`,
    metaDescription: (title) =>
      `Página de destino ${title} para planear uma viagem ao Vietname com a WingSide.`,
    rows: [
      {
        description:
          'A página ajuda o viajante a perceber por que este lugar importa dentro de uma viagem mais ampla pelo Vietname.',
        label: 'Melhor uso',
        value: 'Entrada por destino',
      },
      {
        description:
          'A descoberta do destino deve conduzir ao pedido quando o utilizador já viu sinais de confiança suficientes.',
        label: 'Caminho principal de conversão',
        value: 'Planear a viagem',
      },
      {
        description: 'Estas páginas apoiam tanto a pesquisa como a venda consultiva.',
        label: 'Papel do conteúdo',
        value: 'SEO + planeamento',
      },
    ],
  },
  vi: {
    ctaParagraph:
      'Hãy dùng công cụ lên kế hoạch để ghép điểm đến này với các vùng khác, phong cách du lịch và nhịp đi phù hợp với nhóm của bạn.',
    ctaTitle: 'Muốn dựng hành trình quanh điểm đến này?',
    experienceDescription:
      'Trang destination nên làm nổi bật các cụm trải nghiệm thay vì biến thành lưới bán hàng dày đặc.',
    experienceEyebrow: 'Điều gì đáng kỳ vọng',
    experienceMeta: 'Trải nghiệm',
    experienceTitle: 'Cụm trải nghiệm nổi bật',
    infoDescription:
      'Trang điểm đến nên kết hợp tổng quan, mùa vụ, cụm trải nghiệm chính, hành trình liên quan và một đường dẫn rõ sang yêu cầu tư vấn.',
    infoEyebrow: 'Cấu trúc trang điểm đến',
    infoTitle: (title) => `${title} như một trang lên ý tưởng hành trình`,
    metaDescription: (title) =>
      `Trang điểm đến ${title} để lên kế hoạch hành trình Việt Nam cùng WingSide.`,
    rows: [
      {
        description:
          'Trang giúp khách hiểu vì sao nơi này quan trọng trong một hành trình Việt Nam rộng hơn.',
        label: 'Dùng tốt nhất cho',
        value: 'Điểm vào theo điểm đến',
      },
      {
        description:
          'Khám phá điểm đến nên dẫn sang yêu cầu tư vấn khi khách đã thấy đủ tín hiệu tin cậy.',
        label: 'Đường chuyển đổi chính',
        value: 'Lên kế hoạch',
      },
      {
        description: 'Những trang này vừa phục vụ tìm kiếm vừa hỗ trợ bán hàng tư vấn.',
        label: 'Vai trò nội dung',
        value: 'SEO + planning',
      },
    ],
  },
}

const styleDetailCopy: Record<
  SupportedBackfillLocale,
  {
    ctaParagraph: string
    ctaTitle: string
    eyebrow: string
    metaDescription: (title: string) => string
    metaTitle: (title: string) => string
    pointMeta: string
    sectionDescription: string
    sectionTitle: string
  }
> = {
  en: {
    ctaParagraph:
      'Use the planner and mention the style you prefer so the team can adjust pacing, hotels, and route depth.',
    ctaTitle: 'Want a trip built around this style?',
    eyebrow: 'Style logic',
    metaDescription: (title) => `${title} travel style page for WingSide.`,
    metaTitle: (title) => `${title} Vietnam travel`,
    pointMeta: 'Travel style',
    sectionDescription:
      'The style page helps travelers choose the right direction before they submit an inquiry.',
    sectionTitle: 'What this style means in practice',
  },
  es: {
    ctaParagraph:
      'Use el planificador e indique el estilo que prefiere para que el equipo ajuste ritmo, hoteles y profundidad de ruta.',
    ctaTitle: '¿Quiere un viaje construido alrededor de este estilo?',
    eyebrow: 'Lógica del estilo',
    metaDescription: (title) => `Página de estilo ${title.toLowerCase()} de WingSide.`,
    metaTitle: (title) => `${title} para viajar por Vietnam`,
    pointMeta: 'Estilo de viaje',
    sectionDescription:
      'La página de estilo ayuda al viajero a elegir la dirección correcta antes de enviar una consulta.',
    sectionTitle: 'Qué significa este estilo en la práctica',
  },
  it: {
    ctaParagraph:
      'Usa lo strumento di pianificazione e indica lo stile che preferisci, così la squadra potrà adattare ritmo, hotel e profondità dell’itinerario.',
    ctaTitle: 'Vuoi un viaggio costruito intorno a questo stile?',
    eyebrow: 'Logica dello stile',
    metaDescription: (title) => `Pagina dello stile ${title.toLowerCase()} di WingSide.`,
    metaTitle: (title) => `${title} per viaggiare in Vietnam`,
    pointMeta: 'Stile di viaggio',
    sectionDescription:
      'La pagina stile aiuta il viaggiatore a scegliere la direzione giusta prima di inviare una richiesta.',
    sectionTitle: 'Cosa significa questo stile in pratica',
  },
  pt: {
    ctaParagraph:
      'Use o planeador e indique o estilo que prefere para a equipa ajustar ritmo, hotéis e profundidade da rota.',
    ctaTitle: 'Quer uma viagem construída em torno deste estilo?',
    eyebrow: 'Lógica do estilo',
    metaDescription: (title) => `Página de estilo ${title.toLowerCase()} da WingSide.`,
    metaTitle: (title) => `${title} para viajar pelo Vietname`,
    pointMeta: 'Estilo de viagem',
    sectionDescription:
      'A página de estilo ajuda o viajante a escolher a direção certa antes de enviar um pedido.',
    sectionTitle: 'O que este estilo significa na prática',
  },
  vi: {
    ctaParagraph:
      'Hãy dùng công cụ lên kế hoạch và cho biết phong cách bạn ưu tiên để đội ngũ điều chỉnh nhịp đi, khách sạn và chiều sâu trải nghiệm.',
    ctaTitle: 'Muốn dựng hành trình quanh phong cách này?',
    eyebrow: 'Định hướng phong cách',
    metaDescription: (title) => `Trang phong cách ${title.toLowerCase()} của WingSide.`,
    metaTitle: (title) => `${title} du lịch Việt Nam`,
    pointMeta: 'Phong cách du lịch',
    sectionDescription: 'Trang phong cách giúp khách chọn đúng hướng trước khi gửi yêu cầu tư vấn.',
    sectionTitle: 'Phong cách này có ý nghĩa gì trong thực tế',
  },
}

const packageDetailCopy: Record<
  SupportedBackfillLocale,
  {
    ctaParagraph: string
    ctaTitle: string
    metaDescription: (title: string) => string
  }
> = {
  en: {
    ctaParagraph:
      'These package pages are planning references. The real next step is a custom inquiry, not a fixed checkout.',
    ctaTitle: 'Would you like to adapt this sample itinerary?',
    metaDescription: (title) => `${title} sample itinerary page for WingSide.`,
  },
  es: {
    ctaParagraph:
      'Estos itinerarios sirven como referencia. El siguiente paso es solicitar una propuesta personalizada, no realizar una compra fija.',
    ctaTitle: '¿Necesita ajustar este itinerario de ejemplo?',
    metaDescription: (title) =>
      `Página de itinerario de ejemplo ${title.toLowerCase()} para WingSide.`,
  },
  it: {
    ctaParagraph:
      'Questi itinerari servono come riferimento. Il passo successivo è chiedere una proposta personalizzata, non effettuare un acquisto fisso.',
    ctaTitle: 'Vuoi adattare questo itinerario di esempio?',
    metaDescription: (title) =>
      `Pagina itinerario di esempio ${title.toLowerCase()} per WingSide.`,
  },
  pt: {
    ctaParagraph:
      'Estes itinerários servem de referência. O passo seguinte é pedir uma proposta personalizada, não efetuar uma compra fixa.',
    ctaTitle: 'Precisa de ajustar este itinerário de exemplo?',
    metaDescription: (title) =>
      `Página de itinerário de exemplo ${title.toLowerCase()} para a WingSide.`,
  },
  vi: {
    ctaParagraph:
      'Những hành trình này dùng để tham khảo. Bước tiếp theo là gửi yêu cầu để nhận đề xuất phù hợp, không phải mua một gói cố định.',
    ctaTitle: 'Cần điều chỉnh hành trình mẫu này?',
    metaDescription: (title) => `Trang hành trình mẫu ${title.toLowerCase()} cho WingSide.`,
  },
}

const sharedDestinationCards: Record<
  SupportedBackfillLocale,
  Array<{
    description: string
    meta: string
    pathname: string
    title: string
  }>
> = {
  en: [
    {
      description: 'Urban heritage, food, and North Vietnam gateway logic.',
      meta: 'North Vietnam',
      pathname: '/destinations/ha-noi',
      title: 'Hanoi',
    },
    {
      description: 'Cruise and seascape rhythm for routes that need contrast.',
      meta: 'Bay and cruise',
      pathname: '/destinations/ha-long',
      title: 'Ha Long',
    },
    {
      description:
        'Heritage atmosphere and softer evening pacing for family or culture-led routes.',
      meta: 'Central heritage',
      pathname: '/destinations/hoi-an',
      title: 'Hoi An',
    },
    {
      description: 'Imperial depth and stronger historical storytelling for central Vietnam.',
      meta: 'Historic city',
      pathname: '/destinations/hue',
      title: 'Hue',
    },
    {
      description: 'Southern waterways and local life for a softer finish.',
      meta: 'Southern Vietnam',
      pathname: '/destinations/mekong',
      title: 'Mekong',
    },
  ],
  es: [
    {
      description: 'Patrimonio urbano, gastronomía y lógica de puerta al norte de Vietnam.',
      meta: 'Norte de Vietnam',
      pathname: '/destinations/ha-noi',
      title: 'Hanói',
    },
    {
      description: 'Crucero y paisaje marino para rutas que buscan contraste.',
      meta: 'Bahía y crucero',
      pathname: '/destinations/ha-long',
      title: 'Ha Long',
    },
    {
      description:
        'Atmósfera patrimonial y ritmo nocturno suave para rutas familiares o culturales.',
      meta: 'Patrimonio central',
      pathname: '/destinations/hoi-an',
      title: 'Hoi An',
    },
    {
      description: 'Profundidad imperial y narrativa histórica más fuerte para el centro.',
      meta: 'Ciudad histórica',
      pathname: '/destinations/hue',
      title: 'Hue',
    },
    {
      description: 'Aguas del sur y vida local para un cierre más suave.',
      meta: 'Sur de Vietnam',
      pathname: '/destinations/mekong',
      title: 'Mekong',
    },
  ],
  it: [
    {
      description: 'Patrimonio urbano, cucina e logica di accesso al nord del Vietnam.',
      meta: 'Vietnam del Nord',
      pathname: '/destinations/ha-noi',
      title: 'Hanoi',
    },
    {
      description: 'Crociera e paesaggio marino per rotte che cercano contrasto.',
      meta: 'Baia e crociera',
      pathname: '/destinations/ha-long',
      title: 'Ha Long',
    },
    {
      description: 'Atmosfera heritage e ritmo serale morbido per rotte famiglia o cultura.',
      meta: 'Patrimonio centrale',
      pathname: '/destinations/hoi-an',
      title: 'Hoi An',
    },
    {
      description: 'Profondità imperiale e storytelling storico più forte per il centro.',
      meta: 'Città storica',
      pathname: '/destinations/hue',
      title: 'Hue',
    },
    {
      description: 'Acque del sud e vita locale per una chiusura più morbida.',
      meta: 'Vietnam del Sud',
      pathname: '/destinations/mekong',
      title: 'Mekong',
    },
  ],
  pt: [
    {
      description: 'Património urbano, gastronomia e lógica de entrada no norte do Vietname.',
      meta: 'Norte do Vietname',
      pathname: '/destinations/ha-noi',
      title: 'Hanói',
    },
    {
      description: 'Cruzeiro e paisagem marítima para rotas que procuram contraste.',
      meta: 'Baía e cruzeiro',
      pathname: '/destinations/ha-long',
      title: 'Ha Long',
    },
    {
      description: 'Atmosfera patrimonial e ritmo noturno suave para rotas de família ou cultura.',
      meta: 'Património central',
      pathname: '/destinations/hoi-an',
      title: 'Hoi An',
    },
    {
      description: 'Profundidade imperial e narrativa histórica mais forte para o centro.',
      meta: 'Cidade histórica',
      pathname: '/destinations/hue',
      title: 'Hue',
    },
    {
      description: 'Águas do sul e vida local para um fecho mais suave.',
      meta: 'Sul do Vietname',
      pathname: '/destinations/mekong',
      title: 'Mekong',
    },
  ],
  vi: [
    {
      description: 'Di sản đô thị, ẩm thực và cửa ngõ hợp lý cho các route miền Bắc.',
      meta: 'Miền Bắc',
      pathname: '/destinations/ha-noi',
      title: 'Hà Nội',
    },
    {
      description: 'Du thuyền và lớp cảnh quan biển cho những route cần tương phản mạnh.',
      meta: 'Vịnh và du thuyền',
      pathname: '/destinations/ha-long',
      title: 'Hạ Long',
    },
    {
      description: 'Không khí di sản và nhịp tối mềm cho route thiên gia đình hoặc văn hóa.',
      meta: 'Di sản miền Trung',
      pathname: '/destinations/hoi-an',
      title: 'Hoi An',
    },
    {
      description: 'Chiều sâu đế đô và lớp kể chuyện lịch sử rõ hơn cho route miền Trung.',
      meta: 'Thành phố lịch sử',
      pathname: '/destinations/hue',
      title: 'Huế',
    },
    {
      description: 'Sông nước miền Nam và đời sống địa phương cho một cái kết mềm hơn.',
      meta: 'Miền Nam',
      pathname: '/destinations/mekong',
      title: 'Mekong',
    },
  ],
}

const homeMetaLabels: Record<SupportedBackfillLocale, { package: string; style: string }> = {
  en: {
    package: 'Sample package',
    style: 'Travel style',
  },
  es: {
    package: 'Itinerario de ejemplo',
    style: 'Estilo de viaje',
  },
  it: {
    package: 'Itinerario di esempio',
    style: 'Stile di viaggio',
  },
  pt: {
    package: 'Itinerário de exemplo',
    style: 'Estilo de viagem',
  },
  vi: {
    package: 'Hành trình mẫu',
    style: 'Phong cách du lịch',
  },
}

const styleHubChromeCopy: Record<
  SupportedBackfillLocale,
  {
    adventureMeta: string
    adventureTitle: string
    contentTitleA: string
    contentTitleB: string
    cultureMeta: string
    cultureTitle: string
    familyMeta: string
    gridDescription: string
    gridEyebrow: string
    gridTitle: string
    luxuryMeta: string
  }
> = {
  en: {
    adventureMeta: 'Adventure focus',
    adventureTitle: 'Adventure',
    contentTitleA: 'Choose the rhythm before the route',
    contentTitleB: 'Built for consultative selling',
    cultureMeta: 'Culture focus',
    cultureTitle: 'Culture',
    familyMeta: 'Family travel',
    gridDescription:
      'These entry points create a softer consultative funnel than a wall of fixed outbound products.',
    gridEyebrow: 'Travel themes',
    gridTitle: 'Choose your travel style',
    luxuryMeta: 'Premium style',
  },
  es: {
    adventureMeta: 'Enfoque de aventura',
    adventureTitle: 'Aventura',
    contentTitleA: 'Elija el ritmo antes que la ruta',
    contentTitleB: 'Pensado para venta consultiva',
    cultureMeta: 'Enfoque cultural',
    cultureTitle: 'Cultura',
    familyMeta: 'Viaje en familia',
    gridDescription:
      'Estos puntos de entrada crean un embudo más suave y consultivo que un muro de productos de salida.',
    gridEyebrow: 'Temas de viaje',
    gridTitle: 'Elija su estilo de viaje',
    luxuryMeta: 'Estilo premium',
  },
  it: {
    adventureMeta: 'Focus avventura',
    adventureTitle: 'Avventura',
    contentTitleA: 'Scegli il ritmo prima della rotta',
    contentTitleB: 'Pensato per vendita consulenziale',
    cultureMeta: 'Focus cultura',
    cultureTitle: 'Cultura',
    familyMeta: 'Viaggio in famiglia',
    gridDescription:
      'Questi punti di ingresso accompagnano con gradualità verso la consulenza, invece di mostrare una parete di prodotti standardizzati.',
    gridEyebrow: 'Temi di viaggio',
    gridTitle: 'Scegli il tuo stile di viaggio',
    luxuryMeta: 'Stile premium',
  },
  pt: {
    adventureMeta: 'Foco em aventura',
    adventureTitle: 'Aventura',
    contentTitleA: 'Escolha o ritmo antes da rota',
    contentTitleB: 'Criado para venda consultiva',
    cultureMeta: 'Foco cultural',
    cultureTitle: 'Cultura',
    familyMeta: 'Viagem em família',
    gridDescription:
      'Estes pontos de entrada conduzem de forma gradual ao aconselhamento, em vez de mostrarem uma parede de produtos padronizados.',
    gridEyebrow: 'Temas de viagem',
    gridTitle: 'Escolha o seu estilo de viagem',
    luxuryMeta: 'Estilo premium',
  },
  vi: {
    adventureMeta: 'Định hướng phiêu lưu',
    adventureTitle: 'Phiêu lưu',
    contentTitleA: 'Chọn nhịp trước khi chọn route',
    contentTitleB: 'Phục vụ bán hàng tư vấn',
    cultureMeta: 'Định hướng văn hóa',
    cultureTitle: 'Văn hóa',
    familyMeta: 'Du lịch gia đình',
    gridDescription:
      'Những điểm bắt đầu này dẫn dắt tự nhiên tới tư vấn, thay vì bày ra một bức tường sản phẩm đại trà.',
    gridEyebrow: 'Chủ đề hành trình',
    gridTitle: 'Chọn phong cách của bạn',
    luxuryMeta: 'Phong cách cao cấp',
  },
}

const styleHubCards: Record<
  SupportedBackfillLocale,
  Array<{
    description: string
    metaKey: keyof (typeof styleHubChromeCopy)[SupportedBackfillLocale]
    titleKey?: 'adventureTitle' | 'cultureTitle'
    titleRouteKey?: 'family' | 'luxury'
    url: string
  }>
> = {
  en: [
    {
      description: 'Curated stays, comfort, and refined pacing.',
      metaKey: 'luxuryMeta',
      titleRouteKey: 'luxury',
      url: '/styles/luxury',
    },
    {
      description: 'Balanced rhythm, flexible daily flow, and destinations that work for families.',
      metaKey: 'familyMeta',
      titleRouteKey: 'family',
      url: '/styles/family',
    },
    {
      description: 'Heritage, local stories, food, and context.',
      metaKey: 'cultureMeta',
      titleKey: 'cultureTitle',
      url: '/styles/culture',
    },
    {
      description: 'Nature, movement, and a more active route design.',
      metaKey: 'adventureMeta',
      titleKey: 'adventureTitle',
      url: '/styles/adventure',
    },
  ],
  es: [
    {
      description: 'Estancias cuidadas, comodidad y ritmo refinado.',
      metaKey: 'luxuryMeta',
      titleRouteKey: 'luxury',
      url: '/styles/luxury',
    },
    {
      description: 'Ritmo equilibrado, flujo diario flexible y destinos adecuados para familias.',
      metaKey: 'familyMeta',
      titleRouteKey: 'family',
      url: '/styles/family',
    },
    {
      description: 'Patrimonio, historias locales, gastronomía y contexto.',
      metaKey: 'cultureMeta',
      titleKey: 'cultureTitle',
      url: '/styles/culture',
    },
    {
      description: 'Naturaleza, movimiento y un diseño de ruta más activo.',
      metaKey: 'adventureMeta',
      titleKey: 'adventureTitle',
      url: '/styles/adventure',
    },
  ],
  it: [
    {
      description: 'Soggiorni curati, comfort e ritmo raffinato.',
      metaKey: 'luxuryMeta',
      titleRouteKey: 'luxury',
      url: '/styles/luxury',
    },
    {
      description:
        'Ritmo bilanciato, flusso giornaliero flessibile e destinazioni adatte alle famiglie.',
      metaKey: 'familyMeta',
      titleRouteKey: 'family',
      url: '/styles/family',
    },
    {
      description: 'Patrimonio, storie locali, cucina e contesto.',
      metaKey: 'cultureMeta',
      titleKey: 'cultureTitle',
      url: '/styles/culture',
    },
    {
      description: 'Natura, movimento e una progettazione di rotta più attiva.',
      metaKey: 'adventureMeta',
      titleKey: 'adventureTitle',
      url: '/styles/adventure',
    },
  ],
  pt: [
    {
      description: 'Estadias cuidadas, conforto e ritmo refinado.',
      metaKey: 'luxuryMeta',
      titleRouteKey: 'luxury',
      url: '/styles/luxury',
    },
    {
      description: 'Ritmo equilibrado, fluxo diário flexível e destinos adequados para famílias.',
      metaKey: 'familyMeta',
      titleRouteKey: 'family',
      url: '/styles/family',
    },
    {
      description: 'Património, histórias locais, gastronomia e contexto.',
      metaKey: 'cultureMeta',
      titleKey: 'cultureTitle',
      url: '/styles/culture',
    },
    {
      description: 'Natureza, movimento e um desenho de rota mais ativo.',
      metaKey: 'adventureMeta',
      titleKey: 'adventureTitle',
      url: '/styles/adventure',
    },
  ],
  vi: [
    {
      description: 'Khách sạn chọn lọc, thoải mái và nhịp đi tinh tế.',
      metaKey: 'luxuryMeta',
      titleRouteKey: 'luxury',
      url: '/styles/luxury',
    },
    {
      description: 'Nhịp cân bằng, ngày đi linh hoạt và lựa chọn điểm đến hợp nhiều độ tuổi.',
      metaKey: 'familyMeta',
      titleRouteKey: 'family',
      url: '/styles/family',
    },
    {
      description: 'Di sản, ẩm thực địa phương, những câu chuyện và lớp bối cảnh có ý nghĩa.',
      metaKey: 'cultureMeta',
      titleKey: 'cultureTitle',
      url: '/styles/culture',
    },
    {
      description: 'Thiên nhiên, chuyển động và thiết kế route năng động hơn.',
      metaKey: 'adventureMeta',
      titleKey: 'adventureTitle',
      url: '/styles/adventure',
    },
  ],
}

const packageHubChromeCopy: Record<
  SupportedBackfillLocale,
  {
    gridDescription: string
    gridEyebrow: string
    gridTitle: string
    infoEyebrow: string
    rows: Array<{ description: string; label: string; value: string }>
    tags: {
      central: string
      multiRegion: string
      northern: string
    }
  }
> = {
  en: {
    gridDescription:
      'These pages work as curated itinerary examples, not as rigid retail departures.',
    gridEyebrow: 'Itinerary ideas',
    gridTitle: 'Sample itinerary structures',
    infoEyebrow: 'Sample itinerary logic',
    rows: [
      {
        description:
          'The page helps the traveler imagine what a coherent Vietnam journey can look like.',
        label: 'Use it as',
        value: 'Reference route frame',
      },
      {
        description: 'Inbound planning still needs human scoping before quotation and operation.',
        label: 'Do not treat it as',
        value: 'Fixed checkout',
      },
      {
        description: 'Share dates, group size, style, and the places you most want to see.',
        label: 'Next step',
        value: 'Plan your trip',
      },
    ],
    tags: {
      central: 'Central Vietnam',
      multiRegion: 'Multi-region',
      northern: 'Northern Vietnam',
    },
  },
  es: {
    gridDescription:
      'Estas páginas funcionan como ejemplos de itinerario seleccionados, no como salidas minoristas rígidas.',
    gridEyebrow: 'Ideas de itinerario',
    gridTitle: 'Estructuras de itinerario de ejemplo',
    infoEyebrow: 'Lógica del itinerario de ejemplo',
    rows: [
      {
        description:
          'La página ayuda al viajero a imaginar cómo puede verse un viaje coherente por Vietnam.',
        label: 'Úselo como',
        value: 'Marco de ruta de referencia',
      },
      {
        description:
          'La planificación del viaje todavía necesita intervención humana antes de cotización y operación.',
        label: 'No lo trate como',
        value: 'Checkout fijo',
      },
      {
        description: 'Comparta fechas, tamaño de grupo, estilo y lugares imprescindibles.',
        label: 'Siguiente paso',
        value: 'Planifica tu viaje',
      },
    ],
    tags: {
      central: 'Centro de Vietnam',
      multiRegion: 'Multi-región',
      northern: 'Norte de Vietnam',
    },
  },
  it: {
    gridDescription:
      'Queste pagine funzionano come esempi di itinerario curati, non come partenze retail rigide.',
    gridEyebrow: 'Idee di itinerario',
    gridTitle: 'Strutture di itinerario di esempio',
    infoEyebrow: "Logica dell'itinerario di esempio",
    rows: [
      {
        description:
          'La pagina aiuta il viaggiatore a immaginare come può apparire un viaggio coerente in Vietnam.',
        label: 'Usalo come',
        value: 'Schema di rotta di riferimento',
      },
      {
        description:
          'La pianificazione del viaggio richiede ancora un confronto umano prima di preventivo e operatività.',
        label: 'Non trattarlo come',
        value: 'Checkout fisso',
      },
      {
        description: 'Condividi date, dimensione del gruppo, stile e luoghi da non perdere.',
        label: 'Passo successivo',
        value: 'Pianifica il viaggio',
      },
    ],
    tags: {
      central: 'Vietnam centrale',
      multiRegion: 'Multi-regione',
      northern: 'Vietnam del Nord',
    },
  },
  pt: {
    gridDescription:
      'Estas páginas funcionam como exemplos de itinerário selecionados, não como partidas retalhistas rígidas.',
    gridEyebrow: 'Ideias de itinerário',
    gridTitle: 'Estruturas de itinerário de exemplo',
    infoEyebrow: 'Lógica do itinerário de exemplo',
    rows: [
      {
        description:
          'A página ajuda o viajante a imaginar como pode ser uma viagem coerente pelo Vietname.',
        label: 'Use como',
        value: 'Estrutura de rota de referência',
      },
      {
        description:
          'O planeamento da viagem ainda precisa de avaliação humana antes de cotação e operação.',
        label: 'Não trate como',
        value: 'Checkout fixo',
      },
      {
        description: 'Partilhe datas, tamanho do grupo, estilo e lugares imperdíveis.',
        label: 'Próximo passo',
        value: 'Planear a viagem',
      },
    ],
    tags: {
      central: 'Centro do Vietname',
      multiRegion: 'Multi-região',
      northern: 'Norte do Vietname',
    },
  },
  vi: {
    gridDescription:
      'Những trang này đóng vai trò như route ví dụ được tuyển chọn, không phải departure table cứng.',
    gridEyebrow: 'Ý tưởng hành trình',
    gridTitle: 'Các cấu trúc itinerary mẫu',
    infoEyebrow: 'Logic hành trình mẫu',
    rows: [
      {
        description:
          'Trang giúp khách hình dung một hành trình Việt Nam mạch lạc có thể trông như thế nào.',
        label: 'Dùng như',
        value: 'Khung route tham chiếu',
      },
      {
        description: 'Planning inbound vẫn cần con người scoping trước khi chào giá và vận hành.',
        label: 'Không nên hiểu là',
        value: 'Checkout cố định',
      },
      {
        description: 'Gửi thời gian, quy mô nhóm, style và những nơi bạn muốn thấy nhất.',
        label: 'Bước tiếp theo',
        value: 'Lên kế hoạch',
      },
    ],
    tags: {
      central: 'Miền Trung',
      multiRegion: 'Đa vùng',
      northern: 'Miền Bắc',
    },
  },
}

const packageHubCards: Record<
  SupportedBackfillLocale,
  Array<{
    description: string
    tag: keyof (typeof packageHubChromeCopy)[SupportedBackfillLocale]['tags']
    titleRouteKey: 'centralHeritage' | 'northernVietnam' | 'vietnamHighlights'
    url: string
  }>
> = {
  en: [
    {
      description: 'A balanced multi-region base for a first Vietnam visit.',
      tag: 'multiRegion',
      titleRouteKey: 'vietnamHighlights',
      url: '/packages/vietnam-highlights',
    },
    {
      description: 'Hanoi, Ha Long, and nearby combinations of culture and nature.',
      tag: 'northern',
      titleRouteKey: 'northernVietnam',
      url: '/packages/northern-vietnam',
    },
    {
      description: 'Hue, Hoi An, heritage, and a softer rhythm.',
      tag: 'central',
      titleRouteKey: 'centralHeritage',
      url: '/packages/central-heritage',
    },
  ],
  es: [
    {
      description: 'Una base multi-región equilibrada para una primera visita.',
      tag: 'multiRegion',
      titleRouteKey: 'vietnamHighlights',
      url: '/packages/vietnam-highlights',
    },
    {
      description: 'Hanói, Ha Long y combinaciones cercanas de cultura y naturaleza.',
      tag: 'northern',
      titleRouteKey: 'northernVietnam',
      url: '/packages/northern-vietnam',
    },
    {
      description: 'Hue, Hoi An, patrimonio y un ritmo más suave.',
      tag: 'central',
      titleRouteKey: 'centralHeritage',
      url: '/packages/central-heritage',
    },
  ],
  it: [
    {
      description: 'Una base multi-regione bilanciata per una prima visita.',
      tag: 'multiRegion',
      titleRouteKey: 'vietnamHighlights',
      url: '/packages/vietnam-highlights',
    },
    {
      description: 'Hanoi, Ha Long e combinazioni vicine di cultura e natura.',
      tag: 'northern',
      titleRouteKey: 'northernVietnam',
      url: '/packages/northern-vietnam',
    },
    {
      description: 'Hue, Hoi An, patrimonio e ritmo più morbido.',
      tag: 'central',
      titleRouteKey: 'centralHeritage',
      url: '/packages/central-heritage',
    },
  ],
  pt: [
    {
      description: 'Uma base multi-região equilibrada para uma primeira visita.',
      tag: 'multiRegion',
      titleRouteKey: 'vietnamHighlights',
      url: '/packages/vietnam-highlights',
    },
    {
      description: 'Hanói, Ha Long e combinações próximas de cultura e natureza.',
      tag: 'northern',
      titleRouteKey: 'northernVietnam',
      url: '/packages/northern-vietnam',
    },
    {
      description: 'Hue, Hoi An, património e um ritmo mais suave.',
      tag: 'central',
      titleRouteKey: 'centralHeritage',
      url: '/packages/central-heritage',
    },
  ],
  vi: [
    {
      description: 'Khung đầu tiên đa vùng cân bằng qua Bắc, Trung và Nam.',
      tag: 'multiRegion',
      titleRouteKey: 'vietnamHighlights',
      url: '/packages/vietnam-highlights',
    },
    {
      description: 'Hà Nội, Hạ Long và các kết hợp văn hóa - thiên nhiên gần đó.',
      tag: 'northern',
      titleRouteKey: 'northernVietnam',
      url: '/packages/northern-vietnam',
    },
    {
      description: 'Huế, Hội An, các lớp di sản và nhịp đi mềm hơn.',
      tag: 'central',
      titleRouteKey: 'centralHeritage',
      url: '/packages/central-heritage',
    },
  ],
}

const plannerChromeCopy: Record<
  SupportedBackfillLocale,
  {
    faqEyebrow: string
    faqItems: Array<{ answer: string; question: string }>
    primaryLink: string
    stripEyebrow: string
    stripRows: Array<{ description: string; label: string; value: string }>
  }
> = {
  en: {
    faqEyebrow: 'Inbound FAQ',
    faqItems: [
      {
        answer:
          'No. A clear interest in destinations, an approximate travel window, and a preferred style are enough to start a useful conversation.',
        question: 'Do I need to know the full itinerary before contacting WingSide?',
      },
      {
        answer:
          'Yes. The architecture remains open so inbound itineraries can connect with WingsPass airport add-ons later.',
        question: 'Can airport fast track be added later?',
      },
    ],
    primaryLink: 'Send your brief',
    stripEyebrow: 'Planning flow',
    stripRows: [
      {
        description:
          'Start from the kind of journey the guest wants, not only from a fixed product selection.',
        label: 'Trip intent',
        value: 'Destination + style',
      },
      {
        description: 'Collect enough context to define hotels, pacing, and route depth.',
        label: 'Qualification',
        value: 'Dates + group size',
      },
      {
        description:
          'The form should feed a useful conversation, not pretend to be a booking engine.',
        label: 'Sales handoff',
        value: 'Consultative',
      },
    ],
  },
  es: {
    faqEyebrow: 'Preguntas frecuentes',
    faqItems: [
      {
        answer:
          'No. Basta con un interés claro por destinos, una ventana de viaje aproximada y un estilo preferido para iniciar una conversación útil.',
        question: '¿Necesito conocer todo el itinerario antes de contactar a WingSide?',
      },
      {
        answer:
          'Sí. En el futuro, el itinerario podrá incorporar los servicios de aeropuerto de WingsPass.',
        question: '¿El fast track de aeropuerto puede añadirse después?',
      },
    ],
    primaryLink: 'Enviar solicitud',
    stripEyebrow: 'Flujo de planificación',
    stripRows: [
      {
        description:
          'Empiece por el tipo de viaje que el huésped quiere, no solo por una selección fija.',
        label: 'Intención del viaje',
        value: 'Destino + estilo',
      },
      {
        description:
          'Recoja contexto suficiente para definir hoteles, ritmo y profundidad de ruta.',
        label: 'Cualificación',
        value: 'Fechas + tamaño de grupo',
      },
      {
        description:
          'El formulario debe alimentar una conversación útil, no fingir ser un motor de reserva.',
        label: 'Traspaso a ventas',
        value: 'Consultivo',
      },
    ],
  },
  it: {
    faqEyebrow: 'Domande frequenti',
    faqItems: [
      {
        answer:
          'No. Basta un interesse chiaro per le destinazioni, una finestra di viaggio approssimativa e uno stile preferito per iniziare una conversazione utile.',
        question: 'Devo conoscere tutto l’itinerario prima di contattare WingSide?',
      },
      {
        answer: 'Sì. In futuro l’itinerario potrà includere i servizi aeroportuali di WingsPass.',
        question: 'Il fast track aeroporto può essere aggiunto dopo?',
      },
    ],
    primaryLink: 'Invia la richiesta',
    stripEyebrow: 'Flusso di pianificazione',
    stripRows: [
      {
        description:
          "Parti dal tipo di viaggio che l'ospite desidera, non solo da una selezione fissa.",
        label: 'Intento del viaggio',
        value: 'Destinazione + stile',
      },
      {
        description:
          'Raccogli abbastanza contesto per definire hotel, ritmo e profondità della rotta.',
        label: 'Qualificazione',
        value: 'Periodo + dimensione gruppo',
      },
      {
        description:
          'Il modulo deve avviare una conversazione utile, non fingere di essere un motore di prenotazione.',
        label: 'Passaggio vendite',
        value: 'Consulenziale',
      },
    ],
  },
  pt: {
    faqEyebrow: 'Perguntas frequentes',
    faqItems: [
      {
        answer:
          'Não. Basta um interesse claro por destinos, uma janela de viagem aproximada e um estilo preferido para iniciar uma conversa útil.',
        question: 'Preciso de conhecer todo o itinerário antes de contactar a WingSide?',
      },
      {
        answer:
          'Sim. No futuro, o itinerário poderá incluir os serviços de aeroporto da WingsPass.',
        question: 'O fast track de aeroporto pode ser acrescentado depois?',
      },
    ],
    primaryLink: 'Enviar pedido',
    stripEyebrow: 'Fluxo de planeamento',
    stripRows: [
      {
        description:
          'Comece pelo tipo de viagem que o hóspede quer, não apenas por uma seleção fixa.',
        label: 'Intenção da viagem',
        value: 'Destino + estilo',
      },
      {
        description:
          'Recolha contexto suficiente para definir hotéis, ritmo e profundidade da rota.',
        label: 'Qualificação',
        value: 'Datas + tamanho do grupo',
      },
      {
        description:
          'O formulário deve alimentar uma conversa útil, não fingir ser um motor de reserva.',
        label: 'Passagem para vendas',
        value: 'Consultivo',
      },
    ],
  },
  vi: {
    faqEyebrow: 'Câu hỏi thường gặp',
    faqItems: [
      {
        answer:
          'Không. Chỉ cần có hứng thú rõ về điểm đến, khoảng thời gian dự kiến và phong cách du lịch là đủ để bắt đầu một cuộc trao đổi hữu ích.',
        question: 'Tôi có cần biết toàn bộ hành trình trước khi liên hệ WingSide không?',
      },
      {
        answer: 'Có. Sau này hành trình có thể bổ sung các dịch vụ hỗ trợ sân bay của WingsPass.',
        question: 'Dịch vụ ưu tiên tại sân bay có thể bổ sung sau không?',
      },
    ],
    primaryLink: 'Gửi yêu cầu',
    stripEyebrow: 'Quy trình tư vấn',
    stripRows: [
      {
        description: 'Bắt đầu từ kiểu hành trình khách muốn, không chỉ từ SKU cố định.',
        label: 'Ý định chuyến đi',
        value: 'Điểm đến + phong cách',
      },
      {
        description: 'Thu đủ bối cảnh để scoping khách sạn, nhịp tuyến và độ sâu route.',
        label: 'Mức độ qualify',
        value: 'Thời điểm + quy mô nhóm',
      },
      {
        description: 'Form nên nuôi một cuộc trao đổi hữu ích chứ không giả làm booking engine.',
        label: 'Bàn giao cho sales',
        value: 'Tư vấn',
      },
    ],
  },
}

const testimonialChromeCopy: Record<
  SupportedBackfillLocale,
  {
    eyebrow: string
    items: Array<{ description: string; meta: string; title: string }>
  }
> = {
  en: {
    eyebrow: 'Trust-first design',
    items: [
      {
        description:
          'Guests receive itinerary recommendations shaped around style, rhythm, and regional priorities.',
        meta: 'Planning proof',
        title: 'Tailored route planning',
      },
      {
        description:
          'The team understands hotel rhythm, transfers, and destination logic across several Vietnam regions.',
        meta: 'Operational proof',
        title: 'Local coordination',
      },
      {
        description:
          'The site supports a gentle entry into consultation instead of forcing a rigid product selection.',
        meta: 'Experience proof',
        title: 'Flexible inquiry funnel',
      },
    ],
  },
  es: {
    eyebrow: 'Diseño orientado a confianza',
    items: [
      {
        description:
          'Los huéspedes reciben recomendaciones de itinerario adaptadas a estilo, ritmo y prioridades regionales.',
        meta: 'Prueba de planificación',
        title: 'Diseño de ruta a medida',
      },
      {
        description:
          'El equipo entiende ritmo hotelero, traslados y lógica de destino en varias regiones de Vietnam.',
        meta: 'Prueba operativa',
        title: 'Coordinación local',
      },
      {
        description:
          'El sitio permite una entrada suave a la consultoría en lugar de forzar una selección rígida de producto.',
        meta: 'Prueba de experiencia',
        title: 'Embudo de consulta flexible',
      },
    ],
  },
  it: {
    eyebrow: 'Progettazione orientata alla fiducia',
    items: [
      {
        description:
          'Gli ospiti ricevono raccomandazioni di itinerario modellate su stile, ritmo e priorità regionali.',
        meta: 'Prova di pianificazione',
        title: 'Pianificazione rotta su misura',
      },
      {
        description:
          'La squadra conosce il ritmo degli hotel, i trasferimenti e la logica delle destinazioni in più regioni del Vietnam.',
        meta: 'Prova operativa',
        title: 'Coordinamento locale',
      },
      {
        description:
          'Il sito supporta un ingresso morbido nella consulenza invece di forzare una selezione prodotto rigida.',
        meta: 'Prova esperienza',
        title: 'Percorso di richiesta flessibile',
      },
    ],
  },
  pt: {
    eyebrow: 'Conceção orientada para a confiança',
    items: [
      {
        description:
          'Os hóspedes recebem recomendações de itinerário moldadas segundo estilo, ritmo e prioridades regionais.',
        meta: 'Prova de planeamento',
        title: 'Planeamento de rota à medida',
      },
      {
        description:
          'A equipa compreende o ritmo dos hotéis, os transferes e a lógica dos destinos em várias regiões do Vietname.',
        meta: 'Prova operacional',
        title: 'Coordenação local',
      },
      {
        description:
          'O site suporta uma entrada suave na consultoria em vez de forçar uma seleção rígida de produto.',
        meta: 'Prova de experiência',
        title: 'Funil de pedido flexível',
      },
    ],
  },
  vi: {
    eyebrow: 'Thiết kế ưu tiên niềm tin',
    items: [
      {
        description:
          'Khách nhận được gợi ý hành trình được điều chỉnh theo phong cách, nhịp đi và ưu tiên vùng.',
        meta: 'Bằng chứng lên kế hoạch',
        title: 'Thiết kế hành trình theo yêu cầu',
      },
      {
        description:
          'Đội ngũ hiểu nhịp lưu trú, phương án di chuyển và mối liên kết giữa các điểm đến ở nhiều vùng của Việt Nam.',
        meta: 'Bằng chứng vận hành',
        title: 'Điều phối tại chỗ',
      },
      {
        description:
          'Website cho phép bước vào tư vấn nhẹ nhàng thay vì ép chọn sản phẩm cứng ngay lập tức.',
        meta: 'Bằng chứng trải nghiệm',
        title: 'Quy trình gửi yêu cầu linh hoạt',
      },
    ],
  },
}

const aboutChromeCopy: Record<
  SupportedBackfillLocale,
  {
    contentTitleA: string
    contentTitleB: string
    stripEyebrow: string
  }
> = {
  en: {
    contentTitleA: 'Destination-led UX',
    contentTitleB: 'Consultative trip planning',
    stripEyebrow: 'Brand direction',
  },
  es: {
    contentTitleA: 'UX guiada por destinos',
    contentTitleB: 'Planificación consultiva del viaje',
    stripEyebrow: 'Dirección de marca',
  },
  it: {
    contentTitleA: 'UX guidata dalle destinazioni',
    contentTitleB: 'Pianificazione consulenziale del viaggio',
    stripEyebrow: 'Direzione del brand',
  },
  pt: {
    contentTitleA: 'UX orientada por destinos',
    contentTitleB: 'Planeamento consultivo da viagem',
    stripEyebrow: 'Direção de marca',
  },
  vi: {
    contentTitleA: 'UX dẫn bằng điểm đến',
    contentTitleB: 'Lập kế hoạch mang tính tư vấn',
    stripEyebrow: 'Định hướng thương hiệu',
  },
}

const buildHomePageData = (assets: Assets, locale: SupportedBackfillLocale) => {
  const copy = homeCopy[locale]
  const blockCopy = homeBlockCopy[locale]
  const routeCopy = localizedRouteCards[locale]

  return {
    title: 'WingSide',
    hero: {
      type: 'highImpact',
      presentationMode: 'inherit',
      variant: 'planner',
      media: assets.heroImageID,
      slides: [
        {
          eyebrow: copy.heroEyebrow,
          title: copy.heading,
          description: copy.paragraph,
          media: assets.heroImageID,
          links: [copy.links[0]],
        },
        {
          eyebrow: copy.slideDestinationEyebrow,
          title: copy.slideDestinationTitle,
          description: copy.slideDestinationDescription,
          media: assets.secondaryImageID,
          links: [copy.links[1]],
        },
        {
          eyebrow: copy.slideStyleEyebrow,
          title: copy.slideStyleTitle,
          description: copy.slideStyleDescription,
          media: assets.travelStylesImageID,
          links: [linkItem(copy.stylesTitle, '/styles', 'outline')],
        },
      ],
      links: copy.links,
      richText: richText(copy.heading, copy.paragraph, 'h1'),
    },
    layout: [
      featureGridBlock(
        copy.trustTitle,
        copy.trustDescription,
        blockCopy.trustItems.map((item, index) => ({
          description: item.description,
          title:
            index === 0
              ? copy.links[0].link.label
              : 'value' in item && item.value
                ? item.value
                : item.label,
          url: ['/plan-your-trip', '/destinations', '/about-us', '/posts'][index],
        })),
        'default',
        copy.trustEyebrow,
        'icon-grid',
        routeCopy.explore,
      ),
      featureGridBlock(
        copy.whyTitle,
        copy.whyDescription,
        blockCopy.whyItems.map((item, index) => ({
          ...item,
          imageID:
            index === 0
              ? assets.secondaryImageID
              : index === 1
                ? assets.sampleItinerariesImageID
                : assets.travelStylesImageID,
        })),
        'highlight',
        copy.whyEyebrow,
        'bento',
      ),
      statsBlock(
        copy.statsTitle,
        copy.statsDescription,
        [...blockCopy.statsItems.slice(0, 2), ...planningLibraryStats[locale]],
        'logo-proof',
        copy.statsEyebrow,
      ),
      featureGridBlock(
        copy.destinationsTitle,
        copy.destinationsDescription,
        sharedDestinationCards[locale].map((card) => ({
          ...card,
          imageID: assets.secondaryImageID,
          url: card.pathname,
        })),
        'default',
        copy.destinationsEyebrow,
        'icon-grid',
        routeCopy.explore,
      ),
      featureGridBlock(
        copy.stylesTitle,
        copy.stylesDescription,
        blockCopy.styleItems.map((item) => ({
          ...item,
          imageID: assets.travelStylesImageID,
          meta: homeMetaLabels[locale].style,
        })),
        'minimal',
        copy.stylesEyebrow,
        'icon-grid',
        routeCopy.explore,
      ),
      featureGridBlock(
        copy.packagesTitle,
        copy.packagesDescription,
        blockCopy.packageItems.map((item) => ({
          ...item,
          imageID: assets.sampleItinerariesImageID,
          meta: homeMetaLabels[locale].package,
        })),
        'default',
        copy.packagesEyebrow,
        'alternating',
        routeCopy.explore,
      ),
      testimonialBlock(
        copy.planningNotesTitle,
        copy.planningNotesDescription,
        [
          ...blockCopy.planningNotes.map((note, index) => ({
            ...note,
            country: planningNoteMetadata[locale][index],
            noteDate: planningNoteDates[index],
          })),
          ...additionalPlanningNotes[locale].map(([country, name, quote], index) => ({
            country,
            name,
            noteDate: `2026-07-${String(index + 10).padStart(2, '0')}T00:00:00.000Z`,
            quote,
            role: blockCopy.planningNotes[0].role,
          })),
        ],
        'carousel',
        copy.planningNotesEyebrow,
      ),
      ctaBlock(copy.ctaTitle, copy.ctaDescription, [copy.links[0]]),
    ],
    relatedPages: relatedPageIDs(assets, [
      '/destinations',
      '/styles',
      '/packages',
      '/plan-your-trip',
      '/about-us',
      '/travel-guide',
      '/testimonials',
      '/contact-us',
    ]),
    meta: {
      title: copy.meta,
      description: copy.paragraph,
      image: assets.heroImageID,
    },
  }
}

const buildAboutPageData = (assets: Assets, locale: SupportedBackfillLocale) => {
  const chrome = aboutChromeCopy[locale]
  const localized = {
    en: {
      title: 'About',
      heading: 'Inbound Vietnam needs trust, not retail noise',
      paragraph:
        'WingSide follows a destination-led, style-led, inquiry-first structure because the inbound customer journey is different from outbound retail.',
      stripTitle: 'Why WingSide feels different from WingsGo',
      stripDescription:
        'The site is organized around destination discovery, travel styles, planning, and operator trust instead of early price comparison.',
      items: [
        {
          label: 'Primary CTA',
          value: 'Plan your trip',
          description:
            'The key action is to send a planning brief, not compare prices immediately.',
        },
        {
          label: 'Content pillars',
          value: 'Destinations + styles',
          description: 'Destination hub and style pages create the core discovery model.',
        },
        {
          label: 'Market fit',
          value: 'Inbound guests',
          description: 'International guests need guidance, proof, and signals of local expertise.',
        },
        {
          label: 'Editorial tone',
          value: 'Trust-first',
          description:
            'Imagery, spacing, and storytelling should feel curated rather than sales-heavy.',
        },
      ],
      col1: 'Guests should be able to move from Vietnam-level exploration into destination pages such as Hanoi, Ha Long, Hoi An, Hue, and the Mekong.',
      col2: 'Instead of a wall of prices, the site explains travel styles, sample itineraries, and the planning process.',
      meta: 'About WingSide',
      metaDesc: 'About page for the WingSide inbound positioning and travel planning model.',
    },
    vi: {
      title: 'Giới thiệu',
      heading: 'Khách quốc tế cần niềm tin, không cần những lời chào bán ồn ào',
      paragraph:
        'WingSide tổ chức nội dung theo điểm đến, phong cách du lịch và nhu cầu tư vấn, vì khách quốc tế tìm kiếm hành trình khác với việc chọn sản phẩm đại trà.',
      stripTitle: 'Vì sao WingSide khác WingsGo',
      stripDescription:
        'Trang web ưu tiên khám phá điểm đến, phong cách du lịch, tư vấn hành trình và uy tín của đơn vị tổ chức thay vì đưa khách vào so giá quá sớm.',
      items: [
        {
          label: 'CTA chính',
          value: 'Lên kế hoạch',
          description: 'Hành động chính là gửi yêu cầu chuyến đi, không phải vào so giá ngay.',
        },
        {
          label: 'Trụ nội dung',
          value: 'Điểm đến + phong cách',
          description:
            'Các trang điểm đến và phong cách du lịch tạo nên hành trình khám phá cốt lõi.',
        },
        {
          label: 'Phù hợp thị trường',
          value: 'Khách quốc tế',
          description:
            'Khách quốc tế cần hướng dẫn rõ ràng, thông tin đáng tin cậy và hiểu biết địa phương.',
        },
        {
          label: 'Tông biên tập',
          value: 'Ưu tiên niềm tin',
          description:
            'Hình ảnh, khoảng cách và cách kể chuyện cần được chọn lọc, không tạo cảm giác chào bán dồn dập.',
        },
      ],
      col1: 'Khách có thể bắt đầu từ bức tranh toàn cảnh Việt Nam rồi khám phá Hà Nội, Hạ Long, Hội An, Huế và Mekong.',
      col2: 'Thay vì dồn khách vào một bảng giá, trang web giải thích phong cách du lịch, hành trình mẫu và quy trình tư vấn.',
      meta: 'Giới thiệu WingSide',
      metaDesc: 'Tìm hiểu cách WingSide tư vấn và thiết kế hành trình Việt Nam cho khách quốc tế.',
    },
    it: {
      title: 'Chi siamo',
      heading: 'I viaggiatori internazionali cercano fiducia, non promesse commerciali rumorose',
      paragraph:
        'WingSide organizza i contenuti per destinazioni, stili di viaggio e richieste di consulenza, perché chi arriva dall’estero segue un percorso diverso dalla scelta di prodotti standardizzati.',
      stripTitle: 'Perché WingSide si sente diversa da WingsGo',
      stripDescription:
        'Il sito privilegia la scoperta delle destinazioni, gli stili di viaggio, la consulenza e l’affidabilità dell’operatore, senza spingere subito al confronto dei prezzi.',
      items: [
        {
          label: 'CTA principale',
          value: 'Pianifica il viaggio',
          description:
            'L’azione principale è inviare una richiesta di viaggio, non confrontare subito i prezzi.',
        },
        {
          label: 'Pilastri contenuto',
          value: 'Destinazioni + stili',
          description:
            'Le pagine dedicate a destinazioni e stili di viaggio guidano l’esplorazione.',
        },
        {
          label: 'Pubblico',
          value: 'Viaggiatori internazionali',
          description:
            'Gli ospiti internazionali hanno bisogno di indicazioni chiare, informazioni affidabili e competenza locale.',
        },
        {
          label: 'Tono editoriale',
          value: 'Fiducia prima di tutto',
          description:
            'Immagini, spazi e narrazione devono essere curati senza risultare commerciali o insistenti.',
        },
      ],
      col1: 'Gli utenti dovrebbero potersi muovere dall’esplorazione a livello Vietnam verso Hanoi, Ha Long, Hoi An, Hue e Mekong.',
      col2: 'Invece di una parete di prezzi, il sito presenta stili di viaggio, itinerari di esempio e il percorso di consulenza.',
      meta: 'Chi siamo | WingSide',
      metaDesc:
        'Scopri come WingSide consiglia e progetta viaggi su misura in Vietnam per ospiti internazionali.',
    },
    es: {
      title: 'Nosotros',
      heading: 'Los viajeros internacionales buscan confianza, no mensajes comerciales ruidosos',
      paragraph:
        'WingSide organiza el contenido por destinos, estilos de viaje y solicitudes de asesoría, porque quienes llegan del extranjero siguen un proceso distinto de la elección de productos estandarizados.',
      stripTitle: 'Por qué WingSide se siente diferente de WingsGo',
      stripDescription:
        'El sitio prioriza el descubrimiento de destinos, los estilos de viaje, la asesoría y la fiabilidad del operador, sin empujar demasiado pronto a comparar precios.',
      items: [
        {
          label: 'CTA principal',
          value: 'Planifica tu viaje',
          description:
            'La acción principal es enviar una solicitud de viaje, no comparar precios de inmediato.',
        },
        {
          label: 'Pilares de contenido',
          value: 'Destinos + estilos',
          description: 'Las páginas de destinos y estilos de viaje guían la exploración principal.',
        },
        {
          label: 'Ajuste de mercado',
          value: 'Viajeros internacionales',
          description:
            'Los huéspedes internacionales necesitan orientación clara, información fiable y conocimiento local.',
        },
        {
          label: 'Tono editorial',
          value: 'La confianza primero',
          description:
            'Las imágenes, los espacios y la narrativa deben estar cuidados sin resultar comerciales ni insistentes.',
        },
      ],
      col1: 'Los usuarios deberían poder pasar de una exploración a nivel Vietnam hacia Hanói, Ha Long, Hoi An, Hue y Mekong.',
      col2: 'En lugar de un muro de precios, el sitio presenta estilos de viaje, itinerarios de ejemplo y el proceso de asesoría.',
      meta: 'Sobre WingSide',
      metaDesc:
        'Descubre cómo WingSide asesora y diseña viajes a medida por Vietnam para huéspedes internacionales.',
    },
    pt: {
      title: 'Sobre',
      heading: 'Os viajantes internacionais procuram confiança, não mensagens comerciais ruidosas',
      paragraph:
        'A WingSide organiza os conteúdos por destinos, estilos de viagem e pedidos de aconselhamento, porque quem chega do estrangeiro segue um processo diferente da escolha de produtos padronizados.',
      stripTitle: 'Porque a WingSide se sente diferente da WingsGo',
      stripDescription:
        'O site privilegia a descoberta de destinos, os estilos de viagem, o aconselhamento e a fiabilidade do operador, sem empurrar demasiado cedo para a comparação de preços.',
      items: [
        {
          label: 'CTA principal',
          value: 'Planear a viagem',
          description:
            'A ação principal é enviar um pedido de viagem, não comparar preços logo à partida.',
        },
        {
          label: 'Pilares de conteúdo',
          value: 'Destinos + estilos',
          description:
            'As páginas de destinos e estilos de viagem orientam a exploração principal.',
        },
        {
          label: 'Público',
          value: 'Viajantes internacionais',
          description:
            'Os hóspedes internacionais precisam de orientação clara, informação fiável e conhecimento local.',
        },
        {
          label: 'Tom editorial',
          value: 'A confiança primeiro',
          description:
            'As imagens, os espaços e a narrativa devem ser cuidados sem parecerem comerciais ou insistentes.',
        },
      ],
      col1: 'Os utilizadores devem poder passar da exploração ao nível Vietname para Hanói, Ha Long, Hoi An, Hue e Mekong.',
      col2: 'Em vez de uma parede de preços, o site apresenta estilos de viagem, itinerários de exemplo e o processo de aconselhamento.',
      meta: 'Sobre a WingSide',
      metaDesc:
        'Descubra como a WingSide aconselha e desenha viagens à medida pelo Vietname para hóspedes internacionais.',
    },
  }[locale]

  return {
    title: localized.title,
    hero: {
      type: 'lowImpact',
      richText: richText(localized.heading, localized.paragraph, 'h1'),
    },
    layout: [
      infoStripBlock(
        localized.stripTitle,
        localized.stripDescription,
        localized.items,
        chrome.stripEyebrow,
      ),
      contentBlock([
        {
          size: 'half',
          title: chrome.contentTitleA,
          paragraph: localized.col1,
        },
        {
          size: 'half',
          title: chrome.contentTitleB,
          paragraph: localized.col2,
        },
      ]),
    ],
    meta: {
      title: localized.meta,
      description: localized.metaDesc,
      image: assets.heroImageID,
    },
  }
}

const buildContactPageData = (assets: Assets, locale: SupportedBackfillLocale) => {
  const localized = {
    en: {
      title: 'Contact',
      heading: 'Tell us what kind of Vietnam journey you want to build',
      paragraph:
        'Contact is the start of planning: destinations, style, timing, and group needs shape the response.',
      section: 'After you send the request',
      sideTitle: 'From brief to proposal',
      sideBody:
        'The response starts from destinations, style, timing, and group needs, not from a fixed catalog.',
      body: 'The team reads the brief, evaluates route and rhythm, then replies with a useful direction instead of pushing a standard checkout.',
      meta: 'Contact WingSide',
    },
    vi: {
      title: 'Liên hệ',
      heading: 'Hãy cho chúng tôi biết bạn muốn xây dựng hành trình Việt Nam như thế nào',
      paragraph:
        'Liên hệ là bước bắt đầu lên kế hoạch: điểm đến, phong cách, thời gian và nhu cầu của nhóm sẽ định hướng phản hồi.',
      section: 'Sau khi gửi yêu cầu',
      sideTitle: 'Từ yêu cầu đến đề xuất',
      sideBody:
        'Phản hồi bắt đầu từ điểm đến, phong cách, thời gian và nhu cầu của nhóm, không từ một danh mục cố định.',
      body: 'Đội ngũ đọc yêu cầu, đánh giá hành trình và nhịp đi, rồi phản hồi bằng một hướng phù hợp thay vì đẩy khách vào quy trình mua tiêu chuẩn.',
      meta: 'Liên hệ WingSide',
    },
    it: {
      title: 'Contatti',
      heading: 'Raccontaci che viaggio in Vietnam vuoi costruire',
      paragraph:
        'Il contatto è l’inizio della pianificazione: destinazioni, stile, periodo e gruppo guidano la risposta.',
      section: 'Dopo la richiesta',
      sideTitle: 'Dalla richiesta alla proposta',
      sideBody:
        'La risposta parte da destinazioni, stile, periodo e gruppo, non da un catalogo fisso.',
      body: 'La squadra legge la richiesta, valuta itinerario e ritmo, poi propone una direzione utile invece di spingere verso un acquisto standard.',
      meta: 'Contatti WingSide',
    },
    es: {
      title: 'Contacto',
      heading: 'Cuéntanos qué viaje a Vietnam quieres construir',
      paragraph:
        'El contacto es el inicio de la planificación: destinos, estilo, fechas y grupo orientan la respuesta.',
      section: 'Después de la solicitud',
      sideTitle: 'De la solicitud a la propuesta',
      sideBody: 'La respuesta parte de destinos, estilo, fechas y grupo, no de un catálogo fijo.',
      body: 'El equipo lee la solicitud, evalúa el itinerario y el ritmo, y propone una dirección útil en lugar de empujar hacia una compra estándar.',
      meta: 'Contacto WingSide',
    },
    pt: {
      title: 'Contacto',
      heading: 'Conte-nos que viagem ao Vietname quer construir',
      paragraph:
        'O contacto é o início do planeamento: destinos, estilo, datas e grupo orientam a resposta.',
      section: 'Depois do pedido',
      sideTitle: 'Do pedido à proposta',
      sideBody: 'A resposta parte de destinos, estilo, datas e grupo, não de um catálogo fixo.',
      body: 'A equipa lê o pedido, avalia o itinerário e o ritmo, e propõe uma direção útil em vez de forçar uma compra padronizada.',
      meta: 'Contacto WingSide',
    },
  }[locale]

  return {
    title: localized.title,
    hero: {
      type: 'mediumImpact',
      media: assets.heroImageID,
      links: [
        linkItem(localizedRouteCards[locale].plan, '/plan-your-trip'),
        linkItem(localizedRouteCards[locale].destinations, '/destinations', 'outline'),
      ],
      richText: richText(localized.heading, localized.paragraph, 'h1'),
    },
    layout: [
      mediaBlock(assets.heroImageID),
      contentBlock([
        {
          size: 'twoThirds',
          title: localized.section,
          paragraph: localized.body,
        },
        {
          size: 'oneThird',
          title: localized.sideTitle,
          paragraph: localized.sideBody,
        },
      ]),
      ctaBlock(localized.heading, localized.paragraph, [
        linkItem(localizedRouteCards[locale].plan, '/plan-your-trip'),
      ]),
    ],
    relatedPages: relatedPageIDs(assets, [
      '/plan-your-trip',
      '/destinations',
      '/packages',
      '/travel-guide',
    ]),
    meta: {
      title: localized.meta,
      description: localized.paragraph,
      image: assets.heroImageID,
    },
  }
}

const buildDestinationHubData = (assets: Assets, locale: SupportedBackfillLocale) => {
  const routeCopy = localizedRouteCards[locale]
  const localized = {
    en: {
      title: 'Destinations',
      heading: 'Explore Vietnam by destination',
      paragraph:
        'The destination hub creates the core discovery layer for inbound guests before they move into sample itineraries or inquiry.',
      contentTitle: 'How to use this destination hub',
      contentBody:
        'Start from the role each place plays in a Vietnam route: Hanoi for the north, Ha Long for seascape contrast, Hue and Hoi An for heritage, and the Mekong for a softer southern extension.',
      sideTitle: 'Start with a shortlist',
      sideBody:
        'Use the hub to shortlist regions before sending a brief. WingSide can then shape pacing, hotels, transfers, and local experiences around your group.',
      gridTitle: 'Key Vietnam destinations',
      gridDescription:
        'These entry points help guests understand how each region can shape a private Vietnam journey.',
      meta: 'Vietnam destinations',
    },
    vi: {
      title: 'Điểm đến',
      heading: 'Khám phá Việt Nam theo điểm đến',
      paragraph:
        'Các trang điểm đến giúp khách quốc tế khám phá Việt Nam trước khi xem hành trình mẫu hoặc gửi yêu cầu tư vấn.',
      contentTitle: 'Cách chọn điểm đến',
      contentBody:
        'Hãy bắt đầu từ vai trò của từng nơi trong hành trình: Hà Nội mở ra miền Bắc, Hạ Long mang đến cảnh quan vịnh biển, Huế và Hội An giàu di sản, còn Mekong tạo một phần kết nhẹ nhàng ở miền Nam.',
      sideTitle: 'Chọn vùng ưu tiên',
      sideBody:
        'Chọn những vùng bạn quan tâm trước khi gửi yêu cầu. Sau đó WingSide sẽ gợi ý nhịp đi, khách sạn, phương án di chuyển và trải nghiệm địa phương phù hợp.',
      gridTitle: 'Các điểm đến then chốt ở Việt Nam',
      gridDescription:
        'Những điểm vào này giúp khách hiểu mỗi vùng sẽ định hình hành trình riêng như thế nào.',
      meta: 'Điểm đến Việt Nam',
    },
    it: {
      title: 'Destinazioni',
      heading: 'Scopri il Vietnam per destinazione',
      paragraph:
        'Le pagine delle destinazioni aiutano i viaggiatori internazionali a esplorare il Vietnam prima di vedere itinerari di esempio o chiedere una consulenza.',
      contentTitle: 'Come scegliere le destinazioni',
      contentBody:
        'Inizia dal ruolo di ogni luogo nel viaggio: Hanoi apre il Nord, Ha Long offre paesaggi marini, Hue e Hoi An raccontano il patrimonio, mentre il Mekong crea una conclusione più lenta nel Sud.',
      sideTitle: 'Scegli le regioni prioritarie',
      sideBody:
        'Scegli le regioni che ti interessano prima di inviare la richiesta. WingSide potrà poi definire ritmo, hotel, trasferimenti ed esperienze locali.',
      gridTitle: 'Destinazioni principali del Vietnam',
      gridDescription:
        'Questi ingressi aiutano a capire come ogni regione possa modellare un viaggio privato in Vietnam.',
      meta: 'Destinazioni Vietnam',
    },
    es: {
      title: 'Destinos',
      heading: 'Explora Vietnam por destino',
      paragraph:
        'Las páginas de destinos ayudan a los viajeros internacionales a explorar Vietnam antes de consultar itinerarios de ejemplo o solicitar asesoría.',
      contentTitle: 'Cómo elegir los destinos',
      contentBody:
        'Empieza por el papel de cada lugar en el viaje: Hanói abre el norte, Ha Long aporta paisajes marinos, Hue y Hoi An cuentan el patrimonio, y el Mekong ofrece un final más pausado en el sur.',
      sideTitle: 'Elige las regiones prioritarias',
      sideBody:
        'Elige las regiones que te interesan antes de enviar la solicitud. WingSide podrá después definir el ritmo, los hoteles, los traslados y las experiencias locales.',
      gridTitle: 'Principales destinos de Vietnam',
      gridDescription:
        'Estos puntos de entrada ayudan a entender cómo cada región puede dar forma a un viaje privado por Vietnam.',
      meta: 'Destinos de Vietnam',
    },
    pt: {
      title: 'Destinos',
      heading: 'Explore o Vietname por destino',
      paragraph:
        'As páginas de destinos ajudam os viajantes internacionais a explorar o Vietname antes de consultarem itinerários de exemplo ou pedirem aconselhamento.',
      contentTitle: 'Como escolher os destinos',
      contentBody:
        'Comece pelo papel de cada lugar na viagem: Hanói abre o norte, Ha Long oferece paisagens marítimas, Hue e Hoi An contam o património, e o Mekong cria um final mais pausado no sul.',
      sideTitle: 'Escolha as regiões prioritárias',
      sideBody:
        'Escolha as regiões que lhe interessam antes de enviar o pedido. A WingSide poderá depois definir o ritmo, os hotéis, os transferes e as experiências locais.',
      gridTitle: 'Principais destinos do Vietname',
      gridDescription:
        'Estas entradas ajudam a perceber como cada região pode moldar uma viagem privada ao Vietname.',
      meta: 'Destinos do Vietname',
    },
  }[locale]

  return {
    title: localized.title,
    hero: {
      type: 'lowImpact',
      richText: richText(localized.heading, localized.paragraph, 'h1'),
    },
    layout: [
      mediaBlock(assets.secondaryImageID),
      contentBlock([
        { size: 'twoThirds', title: localized.contentTitle, paragraph: localized.contentBody },
        { size: 'oneThird', title: localized.sideTitle, paragraph: localized.sideBody },
      ]),
      featureGridBlock(
        localized.gridTitle,
        localized.gridDescription,
        sharedDestinationCards[locale].map((card) => ({
          ...card,
          url: card.pathname,
        })),
        'highlight',
        localized.title,
        'icon-grid',
        routeCopy.explore,
      ),
    ],
    meta: {
      title: localized.meta,
      description: localized.paragraph,
      image: assets.heroImageID,
      breadcrumbLabel: localized.title,
    },
  }
}

const buildStyleHubData = (assets: Assets, locale: SupportedBackfillLocale) => {
  const routeCopy = localizedRouteCards[locale]
  const chrome = styleHubChromeCopy[locale]
  const localized = {
    en: {
      title: 'Travel styles',
      heading: 'Travel styles help guests self-qualify the right route',
      paragraph:
        'Inbound guests often know how they want to travel before they know the exact itinerary, so style pages are a key navigation layer.',
      body1:
        'Travel styles turn a broad Vietnam idea into a useful planning direction. They help the team understand pacing, hotel expectations, activity level, and contextual depth for each day.',
      body2:
        'This page is intentionally not a fixed price grid. It gives international guests a clearer way to brief WingSide before a tailored itinerary is prepared.',
      meta: 'Travel styles',
    },
    vi: {
      title: 'Phong cách du lịch',
      heading: 'Phong cách du lịch giúp khách xác định hành trình phù hợp',
      paragraph:
        'Khách quốc tế thường biết mình muốn trải nghiệm chuyến đi theo cách nào trước khi chốt hành trình, vì vậy phong cách du lịch là điểm bắt đầu hữu ích.',
      body1:
        'Phong cách du lịch biến một ý tưởng rộng về Việt Nam thành định hướng rõ ràng. Thông tin này giúp đội ngũ hiểu nhịp đi, kỳ vọng về khách sạn, mức vận động và chiều sâu trải nghiệm.',
      body2:
        'Trang này không phải bảng giá cố định. Nó giúp khách quốc tế mô tả nhu cầu rõ ràng trước khi WingSide thiết kế hành trình riêng.',
      meta: 'Phong cách du lịch',
    },
    it: {
      title: 'Stili di viaggio',
      heading: 'Gli stili di viaggio aiutano a trovare l’itinerario più adatto',
      paragraph:
        'I viaggiatori internazionali spesso sanno come desiderano viaggiare prima di conoscere l’itinerario esatto, quindi lo stile è un ottimo punto di partenza.',
      body1:
        'Gli stili trasformano un’idea generale del Vietnam in una direzione concreta. Aiutano la squadra a capire ritmo, aspettative sugli hotel, livello di attività e profondità delle esperienze.',
      body2:
        'La pagina non è una griglia di prezzi fissi. Aiuta gli ospiti europei a descrivere le proprie esigenze prima che WingSide prepari un itinerario su misura.',
      meta: 'Stili di viaggio',
    },
    es: {
      title: 'Estilos de viaje',
      heading: 'Los estilos de viaje ayudan a encontrar el itinerario adecuado',
      paragraph:
        'Los viajeros internacionales suelen saber cómo quieren viajar antes de conocer el itinerario exacto, por eso el estilo es un buen punto de partida.',
      body1:
        'Los estilos convierten una idea general de Vietnam en una dirección concreta. Ayudan al equipo a comprender el ritmo, las expectativas de hotel, el nivel de actividad y la profundidad de las experiencias.',
      body2:
        'La página no es una parrilla de precios fijos. Ayuda a los huéspedes europeos a describir sus necesidades antes de que WingSide prepare un itinerario a medida.',
      meta: 'Estilos de viaje',
    },
    pt: {
      title: 'Estilos de viagem',
      heading: 'Os estilos de viagem ajudam a encontrar o itinerário adequado',
      paragraph:
        'Os viajantes internacionais costumam saber como querem viajar antes de conhecer o itinerário exato, por isso o estilo é um bom ponto de partida.',
      body1:
        'Os estilos transformam uma ideia geral do Vietname numa direção concreta. Ajudam a equipa a compreender o ritmo, as expectativas de hotel, o nível de atividade e a profundidade das experiências.',
      body2:
        'A página não é uma grelha de preços fixos. Ajuda os hóspedes europeus a descrever as suas necessidades antes de a WingSide preparar um itinerário à medida.',
      meta: 'Estilos de viagem',
    },
  }[locale]

  return {
    title: localized.title,
    hero: {
      type: 'lowImpact',
      richText: richText(localized.heading, localized.paragraph, 'h1'),
    },
    layout: [
      mediaBlock(assets.travelStylesImageID),
      contentBlock([
        { size: 'half', title: chrome.contentTitleA, paragraph: localized.body1 },
        { size: 'half', title: chrome.contentTitleB, paragraph: localized.body2 },
      ]),
      featureGridBlock(
        chrome.gridTitle,
        chrome.gridDescription,
        styleHubCards[locale].map((card) => ({
          description: card.description,
          meta: chrome[card.metaKey],
          title: card.titleRouteKey
            ? localizedRouteCards[locale][card.titleRouteKey]
            : chrome[card.titleKey || 'cultureTitle'],
          url: card.url,
        })),
        'default',
        chrome.gridEyebrow,
        'icon-grid',
        routeCopy.explore,
      ),
    ],
    meta: {
      title: localized.meta,
      description: localized.paragraph,
      image: assets.heroImageID,
      breadcrumbLabel: localized.title,
    },
  }
}

const buildPackagesHubData = (assets: Assets, locale: SupportedBackfillLocale) => {
  const routeCopy = localizedRouteCards[locale]
  const chrome = packageHubChromeCopy[locale]
  const localized = {
    en: {
      title: 'Vietnam packages',
      heading: 'Sample itineraries show possibility, not rigid product grids',
      paragraph:
        'Inbound itinerary pages should help guests imagine what can be built, then move them toward consultation and customization.',
      stripTitle: 'How to read these sample itineraries',
      stripDescription:
        'Each itinerary is a starting structure. The real proposal can adapt season, hotel level, destination order, and add-ons such as airport support.',
      meta: 'Sample Vietnam itineraries',
    },
    vi: {
      title: 'Gói Việt Nam',
      heading: 'Hành trình mẫu để gợi mở khả năng, không phải bảng sản phẩm bán cứng',
      paragraph:
        'Các trang hành trình mẫu nên giúp khách hình dung điều có thể xây dựng, sau đó dẫn sang tư vấn và tùy biến.',
      stripTitle: 'Cách đọc các hành trình mẫu này',
      stripDescription:
        'Mỗi hành trình là một cấu trúc khởi điểm. Đề xuất thực tế có thể điều chỉnh mùa đi, hạng khách sạn, thứ tự điểm đến và dịch vụ hỗ trợ tại sân bay.',
      meta: 'Hành trình Việt Nam mẫu',
    },
    it: {
      title: 'Pacchetti Vietnam',
      heading: 'Gli itinerari esempio mostrano possibilità, non cataloghi rigidi',
      paragraph:
        'Le pagine degli itinerari esempio dovrebbero mostrare cosa si può costruire e poi accompagnare l’utente verso consulenza e personalizzazione.',
      stripTitle: 'Come leggere questi itinerari di esempio',
      stripDescription:
        'Ogni itinerario è una struttura iniziale. La proposta reale può adattare stagione, categoria degli hotel, ordine delle destinazioni e assistenza in aeroporto.',
      meta: 'Itinerari Vietnam di esempio',
    },
    es: {
      title: 'Paquetes Vietnam',
      heading: 'Los itinerarios de ejemplo muestran posibilidad, no catálogos rígidos',
      paragraph:
        'Las páginas de itinerario de ejemplo deberían mostrar qué puede construirse y después guiar al usuario hacia la asesoría y la personalización.',
      stripTitle: 'Cómo leer estos itinerarios de ejemplo',
      stripDescription:
        'Cada itinerario es una estructura inicial. La propuesta real puede adaptar temporada, categoría de los hoteles, orden de los destinos y asistencia en el aeropuerto.',
      meta: 'Itinerarios de Vietnam de ejemplo',
    },
    pt: {
      title: 'Pacotes Vietname',
      heading: 'Os itinerários de exemplo mostram possibilidade, não catálogos rígidos',
      paragraph:
        'As páginas de itinerário de exemplo devem mostrar o que se pode construir e depois orientar o utilizador para aconselhamento e personalização.',
      stripTitle: 'Como ler estes itinerários de exemplo',
      stripDescription:
        'Cada itinerário é uma estrutura inicial. A proposta real pode adaptar a época, a categoria dos hotéis, a ordem dos destinos e a assistência no aeroporto.',
      meta: 'Itinerários de exemplo no Vietname',
    },
  }[locale]

  return {
    title: localized.title,
    hero: {
      type: 'lowImpact',
      richText: richText(localized.heading, localized.paragraph, 'h1'),
    },
    layout: [
      mediaBlock(assets.sampleItinerariesImageID),
      infoStripBlock(
        localized.stripTitle,
        localized.stripDescription,
        chrome.rows.map((row, index) => ({
          ...row,
          value: index === 2 ? localizedRouteCards[locale].plan : row.value,
        })),
        chrome.infoEyebrow,
      ),
      featureGridBlock(
        chrome.gridTitle,
        chrome.gridDescription,
        packageHubCards[locale].map((card) => ({
          description: card.description,
          meta: chrome.tags[card.tag],
          title: routeCopy[card.titleRouteKey],
          url: card.url,
        })),
        'default',
        chrome.gridEyebrow,
        'icon-grid',
        routeCopy.explore,
      ),
    ],
    meta: {
      title: localized.meta,
      description: localized.paragraph,
      image: assets.secondaryImageID,
      breadcrumbLabel: localized.title,
    },
  }
}

const buildPlanTripPageData = (assets: Assets, locale: SupportedBackfillLocale) => {
  const chrome = plannerChromeCopy[locale]
  const localized = {
    en: {
      title: 'Plan your trip',
      heading: 'Plan your Vietnam journey with a local team',
      paragraph:
        'Send your month, group size, destinations, and preferred style to receive a tailored itinerary direction.',
      stripTitle: 'What the planner should collect',
      stripDescription:
        'The inquiry form is part of the product. It should help the team understand market, style, timing, and the level of customization required.',
      formTitle: 'Share your travel brief',
      formBody:
        'Tell us when you want to travel, how many people are in the group, and which experiences matter most.',
      faqTitle: 'Planning questions',
      faqDescription:
        'These FAQs address common inbound uncertainties before guests submit a brief.',
      meta: 'Plan a Vietnam trip',
    },
    vi: {
      title: 'Lên kế hoạch',
      heading: 'Lên kế hoạch hành trình Việt Nam cùng một đội ngũ tại chỗ',
      paragraph:
        'Hãy gửi tháng đi, quy mô nhóm, điểm đến và phong cách yêu thích để nhận gợi ý hành trình phù hợp.',
      stripTitle: 'Thông tin cần có để bắt đầu',
      stripDescription:
        'Biểu mẫu giúp đội ngũ hiểu nhu cầu, phong cách, thời điểm và mức độ tùy chỉnh của chuyến đi.',
      formTitle: 'Chia sẻ yêu cầu chuyến đi',
      formBody:
        'Hãy cho chúng tôi biết khi nào bạn đi, nhóm có bao nhiêu người và kiểu trải nghiệm nào bạn quan tâm nhất.',
      faqTitle: 'Câu hỏi thường gặp khi lên kế hoạch',
      faqDescription:
        'Những câu trả lời này làm rõ các băn khoăn thường gặp trước khi khách quốc tế gửi yêu cầu.',
      meta: 'Lập kế hoạch hành trình Việt Nam',
    },
    it: {
      title: 'Pianifica il viaggio',
      heading: 'Pianifica il tuo viaggio in Vietnam con una squadra locale',
      paragraph:
        'Invia mese, gruppo, destinazioni e stile preferito per ricevere una direzione di itinerario su misura.',
      stripTitle: 'Le informazioni utili per iniziare',
      stripDescription:
        'Il modulo aiuta la squadra a capire esigenze, stile, periodo e livello di personalizzazione del viaggio.',
      formTitle: 'Condividi la tua richiesta di viaggio',
      formBody:
        'Dicci quando vuoi viaggiare, quante persone ci sono nel gruppo e che tipo di esperienze contano di più.',
      faqTitle: 'Domande sulla pianificazione',
      faqDescription:
        'Queste risposte chiariscono i dubbi più comuni prima che un viaggiatore internazionale invii la richiesta.',
      meta: 'Pianifica viaggio Vietnam',
    },
    es: {
      title: 'Planifica tu viaje',
      heading: 'Planifica tu viaje a Vietnam con un equipo local',
      paragraph:
        'Envía mes, grupo, destinos y estilo preferido para recibir una dirección de itinerario a medida.',
      stripTitle: 'La información necesaria para empezar',
      stripDescription:
        'El formulario ayuda al equipo a comprender las necesidades, el estilo, las fechas y el nivel de personalización del viaje.',
      formTitle: 'Comparte tu solicitud de viaje',
      formBody:
        'Cuéntanos cuándo quieres viajar, cuántas personas hay en el grupo y qué tipo de experiencias te importan más.',
      faqTitle: 'Preguntas sobre la planificación',
      faqDescription:
        'Estas respuestas aclaran las dudas más comunes antes de que un viajero internacional envíe su solicitud.',
      meta: 'Planificar viaje a Vietnam',
    },
    pt: {
      title: 'Planear a viagem',
      heading: 'Planeie a sua viagem ao Vietname com uma equipa local',
      paragraph:
        'Envie mês, grupo, destinos e estilo preferido para receber uma direção de itinerário à medida.',
      stripTitle: 'A informação necessária para começar',
      stripDescription:
        'O formulário ajuda a equipa a compreender as necessidades, o estilo, as datas e o nível de personalização da viagem.',
      formTitle: 'Partilhe o seu pedido de viagem',
      formBody:
        'Diga-nos quando quer viajar, quantas pessoas há no grupo e que tipo de experiências contam mais.',
      faqTitle: 'Perguntas sobre o planeamento',
      faqDescription:
        'Estas respostas esclarecem as dúvidas mais comuns antes de um viajante internacional enviar o pedido.',
      meta: 'Planear viagem ao Vietname',
    },
  }[locale]

  return {
    title: localized.title,
    hero: {
      type: 'mediumImpact',
      media: assets.heroImageID,
      links: [
        linkItem(chrome.primaryLink, '/contact-us'),
        linkItem(localizedRouteCards[locale].destinations, '/destinations', 'outline'),
      ],
      richText: richText(localized.heading, localized.paragraph, 'h1'),
    },
    layout: [
      mediaBlock(assets.heroImageID),
      infoStripBlock(
        localized.stripTitle,
        localized.stripDescription,
        chrome.stripRows,
        chrome.stripEyebrow,
      ),
      formBlock(assets.tripPlannerFormID, localized.formTitle, localized.formBody),
      {
        blockType: 'faq' as const,
        description: localized.faqDescription,
        eyebrow: chrome.faqEyebrow,
        items: chrome.faqItems,
        title: localized.faqTitle,
      },
    ],
    relatedPages: relatedPageIDs(assets, ['/contact-us', '/destinations', '/styles', '/packages']),
    meta: {
      title: localized.meta,
      description: localized.paragraph,
      image: assets.heroImageID,
    },
  }
}

const buildTravelGuidePageData = (assets: Assets, locale: SupportedBackfillLocale) => {
  const localized = {
    en: {
      title: 'Travel guide',
      heading: 'Guide content helps guests find the site and plan with more confidence',
      paragraph:
        'Guide posts help inbound guests understand seasonality, logistics, and destination context before they send an inquiry.',
      archiveTitle: 'Latest travel guide notes',
      archiveBody: 'This archive remains site-scoped and supports destination-led SEO growth.',
      meta: 'Travel guide',
    },
    vi: {
      title: 'Cẩm nang du lịch',
      heading: 'Cẩm nang giúp khách tìm thấy WingSide và tự tin hơn khi lên kế hoạch',
      paragraph:
        'Các bài cẩm nang giúp khách quốc tế hiểu mùa vụ, di chuyển và bối cảnh điểm đến trước khi gửi yêu cầu tư vấn.',
      archiveTitle: 'Bài cẩm nang mới nhất',
      archiveBody:
        'Thư viện nội dung này chỉ hiển thị bài viết của WingSide và hỗ trợ tăng trưởng SEO theo điểm đến.',
      meta: 'Cẩm nang du lịch',
    },
    it: {
      title: 'Guida di viaggio',
      heading: 'La guida aiuta a trovare WingSide e a pianificare con fiducia',
      paragraph:
        'Gli articoli aiutano i viaggiatori internazionali a capire stagionalità, trasferimenti e contesto delle destinazioni prima di chiedere una consulenza.',
      archiveTitle: 'Ultimi articoli di viaggio',
      archiveBody:
        'Questo archivio mostra solo i contenuti di WingSide e sostiene la crescita SEO per destinazione.',
      meta: 'Guida di viaggio',
    },
    es: {
      title: 'Guía de viaje',
      heading: 'La guía ayuda a encontrar WingSide y a planificar con confianza',
      paragraph:
        'Los artículos ayudan a los viajeros internacionales a comprender la temporada, los traslados y el contexto de cada destino antes de solicitar asesoría.',
      archiveTitle: 'Últimos artículos de viaje',
      archiveBody:
        'Este archivo muestra solo el contenido de WingSide y apoya el crecimiento SEO por destino.',
      meta: 'Guía de viaje',
    },
    pt: {
      title: 'Guia de viagem',
      heading: 'O guia ajuda a encontrar a WingSide e a planear com confiança',
      paragraph:
        'Os artigos ajudam os viajantes internacionais a compreender a época, os transferes e o contexto de cada destino antes de pedir aconselhamento.',
      archiveTitle: 'Artigos de viagem mais recentes',
      archiveBody:
        'Este arquivo mostra apenas os conteúdos da WingSide e apoia o crescimento SEO por destino.',
      meta: 'Guia de viagem',
    },
  }[locale]

  return {
    title: localized.title,
    hero: {
      type: 'lowImpact',
      richText: richText(localized.heading, localized.paragraph, 'h1'),
    },
    layout: [
      archiveBlock([assets.guideCategoryID], localized.archiveTitle, localized.archiveBody, 3),
    ],
    meta: {
      title: localized.meta,
      description: localized.paragraph,
      image: assets.secondaryImageID,
    },
  }
}

const buildTestimonialsPageData = (assets: Assets, locale: SupportedBackfillLocale) => {
  const chrome = testimonialChromeCopy[locale]
  const localized = {
    en: {
      title: 'Trust and proof',
      heading: 'Trust signals need to appear before price in inbound travel',
      paragraph:
        'Testimonials, process clarity, and destination expertise should appear before the inquiry form becomes too heavy.',
      gridTitle: 'How trust appears on the site',
      gridDescription:
        'This page uses structured cards to present credibility instead of hiding everything in long paragraphs.',
      meta: 'WingSide trust',
    },
    vi: {
      title: 'Niềm tin và bằng chứng',
      heading: 'Thông tin đáng tin cậy cần xuất hiện trước bảng giá',
      paragraph:
        'Cảm nhận của khách, quy trình rõ ràng và hiểu biết điểm đến giúp khách quốc tế tự tin trước khi gửi yêu cầu chi tiết.',
      gridTitle: 'WingSide xây dựng niềm tin như thế nào',
      gridDescription:
        'Trang này trình bày các bằng chứng quan trọng theo từng nhóm rõ ràng, thay vì giấu trong những đoạn văn dài.',
      meta: 'Niềm tin WingSide',
    },
    it: {
      title: 'Fiducia e trasparenza',
      heading: 'Le informazioni affidabili contano prima del prezzo',
      paragraph:
        'Le testimonianze, un processo chiaro e la conoscenza delle destinazioni aiutano gli ospiti internazionali prima di una richiesta dettagliata.',
      gridTitle: 'Come appare la fiducia sul sito',
      gridDescription:
        'La pagina presenta le prove più importanti in sezioni chiare, invece di nasconderle in lunghi paragrafi.',
      meta: 'Testimonianze e fiducia',
    },
    es: {
      title: 'Confianza y transparencia',
      heading: 'La información fiable importa antes que el precio',
      paragraph:
        'Los testimonios, un proceso claro y el conocimiento de los destinos ayudan a los viajeros internacionales antes de enviar una solicitud detallada.',
      gridTitle: 'Cómo aparece la confianza en el sitio',
      gridDescription:
        'La página presenta las pruebas más importantes en secciones claras, en lugar de esconderlas en párrafos largos.',
      meta: 'Testimonios y confianza',
    },
    pt: {
      title: 'Confiança e transparência',
      heading: 'A informação fiável importa antes do preço',
      paragraph:
        'Os testemunhos, um processo claro e o conhecimento dos destinos ajudam os viajantes internacionais antes de enviarem um pedido detalhado.',
      gridTitle: 'Como a confiança aparece no site',
      gridDescription:
        'A página apresenta as provas mais importantes em secções claras, em vez de as esconder em parágrafos longos.',
      meta: 'Confiança WingSide',
    },
  }[locale]

  return {
    title: localized.title,
    hero: {
      type: 'lowImpact',
      richText: richText(localized.heading, localized.paragraph, 'h1'),
    },
    layout: [
      featureGridBlock(
        localized.gridTitle,
        localized.gridDescription,
        chrome.items,
        'minimal',
        chrome.eyebrow,
      ),
    ],
    meta: {
      title: localized.meta,
      description: localized.paragraph,
      image: assets.secondaryImageID,
    },
  }
}

const buildDestinationDetailData = (
  assets: Assets,
  locale: SupportedBackfillLocale,
  pathname: keyof typeof destinationEntries,
) => {
  const { title, focus, highlights } = destinationEntries[pathname].translations[locale]
  const copy = destinationDetailCopy[locale]

  return {
    title,
    hero: {
      type: 'mediumImpact',
      media: assets.secondaryImageID,
      links: [
        linkItem(localizedRouteCards[locale].plan, '/plan-your-trip'),
        linkItem(localizedRouteCards[locale].packages, '/packages', 'outline'),
      ],
      richText: richText(title, focus, 'h1'),
    },
    layout: [
      infoStripBlock(
        copy.infoTitle(title),
        copy.infoDescription,
        copy.rows.map((row, index) => ({
          ...row,
          value: index === 1 ? localizedRouteCards[locale].plan : row.value,
        })),
        copy.infoEyebrow,
      ),
      featureGridBlock(
        copy.experienceTitle,
        copy.experienceDescription,
        highlights.map((item) => ({
          title: item.title,
          description: item.description,
          meta: copy.experienceMeta,
        })),
        'default',
        copy.experienceEyebrow,
      ),
      ctaBlock(copy.ctaTitle, copy.ctaParagraph, [
        linkItem(localizedRouteCards[locale].plan, '/plan-your-trip'),
      ]),
    ],
    relatedPages: relatedPageIDs(assets, ['/plan-your-trip', '/packages', '/travel-guide']),
    meta: {
      title,
      description: copy.metaDescription(title),
      image: assets.secondaryImageID,
      breadcrumbLabel: title,
    },
  }
}

const buildStyleDetailData = (
  assets: Assets,
  locale: SupportedBackfillLocale,
  pathname: keyof typeof styleEntries,
) => {
  const entry = styleEntries[pathname].translations[locale]
  const copy = styleDetailCopy[locale]

  return {
    title: entry.title,
    hero: {
      type: 'lowImpact',
      richText: richText(entry.title, entry.description, 'h1'),
    },
    layout: [
      featureGridBlock(
        copy.sectionTitle,
        copy.sectionDescription,
        entry.points.map((item) => ({
          title: item.title,
          description: item.description,
          meta: copy.pointMeta,
        })),
        'default',
        copy.eyebrow,
      ),
      ctaBlock(copy.ctaTitle, copy.ctaParagraph, [
        linkItem(localizedRouteCards[locale].plan, '/plan-your-trip'),
      ]),
    ],
    relatedPages: relatedPageIDs(assets, ['/plan-your-trip', '/packages', '/about-us']),
    meta: {
      title: copy.metaTitle(entry.title),
      description: copy.metaDescription(entry.title),
      image: assets.secondaryImageID,
      breadcrumbLabel: entry.title,
    },
  }
}

const buildPackageDetailData = (
  assets: Assets,
  locale: SupportedBackfillLocale,
  pathname: keyof typeof packageEntries,
) => {
  const entry = packageEntries[pathname].translations[locale]
  const copy = packageDetailCopy[locale]

  return {
    title: entry.title,
    hero: {
      type: 'mediumImpact',
      media: assets.secondaryImageID,
      links: [
        linkItem(localizedRouteCards[locale].plan, '/plan-your-trip'),
        linkItem(localizedRouteCards[locale].contactUs, '/contact-us', 'outline'),
      ],
      richText: richText(entry.title, entry.summary, 'h1'),
    },
    layout: [
      contentBlock(entry.blocks.map((block) => ({ ...block, size: 'half' as const }))),
      ctaBlock(copy.ctaTitle, copy.ctaParagraph, [
        linkItem(localizedRouteCards[locale].plan, '/plan-your-trip'),
      ]),
    ],
    relatedPages: relatedPageIDs(assets, ['/plan-your-trip', '/destinations', '/styles']),
    meta: {
      title: entry.title,
      description: copy.metaDescription(entry.title),
      image: assets.secondaryImageID,
      breadcrumbLabel: entry.title,
    },
  }
}

const buildPageData = (assets: Assets, locale: SupportedBackfillLocale, pathname: string) => {
  switch (pathname) {
    case '/':
      return buildHomePageData(assets, locale)
    case '/about-us':
      return buildAboutPageData(assets, locale)
    case '/contact-us':
      return buildContactPageData(assets, locale)
    case '/destinations':
      return buildDestinationHubData(assets, locale)
    case '/packages':
      return buildPackagesHubData(assets, locale)
    case '/plan-your-trip':
      return buildPlanTripPageData(assets, locale)
    case '/styles':
      return buildStyleHubData(assets, locale)
    case '/travel-guide':
      return buildTravelGuidePageData(assets, locale)
    case '/testimonials':
      return buildTestimonialsPageData(assets, locale)
    default:
      if (pathname in destinationEntries) {
        return buildDestinationDetailData(
          assets,
          locale,
          pathname as keyof typeof destinationEntries,
        )
      }

      if (pathname in styleEntries) {
        return buildStyleDetailData(assets, locale, pathname as keyof typeof styleEntries)
      }

      if (pathname in packageEntries) {
        return buildPackageDetailData(assets, locale, pathname as keyof typeof packageEntries)
      }

      throw new Error(`No backfill builder registered for WingSide page ${pathname}`)
  }
}

const deriveAssets = (pagesByPath: Map<string, PageDoc>): Assets => {
  const homePage = getPage({ pagesByPath } as Assets, '/')
  const destinationHub = getPage({ pagesByPath } as Assets, '/destinations')
  const styleHub = getPage({ pagesByPath } as Assets, '/styles')
  const packagesHub = getPage({ pagesByPath } as Assets, '/packages')
  const planTripPage = getPage({ pagesByPath } as Assets, '/plan-your-trip')
  const travelGuidePage = getPage({ pagesByPath } as Assets, '/travel-guide')

  const heroImageID = normalizeRelationID(homePage.hero?.media)
  const secondaryImageID = findFirstRelationValue(destinationHub.layout, (entryKey, entryValue) =>
    entryKey === 'media' ? normalizeRelationID(entryValue) : null,
  )
  const travelStylesImageID = findFirstRelationValue(styleHub.layout, (entryKey, entryValue) =>
    entryKey === 'media' ? normalizeRelationID(entryValue) : null,
  )
  const sampleItinerariesImageID = findFirstRelationValue(
    packagesHub.layout,
    (entryKey, entryValue) => (entryKey === 'media' ? normalizeRelationID(entryValue) : null),
  )
  const tripPlannerFormID = findFirstRelationValue(planTripPage.layout, (entryKey, entryValue) =>
    entryKey === 'form' ? normalizeRelationID(entryValue) : null,
  )
  const guideCategoryID = findFirstRelationList(travelGuidePage.layout, (entryKey, entryValue) =>
    entryKey === 'categories' ? relationIDs(entryValue) : [],
  )[0]

  const fallbackImageID =
    heroImageID || secondaryImageID || travelStylesImageID || sampleItinerariesImageID

  if (!fallbackImageID) {
    throw new Error('Could not derive required WingSide media relations for locale backfill.')
  }

  if (!tripPlannerFormID || !guideCategoryID) {
    throw new Error(
      'Could not derive required WingSide form/category relations for locale backfill.',
    )
  }

  return {
    guideCategoryID,
    heroImageID: heroImageID || fallbackImageID,
    pagesByPath,
    sampleItinerariesImageID: sampleItinerariesImageID || fallbackImageID,
    secondaryImageID: secondaryImageID || fallbackImageID,
    travelStylesImageID: travelStylesImageID || fallbackImageID,
    tripPlannerFormID,
  }
}

export const wingsSideBackfillLocales = ['vi', 'en', 'it', 'es', 'pt'] as const
export const wingsSideBackfillPaths = [...requiredPaths]

export const buildWingsSideLocaleAuditPageData = (
  locale: SupportedBackfillLocale,
  pathname: (typeof requiredPaths)[number],
) => {
  const pagesByPath = new Map<string, PageDoc>(
    requiredPaths.map((path, index) => [path, { id: index + 1, pathname: path }]),
  )
  const assets: Assets = {
    guideCategoryID: 1001,
    heroImageID: 1002,
    pagesByPath,
    sampleItinerariesImageID: 1003,
    secondaryImageID: 1004,
    travelStylesImageID: 1005,
    tripPlannerFormID: 1006,
  }

  return applyWingsSideEditorialTerminology(buildPageData(assets, locale, pathname), locale)
}

export async function backfillWingsSideLocales(
  payload: Payload,
  req: PayloadRequest,
  options: {
    dryRun?: boolean
    locales?: SupportedBackfillLocale[]
    settingsLocales?: PublicLocaleCode[]
  } = {},
) {
  const siteResult = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 1,
    locale: 'en',
    pagination: false,
    overrideAccess: true,
    req,
    where: {
      code: {
        equals: 'wing-side',
      },
    },
  })

  const site = siteResult.docs[0]

  if (!site) {
    throw new Error('Could not find WingSide site record for locale backfill.')
  }

  const pages = await payload.find({
    collection: 'pages',
    depth: 2,
    limit: 1000,
    locale: 'en',
    pagination: false,
    overrideAccess: true,
    req,
    where: {
      site: {
        equals: site.id,
      },
    },
  })

  const pagesByPath = new Map<string, PageDoc>()

  for (const page of pages.docs) {
    const pageDoc = page as unknown as PageDoc
    const pathname = getBackfillPagePathname(pageDoc)

    if (pathname) {
      pagesByPath.set(pathname, pageDoc)
    }
  }

  for (const pathname of requiredPaths) {
    if (!pagesByPath.has(pathname)) {
      throw new Error(`WingSide locale backfill missing source page ${pathname}`)
    }
  }

  const assets = deriveAssets(pagesByPath)
  const locales = options.locales || [...wingsSideBackfillLocales]
  const updates: Array<{
    action: 'skip' | 'update'
    locale: SupportedBackfillLocale
    pathname: string
  }> = []

  for (const locale of locales) {
    for (const pathname of requiredPaths) {
      const page = getPage(assets, pathname)
      const data = applyWingsSideEditorialTerminology(
        buildPageData(assets, locale, pathname),
        locale,
      )
      const result = await updatePageLocale(payload, req, page.id, locale, data, {
        dryRun: options.dryRun,
      })
      updates.push({ action: result.action, locale, pathname })

      if (options.dryRun || result.action === 'skip') {
        continue
      }
    }
  }

  const siteSettingsUpdates = await backfillWingsSideSiteSettings(payload, req, {
    dryRun: options.dryRun,
    locales: options.settingsLocales,
    siteID: site.id,
  })

  return {
    locales,
    siteSettingsUpdates,
    totalPages: requiredPaths.length,
    updates,
  }
}
