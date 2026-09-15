import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it, vi } from 'vitest'
import type { SiteSetting } from '@/payload-types'

const mocks = vi.hoisted(() => ({
  getCurrentSite: vi.fn(),
  getCurrentSiteSettings: vi.fn(),
}))

vi.mock('@/utilities/siteContext', () => ({
  getCurrentSite: mocks.getCurrentSite,
}))

vi.mock('@/utilities/getSiteSettings', () => ({
  getCurrentSiteSettings: mocks.getCurrentSiteSettings,
}))

import { WINGSGROUP_BRAND, isWingsGroupBrandSite } from '@/wingsgroup/brand'
import { SiteSettings } from '@/collections/SiteSettings'
import { getSiteThemeTokens } from '@/utilities/siteTheme'
import { generateMeta } from '@/utilities/generateMeta'

const assets = {
  favicon: {
    file: 'wingsgroup-favicon.png',
    height: 512,
    sha256: WINGSGROUP_BRAND.assetIntegrity.favicon,
    width: 512,
  },
  logoPrimary: {
    file: 'wingsgroup-logo-primary.png',
    height: 280,
    sha256: WINGSGROUP_BRAND.assetIntegrity.logoPrimary,
    width: 373,
  },
  logoReverse: {
    file: 'wingsgroup-logo-reverse.png',
    height: 360,
    sha256: WINGSGROUP_BRAND.assetIntegrity.logoReverse,
    width: 382,
  },
  mark: {
    file: 'wingsgroup-mark.png',
    height: 447,
    sha256: WINGSGROUP_BRAND.assetIntegrity.mark,
    width: 512,
  },
  ogImage: {
    file: 'wingsgroup-og-image.png',
    height: 630,
    sha256: WINGSGROUP_BRAND.assetIntegrity.ogImage,
    width: 1200,
  },
} as const

describe('WingsGroup web brand kit contract', () => {
  it('keeps every committed PNG at the supplied checksum and tight master dimensions', () => {
    for (const asset of Object.values(assets)) {
      const filePath = path.resolve(process.cwd(), 'public/brand/wingsgroup', asset.file)
      const bytes = fs.readFileSync(filePath)
      expect(createHash('sha256').update(bytes).digest('hex'), asset.file).toBe(asset.sha256)
      expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
      expect(bytes.readUInt32BE(16), asset.file).toBe(asset.width)
      expect(bytes.readUInt32BE(20), asset.file).toBe(asset.height)
    }
  })

  it('locks the supplied tenant tokens and leaves other tenants on their own theme values', () => {
    const wingsGroupTheme = getSiteThemeTokens(
      {
        branding: {
          accentColor: '#d99a32',
          brandColor: '#302d26',
          themeKey: 'wings-group',
        },
      },
      { siteCode: 'wings-group' },
    )
    const wingsGoTheme = getSiteThemeTokens(
      {
        branding: {
          accentColor: '#123456',
          brandColor: '#654321',
          themeKey: 'wings-go',
        },
      },
      { siteCode: 'wings-go' },
    )

    expect(wingsGroupTheme.brandColor).toBe('#005090')
    expect(wingsGroupTheme.accentColor).toBe('#FDB515')
    const style = wingsGroupTheme.style as Record<string, unknown>
    expect(style['--site-brand']).toBe('#005090')
    expect(style['--site-accent']).toBe('#FDB515')
    expect(wingsGoTheme.brandColor).toBe('#654321')
    expect(wingsGoTheme.accentColor).toBe('#123456')
    expect(isWingsGroupBrandSite('wings-go')).toBe(false)
  })

  it('uses the WingsGroup OG fallback only for WingsGroup when CMS media is absent', async () => {
    mocks.getCurrentSiteSettings.mockResolvedValue({
      seo: { canonicalDomain: 'https://wingsgroup.vn' },
      siteName: 'WingsGroup',
    })
    mocks.getCurrentSite.mockResolvedValue({
      code: 'wings-group',
      defaultLocale: 'vi',
      primaryDomain: 'wingsgroup.vn',
      supportedLocales: ['vi', 'en'],
    })

    const wingsGroupMetadata = await generateMeta({
      doc: { pathname: '/', title: 'WingsGroup' },
      locale: 'vi',
      path: '/',
    })
    expect(JSON.stringify(wingsGroupMetadata.openGraph)).toContain(WINGSGROUP_BRAND.assets.ogImage)

    mocks.getCurrentSite.mockResolvedValue({
      code: 'wings-go',
      defaultLocale: 'vi',
      primaryDomain: 'wingsgo.vn',
      supportedLocales: ['vi', 'en'],
    })
    const wingsGoMetadata = await generateMeta({
      doc: { pathname: '/', title: 'WingsGo' },
      locale: 'vi',
      path: '/',
    })
    expect(JSON.stringify(wingsGoMetadata.openGraph)).not.toContain(WINGSGROUP_BRAND.assets.ogImage)
  })

  it('keeps a clean WingsGroup seed valid when static favicon fallback is used', () => {
    const brandingField = SiteSettings.fields.find(
      (field): field is Extract<(typeof SiteSettings.fields)[number], { name: string }> =>
        'name' in field && field.name === 'branding',
    )
    const faviconField =
      brandingField?.type === 'group'
        ? brandingField.fields.find(
            (field): field is Extract<(typeof brandingField.fields)[number], { name: string }> =>
              'name' in field && field.name === 'faviconImage',
          )
        : undefined

    expect(faviconField).toMatchObject({
      name: 'faviconImage',
      relationTo: 'media',
      type: 'upload',
    })
    expect(faviconField && 'required' in faviconField ? faviconField.required : undefined).not.toBe(
      true,
    )

    const cleanSeedBranding: SiteSetting['branding'] = {
      faviconImage: null,
      logoImage: null,
      themeKey: 'wings-group',
    }
    expect(cleanSeedBranding.faviconImage).toBeNull()
    expect(cleanSeedBranding.logoImage).toBeNull()

    const seedSource = fs.readFileSync(
      path.resolve(process.cwd(), 'scripts/seed-subsites.ts'),
      'utf8',
    )
    expect(seedSource).toMatch(/defaultImageID: null,\s*faviconImageID: null,\s*logoImageID: null,/)
    expect(WINGSGROUP_BRAND.assets.favicon).toBe('/brand/wingsgroup/wingsgroup-favicon.png')
    expect(WINGSGROUP_BRAND.assetContract.canvasPolicy).toBe('tight-visible-bounds')
  })

  it('records the approved brand release gate without approving locale or privacy gates', async () => {
    const register = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), '../docs/product/wingsgroup-v3-release-gates.json'),
        'utf8',
      ),
    )
    const brandGate = register.gates.find(
      (gate: { key: string }) => gate.key === 'brand-logo-tokens',
    )
    const localeGate = register.gates.find(
      (gate: { key: string }) => gate.key === 'locale-completeness',
    )
    const privacyGate = register.gates.find(
      (gate: { key: string }) => gate.key === 'privacy-consent',
    )

    expect(brandGate.state).toBe('approved')
    expect(brandGate.evidence.length).toBeGreaterThan(0)
    expect(localeGate.state).toBe('route-ready')
    expect(privacyGate.state).not.toBe('approved')
  })
})
