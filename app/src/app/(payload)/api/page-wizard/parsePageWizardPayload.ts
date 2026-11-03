import { isLayoutPresetKey, type LayoutPresetKey } from '@/utilities/layoutPresets'
import {
  cmsEnabledLocaleCodes,
  isSupportedLocale,
  type SupportedLocaleCode,
} from '@/utilities/locales'
import { vietnameseSlugify } from '@/utilities/slugify'

export type PageWizardPayload = {
  locale?: string
  preset?: LayoutPresetKey
  site?: number | string
  slug?: string
  summary?: string
  title?: string
}

export class PageWizardError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'PageWizardError'
    this.status = status
  }
}

const slugify = (value: string) => vietnameseSlugify(value)

const normalizeSiteID = (value: unknown): number | string | undefined => {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value)
  }

  return undefined
}

const isCmsLocale = (value: unknown): value is SupportedLocaleCode =>
  typeof value === 'string' && isSupportedLocale(value) && cmsEnabledLocaleCodes.includes(value)

export const parsePageWizardPayload = (body: unknown) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new PageWizardError('Dữ liệu tạo trang không hợp lệ.')
  }

  const value = body as PageWizardPayload
  const title = typeof value.title === 'string' ? value.title.trim() : ''
  const slugSource = typeof value.slug === 'string' ? value.slug : title
  const slug = slugify(slugSource)
  const summary = typeof value.summary === 'string' ? value.summary.trim() : ''
  const siteID = normalizeSiteID(value.site)
  const locale = value.locale === undefined ? 'vi' : value.locale

  if (!siteID || !title || !slug) {
    throw new PageWizardError('Thiếu site, tiêu đề hoặc đường dẫn.')
  }

  if (!isLayoutPresetKey(value.preset)) {
    throw new PageWizardError('Loại trang không hợp lệ.')
  }

  if (!isCmsLocale(locale)) {
    throw new PageWizardError('Locale không hợp lệ hoặc chưa được bật trong CMS.')
  }

  return { locale, preset: value.preset, siteID, slug, summary, title }
}
