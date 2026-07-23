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
})
