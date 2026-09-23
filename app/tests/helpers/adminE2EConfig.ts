export type AdminE2ECredentials = Readonly<{
  email: string
  password: string
}>

export type AdminE2ERoleScope = Readonly<{
  wingsCareSiteID: string
  wingsGoSiteID: string
}>

export type AdminE2EFixtureMode = 'ephemeral' | 'preprovisioned'

type AdminE2EEnvironment = Readonly<Record<string, string | undefined>>

const productionHostnames = new Set([
  'wingsgroup.vn',
  'www.wingsgroup.vn',
  'wingsgo.vn',
  'www.wingsgo.vn',
  'wingsplus.vn',
  'www.wingsplus.vn',
  'wingscare.wingsgroup.vn',
  'wingspass.wingsgroup.vn',
  'wingside.vn',
  'www.wingside.vn',
])

type DisabledAdminE2EConfig = Readonly<{
  enabled: false
  missing: readonly string[]
  reason: string
}>

type EnabledAdminE2EConfig = Readonly<{
  enabled: true
  editor: AdminE2ECredentials
  fixtureMode: AdminE2EFixtureMode
  heroPageID: string
  roleScope: AdminE2ERoleScope
  reason: ''
  siteManager: AdminE2ECredentials
  superAdmin: AdminE2ECredentials
  bootstrap?: AdminE2ECredentials
}>

export type AdminE2EConfig = DisabledAdminE2EConfig | EnabledAdminE2EConfig

const roleScopeEnvironmentKeys = [
  'US074_E2E_WINGS_GO_SITE_ID',
  'US074_E2E_WINGS_CARE_SITE_ID',
] as const

const ephemeralEnvironmentKeys = [
  'US074_E2E_BOOTSTRAP_EMAIL',
  'US074_E2E_BOOTSTRAP_PASSWORD',
] as const

const preprovisionedEnvironmentKeys = ['US074_E2E_HERO_PAGE_ID'] as const

const preprovisionedCredentialKeys = [
  'US074_E2E_SUPER_ADMIN_EMAIL',
  'US074_E2E_SUPER_ADMIN_PASSWORD',
  'US074_E2E_SITE_MANAGER_EMAIL',
  'US074_E2E_SITE_MANAGER_PASSWORD',
  'US074_E2E_EDITOR_EMAIL',
  'US074_E2E_EDITOR_PASSWORD',
] as const

const readCredential = (
  environment: AdminE2EEnvironment,
  emailKey: string,
  passwordKey: string,
): AdminE2ECredentials => ({
  email: environment[emailKey] || '',
  password: environment[passwordKey] || '',
})

/**
 * Reads the credentials and IDs needed for either an existing or ephemeral
 * non-Production staging fixture.
 *
 * This parser intentionally has no Payload/database dependency. In particular,
 * it never creates, deletes, updates, or resets a user/account.
 */
export function readAdminE2EConfig(environment: AdminE2EEnvironment = process.env): AdminE2EConfig {
  const fixtureMode: AdminE2EFixtureMode | undefined =
    environment.US074_E2E_FIXTURE_MODE === 'ephemeral'
      ? 'ephemeral'
      : environment.US074_E2E_PREPROVISIONED === 'true'
        ? 'preprovisioned'
        : undefined

  if (!fixtureMode) {
    return {
      enabled: false,
      missing: ['US074_E2E_PREPROVISIONED=true'],
      reason:
        'Admin E2E bị bỏ qua: chỉ cho phép fixture/account đã cấp sẵn hoặc ephemeral fixture được khai báo; không chạy lifecycle ngoài staging.',
    }
  }

  const configuredBaseURL = environment.PLAYWRIGHT_BASE_URL || 'http://localhost:3100'
  let targetHostname = ''
  try {
    targetHostname = new URL(configuredBaseURL).hostname.toLowerCase()
  } catch {
    return {
      enabled: false,
      missing: ['PLAYWRIGHT_BASE_URL (URL không hợp lệ)'],
      reason: 'Admin E2E bị bỏ qua: đích kiểm thử không phải URL hợp lệ.',
    }
  }

  if (productionHostnames.has(targetHostname)) {
    return {
      enabled: false,
      missing: ['PLAYWRIGHT_BASE_URL (Production target không được phép)'],
      reason: 'Admin E2E bị bỏ qua: không cho phép chạy suite có thao tác dữ liệu trên Production.',
    }
  }

  const modeKeys =
    fixtureMode === 'ephemeral'
      ? ephemeralEnvironmentKeys
      : [...preprovisionedCredentialKeys, ...preprovisionedEnvironmentKeys]
  const missing = [...roleScopeEnvironmentKeys, ...modeKeys].filter(
    (key) => !environment[key]?.trim(),
  )

  if (missing.length > 0) {
    return {
      enabled: false,
      missing,
      reason: `Admin E2E bị bỏ qua: thiếu cấu hình fixture cấp sẵn (${missing.join(', ')}).`,
    }
  }

  return {
    enabled: true,
    editor: readCredential(environment, 'US074_E2E_EDITOR_EMAIL', 'US074_E2E_EDITOR_PASSWORD'),
    fixtureMode,
    heroPageID: environment.US074_E2E_HERO_PAGE_ID || '',
    roleScope: {
      wingsCareSiteID: environment.US074_E2E_WINGS_CARE_SITE_ID || '',
      wingsGoSiteID: environment.US074_E2E_WINGS_GO_SITE_ID || '',
    },
    reason: '',
    siteManager: readCredential(
      environment,
      'US074_E2E_SITE_MANAGER_EMAIL',
      'US074_E2E_SITE_MANAGER_PASSWORD',
    ),
    superAdmin: readCredential(
      environment,
      'US074_E2E_SUPER_ADMIN_EMAIL',
      'US074_E2E_SUPER_ADMIN_PASSWORD',
    ),
    ...(fixtureMode === 'ephemeral'
      ? {
          bootstrap: readCredential(
            environment,
            'US074_E2E_BOOTSTRAP_EMAIL',
            'US074_E2E_BOOTSTRAP_PASSWORD',
          ),
        }
      : {}),
  }
}
