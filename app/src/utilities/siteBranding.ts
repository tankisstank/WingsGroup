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
export type ChildSiteBrandCode =
  | 'wing-side'
  | 'wings-care'
  | 'wings-go'
  | 'wings-pass'
  | 'wings-plus'

export type SiteBrandAssetDimensions = readonly [width: number, height: number]

export type SiteBrandAssetMetadata = {
  dimensions: SiteBrandAssetDimensions
  sha256: string
}

export type SiteBrandManifest = {
  assetContract: {
    canvasPolicy: 'tight-visible-bounds'
    dimensions: Record<Exclude<SiteBrandAssetKind, 'manifest'>, SiteBrandAssetDimensions>
    doNotCrop: true
    doNotUpscale: true
    preserveTransparentCanvas: true
    unit: 'css-px'
  }
  assets: Record<SiteBrandAssetKind, string>
  assetIntegrity: Record<Exclude<SiteBrandAssetKind, 'manifest'>, string>
  displayTitle: string
  logoAlt: string
}

const siteBrandManifestByCode: Record<ChildSiteBrandCode, SiteBrandManifest> = {
  'wing-side': {
    assetContract: {
      canvasPolicy: 'tight-visible-bounds',
      dimensions: {
        favicon: [512, 512],
        logoPrimary: [448, 280],
        logoReverse: [429, 360],
        mark: [512, 372],
        ogImage: [1200, 630],
      },
      doNotCrop: true,
      doNotUpscale: true,
      preserveTransparentCanvas: true,
      unit: 'css-px',
    },
    assets: {
      favicon: '/brand/wingsside/wingsside-favicon.png',
      logoPrimary: '/brand/wingsside/wingsside-logo-primary.png',
      logoReverse: '/brand/wingsside/wingsside-logo-reverse.png',
      manifest: '/brand/wingsside/manifest.json',
      mark: '/brand/wingsside/wingsside-mark.png',
      ogImage: '/brand/wingsside/wingsside-og-image.png',
    },
    assetIntegrity: {
      favicon: '895255e7fe5c51a2dcede286db3fe2aa0ce297e0367ccadc965f993c412a1286',
      logoPrimary: 'c32e136e36a0f1c721b373d21947949e3692b2825ea01a7e61e0c3b70ea8bc65',
      logoReverse: '81fa2d30618a48435908f4fa2d72e1b5171c8feeb19cdbb43ed83a401241a70b',
      mark: '04ada74cf0059f699852f89e6dc1aa555a7a3f612c15fc28453ae8d5527ef729',
      ogImage: '84a1e27bc82c148a16e0daf7bfba132e46a182170624ed5b10b6b7a9433d2c3b',
    },
    displayTitle: 'WingSide',
    logoAlt: 'WingSide logo',
  },
  'wings-care': {
    assetContract: {
      canvasPolicy: 'tight-visible-bounds',
      dimensions: {
        favicon: [512, 512],
        logoPrimary: [452, 280],
        logoReverse: [429, 360],
        mark: [512, 307],
        ogImage: [1200, 630],
      },
      doNotCrop: true,
      doNotUpscale: true,
      preserveTransparentCanvas: true,
      unit: 'css-px',
    },
    assets: {
      favicon: '/brand/wingscare/wingscare-favicon.png',
      logoPrimary: '/brand/wingscare/wingscare-logo-primary.png',
      logoReverse: '/brand/wingscare/wingscare-logo-reverse.png',
      manifest: '/brand/wingscare/manifest.json',
      mark: '/brand/wingscare/wingscare-mark.png',
      ogImage: '/brand/wingscare/wingscare-og-image.png',
    },
    assetIntegrity: {
      favicon: '7b055ea682b43bbe3855d13514e4752913e252e5a740d71524e9b97c29c482cc',
      logoPrimary: 'ef0f3029a020470e9bb804ef2c7b101cfc730979954ecda08a71518823c388c8',
      logoReverse: '476397009fbbf59d3f28cfa3bc0481c3962b33865a735f93c483926345a0e321',
      mark: '10e93f12a08694cc570dda72999341c74c0bb64a24804aeed18552f63de73396',
      ogImage: '55226c0870fbaf75c123728246035ae65fa2bd46e608a7ed632755fe8a260863',
    },
    displayTitle: 'WingsCare',
    logoAlt: 'WingsCare logo',
  },
  'wings-go': {
    assetContract: {
      canvasPolicy: 'tight-visible-bounds',
      dimensions: {
        favicon: [512, 512],
        logoPrimary: [420, 280],
        logoReverse: [429, 360],
        mark: [512, 389],
        ogImage: [1200, 630],
      },
      doNotCrop: true,
      doNotUpscale: true,
      preserveTransparentCanvas: true,
      unit: 'css-px',
    },
    assets: {
      favicon: '/brand/wingsgo/wingsgo-favicon.png',
      logoPrimary: '/brand/wingsgo/wingsgo-logo-primary.png',
      logoReverse: '/brand/wingsgo/wingsgo-logo-reverse.png',
      manifest: '/brand/wingsgo/manifest.json',
      mark: '/brand/wingsgo/wingsgo-mark.png',
      ogImage: '/brand/wingsgo/wingsgo-og-image.png',
    },
    assetIntegrity: {
      favicon: 'c75e8ea46134dc736e23b5f665cc1d50e285fbf0e948d66d908adafa366f7de0',
      logoPrimary: '1bd15fd3e256d8555c4aac4ea6a5f8c06dca4b9e257eb0351d1f8b37e91d5bc8',
      logoReverse: '66c667f57ce95b9b8826cf8776532f1eb6dd7702951c263823b34ce9dbba7c21',
      mark: 'e1277922ddd425c6f04436d5ffbed2b037beae794325f97e66bb72b6dd579d06',
      ogImage: 'ef713fc6e37e9e05dc35324d1b585ea380375c3df9024ee87f3c536786ea4d31',
    },
    displayTitle: 'WingsGo',
    logoAlt: 'WingsGo logo',
  },
  'wings-pass': {
    assetContract: {
      canvasPolicy: 'tight-visible-bounds',
      dimensions: {
        favicon: [512, 512],
        logoPrimary: [454, 280],
        logoReverse: [429, 360],
        mark: [512, 371],
        ogImage: [1200, 630],
      },
      doNotCrop: true,
      doNotUpscale: true,
      preserveTransparentCanvas: true,
      unit: 'css-px',
    },
    assets: {
      favicon: '/brand/wingspass/wingspass-favicon.png',
      logoPrimary: '/brand/wingspass/wingspass-logo-primary.png',
      logoReverse: '/brand/wingspass/wingspass-logo-reverse.png',
      manifest: '/brand/wingspass/manifest.json',
      mark: '/brand/wingspass/wingspass-mark.png',
      ogImage: '/brand/wingspass/wingspass-og-image.png',
    },
    assetIntegrity: {
      favicon: '76ac0224dc0f7f6c7a995fbaedf871eec1eca333219d7d863e4ee64079b0087f',
      logoPrimary: '886c25c0093840f328e8dc8d5e6b7c6adb7b89e4ddfb6a1002d82c495f523a9d',
      logoReverse: '81fa2d30618a48435908f4fa2d72e1b5171c8feeb19cdbb43ed83a401241a70b',
      mark: 'a6fde6dc3449e35c80bc5c2eee4eea9a51b623b4a1049ed01f766389220c4b38',
      ogImage: '13206b7b33693cb2f56c3d743644c64f84105dc48fc5fd7f2db1a19d71902161',
    },
    displayTitle: 'WingsPass',
    logoAlt: 'WingsPass logo',
  },
  'wings-plus': {
    assetContract: {
      canvasPolicy: 'tight-visible-bounds',
      dimensions: {
        favicon: [512, 512],
        logoPrimary: [447, 280],
        logoReverse: [429, 360],
        mark: [512, 428],
        ogImage: [1200, 630],
      },
      doNotCrop: true,
      doNotUpscale: true,
      preserveTransparentCanvas: true,
      unit: 'css-px',
    },
    assets: {
      favicon: '/brand/wingsplus/wingsplus-favicon.png',
      logoPrimary: '/brand/wingsplus/wingsplus-logo-primary.png',
      logoReverse: '/brand/wingsplus/wingsplus-logo-reverse.png',
      manifest: '/brand/wingsplus/manifest.json',
      mark: '/brand/wingsplus/wingsplus-mark.png',
      ogImage: '/brand/wingsplus/wingsplus-og-image.png',
    },
    assetIntegrity: {
      favicon: '4aa58227da4a8e5e5cc8611de07f3fd8b9dc3b22d81456f3ec4dc7e206f9d1ef',
      logoPrimary: '8de29cc32e6cc9e01854afe5a03d788eb78e35b6672db08833fbe90ca1677f6f',
      logoReverse: '4107b5512a4061fc1663cb743f9f328992801d31285eb6e857870db66c56e478',
      mark: '19130c195aaa28fb23fc585c758df7a0a41aa8093d557097e979c941915f3c78',
      ogImage: '05380d84cca79c92e2e5728394e1b48b30050e6579b9e7e75c48ae54fe412c34',
    },
    displayTitle: 'WingsPlus',
    logoAlt: 'WingsPlus logo',
  },
}

const runtimeBrandCodeAliases: Record<string, ChildSiteBrandCode> = {
  'wing-side': 'wing-side',
  'wings-care': 'wings-care',
  'wings-pass': 'wings-pass',
  'wings-plus': 'wings-plus',
  'wings-side': 'wing-side',
  wingscare: 'wings-care',
  wingsgo: 'wings-go',
  'wings-go': 'wings-go',
  wingspass: 'wings-pass',
  wingsplus: 'wings-plus',
  wingsside: 'wing-side',
}

export const normalizeChildSiteBrandCode = (
  siteCode?: null | string,
): ChildSiteBrandCode | null => {
  if (!siteCode) return null

  return runtimeBrandCodeAliases[siteCode.trim().toLowerCase()] || null
}

export const getSiteBrandManifest = (siteCode?: null | string): SiteBrandManifest | null => {
  const runtimeCode = normalizeChildSiteBrandCode(siteCode)

  return runtimeCode ? siteBrandManifestByCode[runtimeCode] : null
}

export const getSiteBrandAssetURL = (
  siteCode: null | string | undefined,
  asset: SiteBrandAssetKind,
): string | null => getSiteBrandManifest(siteCode)?.assets[asset] || null

export const getSiteBrandAssetMetadata = (
  siteCode: null | string | undefined,
  asset: Exclude<SiteBrandAssetKind, 'manifest'>,
): SiteBrandAssetMetadata | null => {
  const manifest = getSiteBrandManifest(siteCode)

  if (!manifest) return null

  return {
    dimensions: manifest.assetContract.dimensions[asset],
    sha256: manifest.assetIntegrity[asset],
  }
}

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
