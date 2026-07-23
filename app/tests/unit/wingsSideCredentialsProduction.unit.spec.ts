import { describe, expect, it } from 'vitest'

import {
  buildWingsSideCredentialsBlock,
  loadWingsSideCredentialManifest,
} from '../../scripts/lib/wingsSideCredentials'
import {
  aggregateReviewStatusTotals,
  assertCredentialsProductionEnvironment,
  assertCredentialsSiteConfig,
  assertReleaseSourceCommit,
  assertSourceIdentityMatches,
  assertWingsSideCredentialsPlan,
  assertWingsSideCredentialsPlanMatchesSource,
  buildWingsSideCredentialsPlan,
  buildWingsSideCredentialsSourceIdentity,
  classifyWingsSideCredentialsState,
  credentialsChecksum,
  layoutChecksum,
  plannedCredentialUploadFilenames,
  wingsSideCredentialsProductionExpectedItemCount,
  wingsSideCredentialsProductionLocales,
  wingsSideCredentialsProductionSiteCode,
  type CredentialHomeSnapshot,
  type CredentialMediaSnapshot,
} from '../../scripts/lib/wingsSideCredentialsProduction'

const siteID = 47
const releaseSha = '0123456789abcdef0123456789abcdef01234567'

const homes = (): CredentialHomeSnapshot[] =>
  wingsSideCredentialsProductionLocales.map((locale) => {
    const layout = [{ blockType: 'content', text: `before-${locale}` }]
    return {
      id: `home-${locale}`,
      layout,
      layoutChecksum: layoutChecksum(layout),
      locale,
      status: 'published',
    }
  })

describe('WingsSide credentials production plan contract', () => {
  it('pins source identity, exact locale order and aggregate review totals', async () => {
    const manifest = await loadWingsSideCredentialManifest()
    const sourceIdentity = await buildWingsSideCredentialsSourceIdentity(manifest, releaseSha)

    expect(sourceIdentity.siteCode).toBe(wingsSideCredentialsProductionSiteCode)
    expect(sourceIdentity.releaseSourceCommit).toBe(releaseSha)
    expect(sourceIdentity.locales).toEqual(['vi', 'en', 'it', 'es', 'pt'])
    expect(sourceIdentity.assets).toHaveLength(wingsSideCredentialsProductionExpectedItemCount)
    expect(sourceIdentity.assets.every((asset) => /^[a-f0-9]{64}$/u.test(asset.sha256))).toBe(true)
    expect(aggregateReviewStatusTotals(manifest.items)).toEqual({
      needsReview: 15,
      verified: 105,
    })
  })

  it('classifies exact before, exact after and mixed states', async () => {
    const manifest = await loadWingsSideCredentialManifest()
    const beforeHomes = homes()
    expect(
      classifyWingsSideCredentialsState({
        homes: beforeHomes,
        manifest,
        media: [],
        siteID,
      }).state,
    ).toBe('before')

    const media: CredentialMediaSnapshot[] = manifest.items.map((item, index) => ({
      alt: item.alt,
      filename: item.file,
      id: index + 1,
      siteID,
    }))
    const mediaIDs = new Map(manifest.items.map((item, index) => [item.id, index + 1]))
    const afterHomes = beforeHomes.map((home) => ({
      ...home,
      layout: [
        ...home.layout,
        buildWingsSideCredentialsBlock({ locale: home.locale, manifest, mediaIDs }),
      ],
    }))
    expect(
      classifyWingsSideCredentialsState({
        homes: afterHomes,
        manifest,
        media,
        siteID,
      }).state,
    ).toBe('after')

    expect(
      classifyWingsSideCredentialsState({
        homes: afterHomes.slice(0, -1),
        manifest,
        media,
        siteID,
      }).state,
    ).toBe('mixed')
  })

  it('builds a deterministic rollback-capable plan and rejects source drift', async () => {
    const manifest = await loadWingsSideCredentialManifest()
    const sourceIdentity = await buildWingsSideCredentialsSourceIdentity(manifest, releaseSha)
    const plan = await buildWingsSideCredentialsPlan({
      homes: homes(),
      manifest,
      runID: 'unit-test',
      siteID,
      sourceIdentity,
    })

    assertWingsSideCredentialsPlan(plan)
    assertWingsSideCredentialsPlanMatchesSource({ manifest, plan, sourceIdentity })
    expect(plan.siteCode).toBe(wingsSideCredentialsProductionSiteCode)
    expect(plan.mediaOperations).toHaveLength(24)
    expect(plan.pageOperations.map((operation) => operation.locale)).toEqual([
      'vi',
      'en',
      'it',
      'es',
      'pt',
    ])
    expect(plan.pageOperations.every((operation) => operation.beforeLayout.length === 1)).toBe(true)
    expect(credentialsChecksum(plan)).toMatch(/^[a-f0-9]{64}$/u)

    const drifted = {
      ...sourceIdentity,
      assets: [
        { ...sourceIdentity.assets[0], sha256: '0'.repeat(64) },
        ...sourceIdentity.assets.slice(1),
      ],
    }
    expect(() => assertSourceIdentityMatches(sourceIdentity, drifted)).toThrow(
      'Credentials source identity drifted from plan',
    )
    expect(() =>
      assertWingsSideCredentialsPlanMatchesSource({
        manifest,
        plan: {
          ...plan,
          mediaOperations: [
            { ...plan.mediaOperations[0], sha256: '0'.repeat(64) },
            ...plan.mediaOperations.slice(1),
          ],
        },
        sourceIdentity,
      }),
    ).toThrow('drifted from manifest/source')
  })

  it('guards production writes to PostgreSQL with schema push disabled', () => {
    expect(() =>
      assertCredentialsProductionEnvironment({
        databaseURL: 'postgresql://example.invalid/wings',
        nodeEnv: 'production',
        payloadDbPush: 'false',
        payloadPackageName: '@payloadcms/db-postgres',
      }),
    ).not.toThrow()
    expect(() =>
      assertCredentialsProductionEnvironment({
        databaseURL: 'file:./payload.db',
        nodeEnv: 'production',
        payloadDbPush: 'false',
        payloadPackageName: '@payloadcms/db-sqlite',
      }),
    ).toThrow('PostgreSQL DATABASE_URL')
    expect(() =>
      assertCredentialsProductionEnvironment({
        databaseURL: 'postgresql://example.invalid/wings',
        nodeEnv: 'production',
        payloadDbPush: 'true',
        payloadPackageName: '@payloadcms/db-postgres',
      }),
    ).toThrow('PAYLOAD_DB_PUSH=false')
  })

  it('requires release source SHA and exact locale set with defaultLocale=en', () => {
    expect(assertReleaseSourceCommit(releaseSha)).toBe(releaseSha)
    expect(() => assertReleaseSourceCommit('8bf1890')).toThrow('40-hex commit')
    expect(() =>
      assertCredentialsSiteConfig({
        defaultLocale: 'en',
        supportedLocales: ['pt', 'vi', 'es', 'it', 'en'],
      }),
    ).not.toThrow()
    expect(() =>
      assertCredentialsSiteConfig({
        defaultLocale: 'vi',
        supportedLocales: ['vi', 'en', 'it', 'es', 'pt'],
      }),
    ).toThrow('defaultLocale=en')
  })

  it('plans exact original and generated upload filenames before create', async () => {
    const filenames = await plannedCredentialUploadFilenames('wingsside-credential-8355.jpg')

    expect(filenames).toContain('wingsside-credential-8355.jpg')
    expect(filenames).toContain('wingsside-credential-8355-300x408.jpg')
    expect(filenames).toContain('wingsside-credential-8355-500x500.jpg')
    expect(filenames).toContain('wingsside-credential-8355-1200x630.jpg')
  })
})
