import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { siteAliasToCodeMap } from '@/utilities/sitePaths'
import { getSiteThemeTokens } from '@/utilities/siteTheme'

const appFile = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Wingside tenant identity contract', () => {
  it('keeps public identity, technical code, local alias, and theme key distinct', () => {
    expect(siteAliasToCodeMap.wingsside).toBe('wing-side')
    expect(`/${Object.keys(siteAliasToCodeMap).find((alias) => alias === 'wingsside')}`).toBe(
      '/wingsside',
    )

    const theme = getSiteThemeTokens(
      { branding: { themeKey: 'wings-side' } },
      { siteCode: 'wing-side' },
    )

    expect(theme.themeKey).toBe('wings-side')
  })

  it('seeds the Wingside tenant with the canonical public and technical identity', () => {
    const seed = appFile('scripts/seed-subsites.ts')
    const tenantSeedStart = seed.indexOf("code: 'wing-side'")
    const tenantSeedEnd = seed.indexOf('\n  },', tenantSeedStart)
    const tenantSeed = seed.slice(tenantSeedStart, tenantSeedEnd)

    expect(tenantSeedStart).toBeGreaterThanOrEqual(0)
    expect(tenantSeed).toContain("domain: 'wingside.vn'")
    expect(tenantSeed).toContain("name: 'wingside.vn'")
    expect(seed).not.toMatch(/code:\s*'wings-side'/)
    expect(seed).toContain("defaultTitle: 'wingside.vn'")
  })

  it('migrates localized page titles tenant-safely and provides a symmetric rollback', () => {
    const migration = appFile('src/migrations/20260722_230000_wing_side_tenant_identity.ts')

    expect(migration).toContain('UPDATE "pages_locales" AS pl')
    expect(migration).toContain('SET "title" = \'wingside.vn\'')
    expect(migration).toContain('SET "title" = \'WingsSide\'')
    expect(migration).toContain('regexp_replace')
    expect(migration).toContain('p."site_id"')
    expect(migration).toContain("WHERE \"code\" IN ('wings-side', 'wing-side')")
    expect(migration).toContain('WHERE "code" = \'wing-side\'')
    expect(
      migration.indexOf('-- Reverse pages_locales before site code changes back'),
    ).toBeLessThan(migration.lastIndexOf('SET "code" = \'wings-side\''))
  })

  it('locks the release tenant to the WingsSide theme and public SEO identity', () => {
    const migration = appFile('src/migrations/20260723_170000_wing_side_release_identity.ts')

    expect(migration).toContain('"branding_theme_key" = \'wings-side\'')
    expect(migration).toContain('"seo_default_title" = \'wingside.vn\'')
    expect(migration).toContain('s."code" = \'wing-side\'')
    expect(migration).toContain('SET "branding_theme_key" = \'custom\'')
    expect(migration).not.toContain('s."code" IN')
  })

  it('repairs thin style metadata in CMS with a tenant-scoped rollback', () => {
    const migration = appFile('src/migrations/20260723_183000_wing_side_style_seo_copy.ts')

    expect(migration).toContain('s."code" = \'wing-side\'')
    expect(migration).toContain("'wings-side-adventure'")
    expect(migration).toContain("'wings-side-luxury'")
    expect(migration).toContain('length(trim(coalesce(pl."meta_description", \'\'))) < 50')
    expect(migration).toContain('length(trim(pl."meta_description")) - length(suffixes.suffix)')
  })

  it('normalizes the public contact and cross-site links without broad replacement', () => {
    const migration = appFile('src/migrations/20260723_190000_wing_side_public_contact_identity.ts')

    expect(migration).toContain('"support_email" = \'hello@wingside.vn\'')
    expect(migration).toContain('"support_email" = \'hello@wingsside.vn\'')
    expect(migration).toContain('"title" = \'WingsSide\'')
    expect(migration).toContain('"link_url" = \'https://wingsside.vn\'')
    expect(migration).toContain('"link_url" = \'https://wingside.vn\'')
    expect(migration).toContain(
      'WHERE "site_id" = (SELECT "id" FROM "sites" WHERE "code" = \'wing-side\')',
    )
  })

  it('pins wing-side supported locales normalization as tenant-scoped and fail-closed', () => {
    const migration = appFile('src/migrations/20260724_110000_wing_side_supported_locales.ts')

    expect(migration).toContain('WHERE "code" = \'wing-side\'')
    expect(migration).toContain("locale_signature = 'en@1,vi@2,it@3,es@4,pt@5'")
    expect(migration).toContain("locale_signature <> 'en@1,vi@2'")
    expect(migration).toContain("locale_signature <> 'en@1,vi@2,it@3,es@4,pt@5'")
    expect(migration).toContain('expected default_locale=en')
    expect(migration).not.toContain('UPDATE "sites"')
    expect(migration).not.toContain('UPDATE "sites_supported_locales"')
    expect(migration).not.toContain('DELETE FROM "sites"')
  })
})
