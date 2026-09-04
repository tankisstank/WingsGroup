import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  getSiteBrandAssetURL,
  getSiteBrandManifest,
  getSiteLogoAltText,
  getSiteOwnedMedia,
  isMediaOwnedBySite,
  normalizeChildSiteBrandCode,
} from '@/utilities/siteBranding'

const media = (site: number, url = '/media/logo.png') =>
  ({
    id: 1,
    site,
    updatedAt: '2026-08-29T00:00:00.000Z',
    createdAt: '2026-08-29T00:00:00.000Z',
    url,
  }) as never

describe('child-site branding contract', () => {
  it('normalizes aliases without changing the runtime tenant identity', () => {
    expect(normalizeChildSiteBrandCode('wingsgo')).toBe('wings-go')
    expect(normalizeChildSiteBrandCode('wings-go')).toBe('wings-go')
    expect(normalizeChildSiteBrandCode('wingsside')).toBe('wing-side')
    expect(normalizeChildSiteBrandCode('wing-side')).toBe('wing-side')
    expect(normalizeChildSiteBrandCode('wings-group')).toBeNull()
  })

  it('keeps exact logo alt text and tenant-specific asset paths', () => {
    expect(getSiteLogoAltText('wings-go')).toBe('WingsGo logo')
    expect(getSiteLogoAltText('wing-side')).toBe('WingSide logo')
    expect(getSiteBrandAssetURL('wings-go', 'logoPrimary')).toBe(
      '/brand/wingsgo/wingsgo-logo-primary.png',
    )
    expect(getSiteBrandAssetURL('wing-side', 'ogImage')).toBe(
      '/brand/wingsside/wingsside-og-image.png',
    )
    expect(getSiteBrandAssetURL('wings-go', 'ogImage')).not.toBe(
      getSiteBrandAssetURL('wing-side', 'ogImage'),
    )
  })

  it('fails closed for media from another tenant or without ownership', () => {
    expect(isMediaOwnedBySite(media(10), 10)).toBe(true)
    expect(isMediaOwnedBySite(media(10), 11)).toBe(false)
    expect(getSiteOwnedMedia(media(11), 10)).toBeNull()
    expect(getSiteOwnedMedia({ ...(media(10) as object), site: undefined } as never, 10)).toBeNull()
  })

  it('materializes every referenced runtime asset and preserves source checksums', () => {
    const publicRoot = resolve(process.cwd(), 'public')
    const assetKeys = ['logoPrimary', 'logoReverse', 'mark', 'favicon', 'ogImage'] as const
    const expected = {
      'wing-side': {
        sourceManifestSha256: '7f7eda0ed106ed004deeb7d525a1294d7ed40982bdec14186f401db45724867b',
      },
      'wings-go': {
        sourceManifestSha256: 'b3be0ea130f9f6a20773547eec7b045a32040e42f4def4cd1b2522f919302ed4',
      },
    } as const

    for (const [siteCode, folder] of [
      ['wings-go', 'wingsgo'],
      ['wing-side', 'wingsside'],
    ] as const) {
      const manifestURL = getSiteBrandAssetURL(siteCode, 'manifest')!
      const manifestPath = resolve(publicRoot, `.${manifestURL}`)
      expect(existsSync(manifestPath)).toBe(true)
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
        assets: Record<(typeof assetKeys)[number], string>
        provenance: {
          sha256: Record<(typeof assetKeys)[number], string>
          sourceManifestSha256: string
        }
        siteCode: string
      }

      expect(manifest.siteCode).toBe(siteCode)
      expect(manifest.provenance.sourceManifestSha256).toBe(expected[siteCode].sourceManifestSha256)

      for (const assetKey of assetKeys) {
        const assetURL = getSiteBrandAssetURL(siteCode, assetKey)!
        const assetPath = resolve(publicRoot, `.${assetURL}`)
        expect(existsSync(assetPath), `${siteCode} ${assetKey} ${assetPath}`).toBe(true)
        const assetBytes = readFileSync(assetPath)

        expect(assetURL).toBe(manifest.assets[assetKey])
        expect(assetURL).toBe(`/brand/${folder}/${assetURL.split('/').pop()}`)
        expect(createHash('sha256').update(assetBytes).digest('hex')).toBe(
          manifest.provenance.sha256[assetKey],
        )
      }
    }

    expect(getSiteBrandManifest('wings-group')).toBeNull()
  })
})
