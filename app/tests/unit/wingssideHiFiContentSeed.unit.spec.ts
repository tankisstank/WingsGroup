import { describe, expect, it, vi } from 'vitest'

import {
  buildWingsSideHiFiContentSeedDbDryRun,
  buildWingsSideHiFiContentSeedDryRun,
  buildWingsSideHiFiContentSeedOfflineDryRun,
  fetchWingsSideHiFiPagesForLocale,
  formatWingsSideHiFiSeedReport,
  listWingsSideHiFiSeedTargets,
  previewWingsSideHiFiSeedPayload,
  withPayloadDestroy,
  WINGSSIDE_HIFI_SEED_LOCALES,
  type WingsSideHiFiSeedPayload,
} from '../../scripts/lib/wingssideHiFiContentSeed'

describe('WingSide hi-fi content seed (dry-run)', () => {
  it('targets the locked 8 hub routes', () => {
    const targets = listWingsSideHiFiSeedTargets()
    expect(targets).toHaveLength(8)
    expect(targets.map((t) => t.routeVariant).sort()).toEqual(
      ['about', 'contact', 'destinations', 'guide', 'home', 'packages', 'plan', 'styles'].sort(),
    )
  })

  it('covers EN/VI/IT/ES/PT seed locales', () => {
    expect(WINGSSIDE_HIFI_SEED_LOCALES).toEqual(['en', 'vi', 'it', 'es', 'pt'])
  })

  it('builds typed payload from existing copy without inventing opaque JSON', () => {
    const home = previewWingsSideHiFiSeedPayload('en', 'home')
    expect(home.enabled).toBe(true)
    expect(home.routeVariant).toBe('home')
    expect(home).toHaveProperty('home')
    expect(home).not.toHaveProperty('rawJson')

    const packages = previewWingsSideHiFiSeedPayload('vi', 'packages') as {
      packages?: { cards?: unknown[] }
    }
    expect(Array.isArray(packages.packages?.cards)).toBe(true)
    expect((packages.packages?.cards || []).length).toBe(3)
  })

  it('offline pure mode reports without Payload and surfaces packages validation gap', async () => {
    const report = await buildWingsSideHiFiContentSeedDryRun({
      locale: 'en',
      mode: 'offline',
      pages: [
        { id: 1, pathname: '/', slug: 'home' },
        { id: 2, pathname: '/packages', slug: 'packages' },
        { id: 3, pathname: '/plan-your-trip', slug: 'plan-your-trip' },
        { id: 4, pathname: '/destinations', slug: 'destinations' },
        { id: 5, pathname: '/styles', slug: 'styles' },
        { id: 6, pathname: '/travel-guide', slug: 'travel-guide' },
        { id: 7, pathname: '/about-us', slug: 'about-us' },
        { id: 8, pathname: '/contact-us', slug: 'contact-us' },
      ],
    })

    expect(report.dryRun).toBe(true)
    expect(report.mode).toBe('offline')
    expect(report.summary.totalTargets).toBe(8)
    const packages = report.pages.find((p) => p.routeVariant === 'packages')
    expect(packages).toBeTruthy()
    expect(packages!.hasContractGap).toBe(true)
    expect(packages!.status).toBe('would_create_fields')
    expect(packages!.validationIssues.some((msg) => msg.includes('packages_card_count'))).toBe(true)

    const text = formatWingsSideHiFiSeedReport(report)
    expect(text).toContain('DRY RUN')
    expect(text).toContain('Mode: offline')
    expect(text).toContain('Apply is disabled')
  })

  it('counts missing pages and contract gaps independently (all-locale offline, no CMS pages)', () => {
    const report = buildWingsSideHiFiContentSeedOfflineDryRun({ locale: 'all' })
    expect(report.mode).toBe('offline')
    expect(report.summary.totalTargets).toBe(40)
    // Every target lacks a CMS page.
    expect(report.summary.missingPages).toBe(40)
    expect(report.pages.every((p) => p.missingPage && p.status === 'missing_page')).toBe(true)
    // Contract gaps counted separately (packages 3/5 at minimum; other routes may also gap).
    expect(report.summary.validationGaps).toBeGreaterThan(0)
    expect(report.summary.validationGaps).toBe(
      report.pages.filter((p) => p.hasContractGap).length,
    )
    const packages = report.pages.filter((p) => p.routeVariant === 'packages')
    expect(packages).toHaveLength(5)
    for (const row of packages) {
      expect(row.missingPage).toBe(true)
      expect(row.hasContractGap).toBe(true)
      expect(row.status).toBe('missing_page')
      expect(row.validationIssues.some((msg) => msg.includes('packages_card_count'))).toBe(true)
    }
  })

  it('fetches and compares each requested locale independently in db mode', async () => {
    const localeCalls: string[] = []
    const payload: WingsSideHiFiSeedPayload = {
      destroy: vi.fn(async () => undefined),
      find: vi.fn(async (args) => {
        if (args.collection === 'sites') {
          return { docs: [{ id: 9, code: 'wings-side' }] }
        }
        localeCalls.push(String(args.locale))
        // Return a packages page only for vi so en is missing that route.
        if (args.locale === 'vi') {
          return {
            docs: [
              { id: 20, pathname: '/packages', slug: 'packages', wingsSideHiFi: { enabled: true } },
            ],
          }
        }
        return { docs: [] }
      }),
    }

    const report = await buildWingsSideHiFiContentSeedDbDryRun({
      locale: 'all',
      payload,
    })

    expect(report.mode).toBe('db')
    expect(report.localesFetched).toEqual(['en', 'vi', 'it', 'es', 'pt'])
    expect(localeCalls).toEqual(['en', 'vi', 'it', 'es', 'pt'])

    const enPackages = report.pages.find((p) => p.locale === 'en' && p.routeVariant === 'packages')
    const viPackages = report.pages.find((p) => p.locale === 'vi' && p.routeVariant === 'packages')
    expect(enPackages?.missingPage).toBe(true)
    expect(enPackages?.status).toBe('missing_page')
    expect(enPackages?.hasContractGap).toBe(true)
    expect(enPackages?.validationIssues.some((m) => /No pages document/i.test(m))).toBe(true)
    expect(enPackages?.validationIssues.some((m) => m.includes('packages_card_count'))).toBe(true)
    expect(viPackages?.pageId).toBe(20)
    expect(viPackages?.missingPage).toBe(false)
    expect(viPackages?.hasContractGap).toBe(true)
  })

  it('fetchWingsSideHiFiPagesForLocale passes the requested locale to Payload.find', async () => {
    const find = vi.fn(async (args: { collection: string; locale?: string }) => {
      if (args.collection === 'sites') return { docs: [{ id: 1 }] }
      expect(args.locale).toBe('it')
      return { docs: [{ id: 3, pathname: '/', slug: 'home' }] }
    })
    const docs = await fetchWingsSideHiFiPagesForLocale({
      locale: 'it',
      payload: { find },
    })
    expect(docs).toHaveLength(1)
    expect(find).toHaveBeenCalledTimes(2)
  })

  it('withPayloadDestroy always calls destroy after success', async () => {
    const destroy = vi.fn(async () => undefined)
    const value = await withPayloadDestroy(
      { destroy, find: async () => ({ docs: [] }) },
      async () => 42,
    )
    expect(value).toBe(42)
    expect(destroy).toHaveBeenCalledTimes(1)
  })

  it('withPayloadDestroy always calls destroy after error', async () => {
    const destroy = vi.fn(async () => undefined)
    await expect(
      withPayloadDestroy({ destroy, find: async () => ({ docs: [] }) }, async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect(destroy).toHaveBeenCalledTimes(1)
  })

  it('db mode without payload throws rather than hanging', async () => {
    await expect(
      buildWingsSideHiFiContentSeedDryRun({ mode: 'db', payload: null }),
    ).rejects.toThrow(/requires payload/i)
  })
})
