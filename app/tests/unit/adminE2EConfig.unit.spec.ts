import { describe, expect, it } from 'vitest'

import { readAdminE2EConfig } from '../../tests/helpers/adminE2EConfig'
import { cleanupRoleScopedUsers } from '../../tests/helpers/seedRoleUsers'
import { cleanupTestUser, seedTestUser } from '../../tests/helpers/seedUser'

describe('US-074 admin E2E fixture contract', () => {
  it('disables the suite unless the fixture is explicitly pre-provisioned', () => {
    const config = readAdminE2EConfig({})

    expect(config).toMatchObject({
      enabled: false,
      missing: ['US074_E2E_PREPROVISIONED=true'],
    })
    expect(config.reason).toContain('fixture/account đã cấp sẵn')
  })

  it('reports missing fixture variable names without exposing credential values', () => {
    const secret = 'synthetic-password-that-must-not-appear'
    const config = readAdminE2EConfig({
      US074_E2E_PREPROVISIONED: 'true',
      US074_E2E_SUPER_ADMIN_PASSWORD: secret,
    })

    expect(config.enabled).toBe(false)
    if (config.enabled) return

    expect(config.missing).toContain('US074_E2E_SUPER_ADMIN_EMAIL')
    expect(config.reason).not.toContain(secret)
  })

  it('fails closed when credentials are pointed at a Production hostname', () => {
    const config = readAdminE2EConfig({
      PLAYWRIGHT_BASE_URL: 'https://wingsgroup.vn/admin',
      US074_E2E_PREPROVISIONED: 'true',
      US074_E2E_SUPER_ADMIN_EMAIL: 'synthetic-super-admin@example.test',
      US074_E2E_SUPER_ADMIN_PASSWORD: 'synthetic-super-admin-password',
      US074_E2E_SITE_MANAGER_EMAIL: 'synthetic-site-manager@example.test',
      US074_E2E_SITE_MANAGER_PASSWORD: 'synthetic-site-manager-password',
      US074_E2E_EDITOR_EMAIL: 'synthetic-editor@example.test',
      US074_E2E_EDITOR_PASSWORD: 'synthetic-editor-password',
      US074_E2E_WINGS_GO_SITE_ID: 'wings-go-fixture',
      US074_E2E_WINGS_CARE_SITE_ID: 'wings-care-fixture',
    })

    expect(config).toMatchObject({ enabled: false })
    expect(config.reason).toContain('không cho phép chạy suite')
  })

  it('reads complete pre-provisioned credentials and scope without account lifecycle data', () => {
    const config = readAdminE2EConfig({
      US074_E2E_PREPROVISIONED: 'true',
      US074_E2E_SUPER_ADMIN_EMAIL: 'synthetic-super-admin@example.test',
      US074_E2E_SUPER_ADMIN_PASSWORD: 'synthetic-super-admin-password',
      US074_E2E_SITE_MANAGER_EMAIL: 'synthetic-site-manager@example.test',
      US074_E2E_SITE_MANAGER_PASSWORD: 'synthetic-site-manager-password',
      US074_E2E_EDITOR_EMAIL: 'synthetic-editor@example.test',
      US074_E2E_EDITOR_PASSWORD: 'synthetic-editor-password',
      US074_E2E_WINGS_GO_SITE_ID: 'wings-go-fixture',
      US074_E2E_WINGS_CARE_SITE_ID: 'wings-care-fixture',
      US074_E2E_HERO_PAGE_ID: 'hero-page-fixture',
    })

    expect(config).toEqual({
      enabled: true,
      editor: {
        email: 'synthetic-editor@example.test',
        password: 'synthetic-editor-password',
      },
      fixtureMode: 'preprovisioned',
      heroPageID: 'hero-page-fixture',
      reason: '',
      roleScope: {
        wingsCareSiteID: 'wings-care-fixture',
        wingsGoSiteID: 'wings-go-fixture',
      },
      siteManager: {
        email: 'synthetic-site-manager@example.test',
        password: 'synthetic-site-manager-password',
      },
      superAdmin: {
        email: 'synthetic-super-admin@example.test',
        password: 'synthetic-super-admin-password',
      },
    })
  })

  it('enables an ephemeral fixture only with a separate bootstrap credential', () => {
    const config = readAdminE2EConfig({
      US074_E2E_FIXTURE_MODE: 'ephemeral',
      US074_E2E_BOOTSTRAP_EMAIL: 'bootstrap@example.test',
      US074_E2E_BOOTSTRAP_PASSWORD: 'bootstrap-password',
      US074_E2E_WINGS_GO_SITE_ID: '2',
      US074_E2E_WINGS_CARE_SITE_ID: '6',
    })

    expect(config).toMatchObject({
      enabled: true,
      fixtureMode: 'ephemeral',
      bootstrap: {
        email: 'bootstrap@example.test',
        password: 'bootstrap-password',
      },
      roleScope: { wingsGoSiteID: '2', wingsCareSiteID: '6' },
    })
    expect(config).toHaveProperty('heroPageID', '')
  })

  it('fails closed if a legacy account lifecycle helper is invoked', async () => {
    await expect(seedTestUser()).rejects.toThrow(/lifecycle is disabled/u)
    await expect(cleanupTestUser()).rejects.toThrow(/cleanup is disabled/u)
    await expect(cleanupRoleScopedUsers()).rejects.toThrow(/cleanup is disabled/u)
  })
})
