import { clearSharedMemoryCache, invalidateSharedCache } from './sharedCache'

const SITE_CODES = [
  'wings-group',
  'wings-go',
  'wing-side',
  'wings-plus',
  'wings-care',
  'wings-pass',
] as const

const LOCALES = ['vi', 'en', 'it', 'es', 'pt', 'ja', 'ko', 'fr', 'de'] as const

export const invalidateSitesCache = async (): Promise<void> => {
  clearSharedMemoryCache()
  await Promise.all([
    invalidateSharedCache({ namespace: 'sites', tenant: 'directory', variants: ['active'] }),
    ...SITE_CODES.map((code) =>
      invalidateSharedCache({ namespace: 'sites', tenant: code, variants: ['active'] }),
    ),
  ])
}

export const invalidateSettingsCache = async (siteID: number | string): Promise<void> => {
  await invalidateSharedCache({
    namespace: 'site-settings',
    tenant: siteID,
    variants: [...LOCALES],
  })
}
