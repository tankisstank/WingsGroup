import type { Media } from '@/payload-types'

import { normalizeRelationID } from '@/access/roles'
import { getMediaUrl } from './getMediaUrl'

export type SiteBrandAssetKind =
  | 'favicon'
  | 'logoPrimary'
  | 'logoReverse'
  | 'manifest'
  | 'mark'
  | 'ogImage'
export type ChildSiteBrandCode = 'wing-side' | 'wings-go'

type SiteBrandManifest = {
  assets: Record<SiteBrandAssetKind, string>
  displayTitle: string
  logoAlt: string
}

const siteBrandManifestByCode: Record<ChildSiteBrandCode, SiteBrandManifest> = {
  'wing-side': {
    assets: {
      favicon: '/brand/wingsside/wingsside-favicon.png',
      logoPrimary: '/brand/wingsside/wingsside-logo-primary.png',
      logoReverse: '/brand/wingsside/wingsside-logo-reverse.png',
      manifest: '/brand/wingsside/manifest.json',
      mark: '/brand/wingsside/wingsside-mark.png',
      ogImage: '/brand/wingsside/wingsside-og-image.png',
    },
    displayTitle: 'WingSide',
    logoAlt: 'WingSide logo',
  },
  'wings-go': {
    assets: {
      favicon: '/brand/wingsgo/wingsgo-favicon.png',
      logoPrimary: '/brand/wingsgo/wingsgo-logo-primary.png',
      logoReverse: '/brand/wingsgo/wingsgo-logo-reverse.png',
      manifest: '/brand/wingsgo/manifest.json',
      mark: '/brand/wingsgo/wingsgo-mark.png',
      ogImage: '/brand/wingsgo/wingsgo-og-image.png',
    },
    displayTitle: 'WingsGo',
    logoAlt: 'WingsGo logo',
  },
}

const runtimeBrandCodeAliases: Record<string, ChildSiteBrandCode> = {
  'wing-side': 'wing-side',
  wingsgo: 'wings-go',
  'wings-go': 'wings-go',
  wingsside: 'wing-side',
}

export const normalizeChildSiteBrandCode = (
  siteCode?: null | string,
): ChildSiteBrandCode | null => {
  if (!siteCode) return null

  return runtimeBrandCodeAliases[siteCode] || null
}

export const getSiteBrandManifest = (siteCode?: null | string): SiteBrandManifest | null => {
  const runtimeCode = normalizeChildSiteBrandCode(siteCode)

  return runtimeCode ? siteBrandManifestByCode[runtimeCode] : null
}

export const getSiteBrandAssetURL = (
  siteCode: null | string | undefined,
  asset: SiteBrandAssetKind,
): string | null => getSiteBrandManifest(siteCode)?.assets[asset] || null

export const getSiteLogoAltText = (siteCode?: null | string): string | null =>
  getSiteBrandManifest(siteCode)?.logoAlt || null

export const isMediaOwnedBySite = (
  media: Media | null | undefined,
  siteID: null | number | string | undefined,
): media is Media => {
  if (!media || siteID === null || siteID === undefined) return false

  const mediaSiteID = normalizeRelationID(media.site)

  return mediaSiteID !== undefined && String(mediaSiteID) === String(siteID)
}

export const getSiteOwnedMedia = (
  media: Media | number | null | undefined,
  siteID: null | number | string | undefined,
): Media | null => {
  if (typeof media !== 'object' || !media || !isMediaOwnedBySite(media, siteID)) {
    return null
  }

  return media.url ? media : null
}

export const getSiteOwnedMediaURL = ({
  media,
  siteID,
}: {
  media: Media | number | null | undefined
  siteID: null | number | string | undefined
}): string | null => {
  const ownedMedia = getSiteOwnedMedia(media, siteID)

  return ownedMedia?.url ? getMediaUrl(ownedMedia.url, ownedMedia.updatedAt) : null
}
