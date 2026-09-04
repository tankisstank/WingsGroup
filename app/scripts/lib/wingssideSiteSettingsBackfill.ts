import type { Payload, PayloadRequest } from 'payload'

import { publicLocales, type LocalizedCopy, type PublicLocaleCode } from '../../src/i18n/publicCopy'
import { wingsSideLocalizationBackfillContext } from '../../src/utilities/wingsSideLocalizationBackfillContext'
import { applyWingsSideEditorialTerminology } from './wingssideEditorialTerminology'

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

const linkItem = (label: string, url: string) => ({
  link: {
    type: 'custom' as const,
    label,
    url,
  },
})

const normalizeComparableValue = (value: unknown): unknown => {
  if (value === null || value === undefined) return undefined
  if (Array.isArray(value)) return value.map(normalizeComparableValue)
  if (typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== 'id')
      .map(([key, entryValue]) => [key, normalizeComparableValue(entryValue)] as const)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey)),
  )
}

export type WingsSideSiteSettingsCopy = {
  footerNavItems: Array<ReturnType<typeof linkItem>>
  footerNote: string
  headerNavItems: Array<ReturnType<typeof linkItem>>
  seo: {
    defaultDescription: string
    defaultTitle: string
    titleSuffix: string
  }
  tagline: string
}

const wingsSideSiteSettingsSourceCopy: LocalizedCopy<WingsSideSiteSettingsCopy> = {
  en: {
    footerNote:
      'WingSide focuses on inbound planning, destination storytelling, travel styles, and trip inquiry instead of a retail tour grid.',
    footerNavItems: [
      linkItem('Destinations', '/destinations'),
      linkItem('Plan Your Trip', '/plan-your-trip'),
      linkItem('Travel Guide', '/travel-guide'),
      linkItem('Contact', '/contact-us'),
    ],
    headerNavItems: [
      linkItem('Home', '/'),
      linkItem('Destinations', '/destinations'),
      linkItem('Travel Styles', '/styles'),
      linkItem('Vietnam Packages', '/packages'),
      linkItem('Travel Guide', '/travel-guide'),
      linkItem('About', '/about-us'),
      linkItem('Contact', '/contact-us'),
    ],
    seo: {
      defaultDescription:
        'WingSide plans tailor-made Vietnam journeys with destination-led discovery, travel styles, and consultative trip requests.',
      defaultTitle: 'WingSide',
      titleSuffix: 'Tailor-made Vietnam journeys',
    },
    tagline:
      'Inbound Vietnam planning with destination-led discovery and consultative inquiry flow.',
  },
  es: {
    footerNote:
      'WingSide se centra en viajes a Vietnam a medida, destinos, estilos de viaje y solicitudes personalizadas.',
    footerNavItems: [
      linkItem('Destinos', '/destinations'),
      linkItem('Planifica', '/plan-your-trip'),
      linkItem('Guía', '/travel-guide'),
      linkItem('Contacto', '/contact-us'),
    ],
    headerNavItems: [
      linkItem('Inicio', '/'),
      linkItem('Destinos', '/destinations'),
      linkItem('Estilos de viaje', '/styles'),
      linkItem('Paquetes Vietnam', '/packages'),
      linkItem('Guía de viaje', '/travel-guide'),
      linkItem('Nosotros', '/about-us'),
      linkItem('Contacto', '/contact-us'),
    ],
    seo: {
      defaultDescription:
        'WingSide diseña viajes a Vietnam hechos a medida con destinos seleccionados, ritmo editorial y asesoría local.',
      defaultTitle: 'WingSide',
      titleSuffix: 'Vietnam a medida',
    },
    tagline: 'Viajes a medida por Vietnam con destinos, estilos y asesoría.',
  },
  it: {
    footerNote:
      'WingSide si concentra su viaggi in Vietnam su misura, destinazioni, stili di viaggio e richieste personalizzate.',
    footerNavItems: [
      linkItem('Destinazioni', '/destinations'),
      linkItem('Pianifica', '/plan-your-trip'),
      linkItem('Guida', '/travel-guide'),
      linkItem('Contatti', '/contact-us'),
    ],
    headerNavItems: [
      linkItem('Home', '/'),
      linkItem('Destinazioni', '/destinations'),
      linkItem('Stili di viaggio', '/styles'),
      linkItem('Pacchetti Vietnam', '/packages'),
      linkItem('Guida di viaggio', '/travel-guide'),
      linkItem('Chi siamo', '/about-us'),
      linkItem('Contatti', '/contact-us'),
    ],
    seo: {
      defaultDescription:
        'WingSide crea viaggi su misura in Vietnam con destinazioni curate, ritmo editoriale e consulenza locale.',
      defaultTitle: 'WingSide',
      titleSuffix: 'Vietnam su misura',
    },
    tagline: 'Viaggi in Vietnam su misura con destinazioni, stili e consulenza.',
  },
  pt: {
    footerNote:
      'A WingSide foca-se em viagens ao Vietname feitas à medida, destinos, estilos de viagem e pedidos personalizados.',
    footerNavItems: [
      linkItem('Destinos', '/destinations'),
      linkItem('Planear', '/plan-your-trip'),
      linkItem('Guia', '/travel-guide'),
      linkItem('Contacto', '/contact-us'),
    ],
    headerNavItems: [
      linkItem('Início', '/'),
      linkItem('Destinos', '/destinations'),
      linkItem('Estilos de viagem', '/styles'),
      linkItem('Pacotes Vietname', '/packages'),
      linkItem('Guia de viagem', '/travel-guide'),
      linkItem('Sobre', '/about-us'),
      linkItem('Contacto', '/contact-us'),
    ],
    seo: {
      defaultDescription:
        'A WingSide desenha viagens ao Vietname feitas à medida com destinos selecionados, ritmo editorial e consultoria local.',
      defaultTitle: 'WingSide',
      titleSuffix: 'Vietname sob medida',
    },
    tagline: 'Viagens à medida pelo Vietname com destinos, estilos e consultoria.',
  },
  vi: {
    footerNote:
      'WingSide tập trung vào hành trình Việt Nam thiết kế riêng, kể chuyện theo điểm đến, phong cách du lịch và tư vấn theo nhu cầu thay vì một bảng tour bán sẵn.',
    footerNavItems: [
      linkItem('Điểm đến', '/destinations'),
      linkItem('Lên kế hoạch', '/plan-your-trip'),
      linkItem('Cẩm nang du lịch', '/travel-guide'),
      linkItem('Liên hệ', '/contact-us'),
    ],
    headerNavItems: [
      linkItem('Trang chủ', '/'),
      linkItem('Điểm đến', '/destinations'),
      linkItem('Phong cách du lịch', '/styles'),
      linkItem('Gói Việt Nam', '/packages'),
      linkItem('Cẩm nang du lịch', '/travel-guide'),
      linkItem('Giới thiệu', '/about-us'),
      linkItem('Liên hệ', '/contact-us'),
    ],
    seo: {
      defaultDescription:
        'WingSide lập kế hoạch hành trình Việt Nam may đo theo điểm đến, phong cách du lịch và tư vấn địa phương.',
      defaultTitle: 'WingSide',
      titleSuffix: 'Hành trình Việt Nam may đo',
    },
    tagline: 'Thiết kế hành trình Việt Nam theo điểm đến, phong cách du lịch và tư vấn cá nhân hóa.',
  },
}

export const wingsSideSiteSettingsCopy = Object.fromEntries(
  publicLocales.map((locale) => [
    locale,
    applyWingsSideEditorialTerminology(wingsSideSiteSettingsSourceCopy[locale], locale),
  ]),
) as LocalizedCopy<WingsSideSiteSettingsCopy>

export async function backfillWingsSideSiteSettings(
  payload: Payload,
  req: PayloadRequest,
  options: {
    dryRun?: boolean
    locales?: PublicLocaleCode[]
    siteID: number | string
  },
) {
  const settingsResult = await payload.find({
    collection: 'site-settings',
    depth: 0,
    limit: 1,
    locale: 'en',
    pagination: false,
    overrideAccess: true,
    req,
    where: {
      site: {
        equals: options.siteID,
      },
    },
  })

  const settings = settingsResult.docs[0]

  if (!settings) {
    throw new Error('Could not find WingSide site settings record for locale backfill.')
  }

  const locales = options.locales || [...publicLocales]
  const updates: Array<{
    action: 'skip' | 'update'
    collection: 'site-settings'
    id: number | string
    locale: PublicLocaleCode
  }> = []

  for (const locale of locales) {
    const targetData = applyWingsSideEditorialTerminology(wingsSideSiteSettingsCopy[locale], locale)
    const currentLocaleSettings = await payload.findByID({
      collection: 'site-settings',
      depth: 0,
      id: settings.id,
      locale,
      overrideAccess: true,
      req,
    })
    const currentComparable = JSON.stringify(
      normalizeComparableValue({
        footerNavItems: currentLocaleSettings.footerNavItems || [],
        footerNote: currentLocaleSettings.footerNote || '',
        headerNavItems: currentLocaleSettings.headerNavItems || [],
        seo: {
          defaultDescription: currentLocaleSettings.seo?.defaultDescription || '',
          defaultTitle: currentLocaleSettings.seo?.defaultTitle || '',
          titleSuffix: currentLocaleSettings.seo?.titleSuffix || '',
        },
        tagline: currentLocaleSettings.tagline || '',
      }),
    )
    const targetComparable = JSON.stringify(normalizeComparableValue(targetData))

    if (currentComparable === targetComparable) {
      updates.push({ action: 'skip', collection: 'site-settings', id: settings.id, locale })
      continue
    }

    if (process.env.WINGSSIDE_BACKFILL_DEBUG_DIFF === '1') {
      payload.logger.info({
        currentData: JSON.parse(currentComparable),
        locale,
        message: 'WingSide site-settings backfill comparison mismatch',
        targetData,
      })
    }

    updates.push({ action: 'update', collection: 'site-settings', id: settings.id, locale })

    if (options.dryRun) continue

    await withSQLiteBusyRetry(() =>
      payload.update({
        id: settings.id,
        collection: 'site-settings',
        context: wingsSideLocalizationBackfillContext,
        data: targetData,
        locale,
        overrideAccess: true,
        req,
      }),
    )
  }

  return updates
}
