import { describe, expect, it } from 'vitest'

import {
  buildWingsSideCredentialsBlock,
  loadWingsSideCredentialManifest,
} from '../../scripts/lib/wingsSideCredentials'
import {
  aggregateReviewStatusTotals,
  assertCredentialsProductionEnvironment,
  assertSourceIdentityMatches,
  assertWingsSideCredentialsPlan,
  buildWingsSideCredentialsPlan,
  buildWingsSideCredentialsSourceIdentity,
  classifyWingsSideCredentialsState,
  credentialsChecksum,
  layoutChecksum,
  wingsSideCredentialsProductionExpectedItemCount,
  wingsSideCredentialsProductionLocales,
  wingsSideCredentialsProductionSiteCode,
  type CredentialHomeSnapshot,
  type CredentialMediaSnapshot,
} from '../../scripts/lib/wingsSideCredentialsProduction'

const siteID = 47

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
    const sourceIdentity = await buildWingsSideCredentialsSourceIdentity(manifest)

    expect(sourceIdentity.siteCode).toBe(wingsSideCredentialsProductionSiteCode)
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
    const sourceIdentity = await buildWingsSideCredentialsSourceIdentity(manifest)
    const plan = await buildWingsSideCredentialsPlan({
      homes: homes(),
      manifest,
      runID: 'unit-test',
      siteID,
      sourceIdentity,
    })

    assertWingsSideCredentialsPlan(plan)
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
})
