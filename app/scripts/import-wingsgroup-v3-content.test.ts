import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

import {
  assertProductionContentEnvironment,
  applyWingsGroupV3Content,
  buildWingsGroupV3ContentContract,
  buildWingsGroupV3ContentPlan,
  parseWingsGroupV3ContentCommand,
  productionContentConfirmation,
  resolveWingsGroupV3ContentContract,
  verifyWingsGroupV3ContentInventory,
  WINGSGROUP_V3_CONTENT_CONFIRMATION_ENV,
  WINGSGROUP_V3_CONTENT_FORM_KEY,
  WINGSGROUP_V3_CONTENT_OPERATION_ENV,
  WINGSGROUP_V3_CONTENT_PLAN_ENV,
  WINGSGROUP_V3_CONTENT_SITE_ENV,
} from './import-wingsgroup-v3-content'
import type { WingsGroupV3MediaPlan } from './lib/wingsGroupV3MediaPlan'
import { WINGSGROUP_SITE_CODE } from '../src/wingsgroup/corporateRoutes'

const releaseSha = 'a'.repeat(40)
const operationID = 'op-20260824-wingsgroup-v3-content'
const planSha = 'b'.repeat(64)

const mediaPlan = (): WingsGroupV3MediaPlan => ({
  archiveSha256: 'c'.repeat(64),
  attachmentId: 'wingsgroup-v3-test-fixture',
  errors: [],
  planChecksum: planSha,
  planned: 13,
  records: Array.from({ length: 13 }, (_, index) => ({
    alt: { en: `English alt ${index}`, vi: `Mô tả tiếng Việt ${index}` },
    derivatives: [640, 960, 1440].flatMap((width) =>
      (['webp', 'avif'] as const).map((format) => ({
        file: `source-${index}-${width}.${format}`,
        format,
        width,
      })),
    ),
    focal: { x: 50, y: 50 },
    importFilename: `wg-v3-${index}-source-${index}.png`,
    role: `role-${index}`,
    sourceFile: `source-${index}.png`,
    sourceFileSha256: `${String(index).padStart(2, '0')}${'d'.repeat(62)}`,
    sourceIdentity: `wingsgroup-v3-test-fixture:${String(index).padStart(2, '0')}${'d'.repeat(62)}`,
    sourceDimensions: { height: 1024, width: 1536 },
    usageScope: 'editorial-service',
  })),
  siteCode: WINGSGROUP_SITE_CODE,
})

const collectMediaNames = (value: unknown, result = new Set<string>()): Set<string> => {
  if (Array.isArray(value)) value.forEach((item) => collectMediaNames(item, result))
  else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectMediaNames(item, result))
  } else if (typeof value === 'string' && value.endsWith('.png')) {
    result.add(value)
  }
  return result
}

const validEnvironment = (overrides: Record<string, string | undefined> = {}) => ({
  DATABASE_URL: 'postgresql://operator:secret@postgres/wingsgroup',
  NODE_ENV: 'production',
  PAYLOAD_DB_PUSH: 'false',
  WINGSTRAVEL_RELEASE_SHA: releaseSha,
  [WINGSGROUP_V3_CONTENT_CONFIRMATION_ENV]: productionContentConfirmation(operationID, releaseSha),
  [WINGSGROUP_V3_CONTENT_OPERATION_ENV]: operationID,
  [WINGSGROUP_V3_CONTENT_PLAN_ENV]: planSha,
  [WINGSGROUP_V3_CONTENT_SITE_ENV]: WINGSGROUP_SITE_CODE,
  ...overrides,
})

describe('WingsGroup v3 production content importer contract', () => {
  it('parses only immutable plan/apply/verify phases and requires the manifest fixture inputs', () => {
    expect(
      parseWingsGroupV3ContentCommand([
        'plan',
        '--manifest=docs/product/wingsgroup-v3-media-manifest.json',
        '--assets-dir=/srv/wingsgroup/assets',
      ]),
    ).toMatchObject({ phase: 'plan', siteCode: undefined })
    expect(() =>
      parseWingsGroupV3ContentCommand(['apply', '--manifest=manifest.json', '--assets-dir=assets']),
    ).toThrow(/only plan, production-apply, and production-verify/)
    expect(() => parseWingsGroupV3ContentCommand(['plan', '--manifest=manifest.json'])).toThrow(
      /--assets-dir is required/,
    )
  })

  it('binds production operation, release, target, database, and apply confirmation', () => {
    expect(
      assertProductionContentEnvironment({
        args: {
          assetsDirectory: '/srv/assets',
          confirm: productionContentConfirmation(operationID, releaseSha),
          manifestPath: '/srv/manifest.json',
          operationID,
          planSha256: planSha,
          releaseSha,
          siteCode: WINGSGROUP_SITE_CODE,
        },
        environment: validEnvironment(),
        phase: 'production-apply',
      }),
    ).toMatchObject({ databaseName: 'wingsgroup', operationID, releaseSha })
    expect(() =>
      assertProductionContentEnvironment({
        args: {
          assetsDirectory: '/srv/assets',
          confirm: 'wrong',
          manifestPath: '/srv/manifest.json',
          operationID,
          planSha256: planSha,
          releaseSha,
          siteCode: WINGSGROUP_SITE_CODE,
        },
        environment: validEnvironment(),
        phase: 'production-apply',
      }),
    ).toThrow(/operation\/release-bound confirmation/)
    expect(() =>
      assertProductionContentEnvironment({
        args: {
          assetsDirectory: '/srv/assets',
          manifestPath: '/srv/manifest.json',
          operationID,
          planSha256: planSha,
          releaseSha,
          siteCode: WINGSGROUP_SITE_CODE,
        },
        environment: validEnvironment({
          DATABASE_URL: 'postgresql://operator@other-host/wingsgroup',
        }),
        phase: 'plan',
      }),
    ).toThrow(/trusted PostgreSQL target/)
  })

  it('produces a deterministic no-write plan for exactly 13 sources and 78 derivatives', () => {
    const first = buildWingsGroupV3ContentPlan({ mediaPlan: mediaPlan() })
    const second = buildWingsGroupV3ContentPlan({ mediaPlan: mediaPlan() })
    expect(first).toEqual(second)
    expect(first).toMatchObject({
      derivativeCount: 78,
      mediaCount: 13,
      mediaPlanChecksum: planSha,
      siteCode: WINGSGROUP_SITE_CODE,
    })
    expect(first.routes).toEqual(
      expect.arrayContaining(['/', '/ve-wingsgroup', '/he-sinh-thai', '/nang-luc-dich-vu']),
    )
    expect(() =>
      buildWingsGroupV3ContentPlan({
        mediaPlan: { ...mediaPlan(), records: mediaPlan().records.slice(0, 12), planned: 12 },
      }),
    ).toThrow(/exactly 13/)
  })

  it('defines bilingual full-home composition, governed fallback channels, and fail-closed proof/policy routes', () => {
    const contract = buildWingsGroupV3ContentContract()
    expect(contract.pages).toHaveLength(10)
    expect(contract.pages[0].locales.vi.layout.map((block) => block.blockType)).toEqual([
      'wingsGroupEcosystem',
      'infoStrip',
      'wingsGroupProofArchive',
      'archive',
      'formBlock',
    ])
    const contact = contract.pages.find((page) => page.path === '/lien-he')
    expect(contact?.locales.vi.layout.at(-1)).toMatchObject({
      blockType: 'formBlock',
      form: WINGSGROUP_V3_CONTENT_FORM_KEY,
    })
    expect(contact?.locales.en.layout.at(-1)).toMatchObject({
      blockType: 'formBlock',
      form: WINGSGROUP_V3_CONTENT_FORM_KEY,
    })
    expect(contract.pages[0].locales.en.title).toBe('WingsGroup')
    expect(contract.pages.find((page) => page.path === '/dieu-khoan-su-dung')?.publication).toEqual(
      {
        en: 'hidden',
        vi: 'pending',
      },
    )
    expect(contract.settings.wingsGroupV3.consultationChannels).toEqual([
      { key: 'zalo', state: 'unconfigured' },
      { key: 'whatsapp', state: 'unconfigured' },
      { key: 'messenger', state: 'unconfigured' },
    ])
    expect(contract.form.fields).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'consent', required: true })]),
    )
    expect(collectMediaNames(contract)).toEqual(
      new Set([
        'wingsgroup-hero-discovery-guide.png',
        'wingsgroup-hero-private-consultation.png',
        'wingsgroup-hero-airport-welcome.png',
        'wingsgroup-hero-partner-meeting.png',
        'wingsgroup-ecosystem-hero.png',
        'wingsgroup-vietnam-discovery.png',
        'wingsgroup-airport-service.png',
        'wingsgroup-corporate-partnership.png',
        'wingsgroup-travel-support.png',
        'wingsgroup-journey-consultation.png',
      ]),
    )
  })

  it('resolves only site-scoped media and form relations before apply', () => {
    const contract = buildWingsGroupV3ContentContract()
    const mediaIDs = new Map(
      [...collectMediaNames(contract)].map((name, index) => [name, index + 100]),
    )
    const resolved = resolveWingsGroupV3ContentContract({ contract, formID: 77, mediaIDs })
    const serialized = JSON.stringify(resolved.pages)
    expect(serialized).not.toContain(WINGSGROUP_V3_CONTENT_FORM_KEY)
    expect(serialized).not.toContain('wingsgroup-hero-')
    expect(serialized).toContain('"form":77')
  })

  it('keeps fixture-only locale SQL out of the production importer and media runtime', async () => {
    const [contentSource, mediaSource] = await Promise.all([
      readFile(new URL('./import-wingsgroup-v3-content.ts', import.meta.url), 'utf8'),
      readFile(new URL('./import-wingsgroup-v3-media.ts', import.meta.url), 'utf8'),
    ])
    expect(contentSource).not.toContain('media_locales')
    expect(contentSource).not.toContain('payload.db.drizzle')
    expect(mediaSource).not.toContain('media_locales')
    expect(mediaSource).not.toContain('payload.db.drizzle')
  })

  it('verifies an idempotent applied inventory with exact bilingual routes and form contract', () => {
    const contract = buildWingsGroupV3ContentContract()
    const mediaIDs = new Map(
      [...collectMediaNames(contract)].map((name, index) => [name, index + 100]),
    )
    const resolved = resolveWingsGroupV3ContentContract({ contract, formID: 77, mediaIDs })
    const pages = {
      en: new Map<string, Record<string, unknown>>(),
      vi: new Map<string, Record<string, unknown>>(),
    }
    for (const route of resolved.pages) {
      for (const locale of ['en', 'vi'] as const) {
        const localized = route.locales[locale]
        pages[locale].set(route.path, {
          _status: route.publication[locale] === 'approved' ? 'published' : 'draft',
          layout: localized.layout,
          pathname: route.path,
          site: 1,
          title: localized.title,
          wingsGroupRoute: route.governance,
        })
      }
    }
    const persistedSettings = {
      ...contract.settings,
      wingsGroupV3: {
        ...contract.settings.wingsGroupV3,
        consultationChannels: contract.settings.wingsGroupV3.consultationChannels.map(
          (channel, index) => ({
            ...channel,
            id: `generated-row-${index}`,
            owner: null,
            sla: null,
            trackingReference: null,
            url: null,
          }),
        ),
      },
    }
    const persistedGovernance = {
      ...resolved.pages[0].governance,
      policy: {
        approvalReference: null,
        approvalState: 'pending',
        consentEvidenceReference: null,
        consentVersion: null,
        dataSubjectContact: null,
        dataSubjectRightsEvidence: null,
        dataSubjectRightsStatement: null,
        effectiveDate: null,
        legalEntity: null,
        legalOwner: null,
        policyVersion: null,
        privacyApprovalReference: null,
        retentionMonths: null,
        scope: null,
        validationMarker: null,
        version: null,
      },
    }
    pages.vi.get('/')!.wingsGroupRoute = persistedGovernance
    const privacyPage = pages.vi.get('/chinh-sach-bao-mat')!
    const privacyGovernance = privacyPage.wingsGroupRoute as Record<string, unknown>
    privacyPage.wingsGroupRoute = {
      ...privacyGovernance,
      policy: {
        ...(privacyGovernance.policy as Record<string, unknown>),
        effectiveDate: '2026-08-24T00:00:00.000Z',
      },
    }
    expect(
      verifyWingsGroupV3ContentInventory({
        contract: resolved,
        formID: 77,
        inventory: {
          form: { fields: contract.form.fields, id: 77, site: 1, title: contract.form.title },
          mediaIDs,
          pages,
          settings: persistedSettings,
          site: { code: WINGSGROUP_SITE_CODE, id: 1 },
        },
      }),
    ).toEqual({ publishedLocales: 16, publishedRoutes: 8, routeCount: 10 })
  })

  it('applies the same scoped contract idempotently without changing the target tenant', async () => {
    const contract = buildWingsGroupV3ContentContract()
    const mediaIDs = new Map(
      [...collectMediaNames(contract)].map((name, index) => [name, index + 100]),
    )
    const writes: string[] = []
    const localeWrites: Array<{ locale: string; request: Record<string, unknown> }> = []
    const payload = {
      create: async (args: unknown) => {
        const input = args as Record<string, unknown>
        writes.push(`create:${String(input.collection)}`)
        return {
          ...(input.data as Record<string, unknown>),
          id: input.collection === 'forms' ? 77 : writes.length,
        }
      },
      update: async (args: unknown) => {
        const input = args as Record<string, unknown>
        writes.push(`update:${String(input.collection)}`)
        if (input.collection === 'pages') {
          localeWrites.push({
            locale: String(input.locale),
            request: input.req as Record<string, unknown>,
          })
        }
        return { ...(input.data as Record<string, unknown>), id: input.id }
      },
    }
    const inventory = {
      form: { fields: contract.form.fields, id: 77, site: 1, title: contract.form.title },
      mediaIDs,
      pages: { en: new Map(), vi: new Map() },
      settings: { ...contract.settings, id: 11 },
      site: { code: WINGSGROUP_SITE_CODE, id: 1 },
    }
    const first = await applyWingsGroupV3Content({
      contract,
      inventory,
      payload: payload as never,
      req: { payload } as never,
    })
    const firstWriteCount = writes.length
    const second = await applyWingsGroupV3Content({
      contract,
      inventory,
      payload: payload as never,
      req: { payload } as never,
    })
    expect(first.writes).toHaveLength(20)
    expect(second.writes).toEqual(first.writes)
    expect(writes.length).toBe(firstWriteCount + 23)
    expect(localeWrites).toHaveLength(40)
    expect(localeWrites.slice(0, 2).map(({ locale }) => locale)).toEqual(['vi', 'en'])
    expect(localeWrites.every(({ locale, request }) => request.locale === locale)).toBe(true)
    expect(localeWrites.every(({ request }) => request.fallbackLocale === false)).toBe(true)
    expect(localeWrites.every(({ request }) => request.payloadDataLoader === undefined)).toBe(true)
    expect(inventory.site).toEqual({ code: WINGSGROUP_SITE_CODE, id: 1 })
  })
})
