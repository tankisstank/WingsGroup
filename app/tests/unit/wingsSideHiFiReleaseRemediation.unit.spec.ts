import { describe, expect, it, vi } from 'vitest'

import {
  buildWingsSideHiFiReleasePlan,
  checksumWingsSideHiFiValue,
  executeWingsSideHiFiReleasePlan,
  listWingsSideHiFiSeedTargets,
  WINGSSIDE_HIFI_SEED_LOCALES,
  type WingsSideHiFiSeedPayload,
} from '../../scripts/lib/wingssideHiFiContentSeed'

const createPayload = () => {
  const pagesByLocale = new Map(
    WINGSSIDE_HIFI_SEED_LOCALES.map((locale) => [
      locale,
      listWingsSideHiFiSeedTargets().map((target, index) => ({
        id: index + 1,
        pathname: target.pathname,
        slug: target.slug,
        wingsSideHiFi: null,
      })),
    ]),
  )
  const update = vi.fn(
    async (args: Parameters<NonNullable<WingsSideHiFiSeedPayload['update']>>[0]) => {
      const pages = pagesByLocale.get(args.locale as (typeof WINGSSIDE_HIFI_SEED_LOCALES)[number])!
      const page = pages.find((candidate) => String(candidate.id) === String(args.id))!
      page.wingsSideHiFi = args.data.wingsSideHiFi as never
      return page
    },
  )
  const payload: WingsSideHiFiSeedPayload = {
    find: vi.fn(async (args) => {
      if (args.collection === 'sites') return { docs: [{ id: 3, code: 'wing-side' }] }
      if (args.collection === 'forms') {
        return { docs: [{ id: 9, site: 3, title: 'WingsSide Trip Planner' }] }
      }
      if (args.collection === 'pages') {
        return {
          docs: pagesByLocale.get(args.locale as (typeof WINGSSIDE_HIFI_SEED_LOCALES)[number])!,
        }
      }
      return { docs: [] }
    }),
    update,
  }
  return { pagesByLocale, payload, update }
}

describe('WingSide hi-fi release remediation', () => {
  it('builds an exact 8 route x 5 locale plan with resolved conversion forms', async () => {
    const { payload } = createPayload()
    const plan = await buildWingsSideHiFiReleasePlan({ payload, siteCode: 'wing-side' })

    expect(plan.entries).toHaveLength(40)
    expect(plan.pageCount).toBe(8)
    expect(plan.localeCount).toBe(5)
    expect(new Set(plan.entries.map((entry) => entry.pathname))).toEqual(
      new Set(listWingsSideHiFiSeedTargets().map((target) => target.pathname)),
    )
    expect(
      plan.entries.find((entry) => entry.locale === 'en' && entry.routeVariant === 'plan')?.after,
    ).toMatchObject({ plan: { form: 9 } })
    expect(
      plan.entries.find((entry) => entry.locale === 'en' && entry.routeVariant === 'contact')
        ?.after,
    ).toMatchObject({ contact: { form: 9 } })
  })

  it('applies, verifies, and rolls back the exact plan', async () => {
    const { pagesByLocale, payload, update } = createPayload()
    const plan = await buildWingsSideHiFiReleasePlan({ payload, siteCode: 'wing-side' })

    await expect(
      executeWingsSideHiFiReleasePlan({ direction: 'apply', payload, plan }),
    ).resolves.toEqual({ direction: 'apply', mutated: 40, verified: 40 })
    expect(update).toHaveBeenCalledTimes(40)
    expect(checksumWingsSideHiFiValue(pagesByLocale.get('en')![0]!.wingsSideHiFi)).toBe(
      plan.entries.find((entry) => entry.locale === 'en' && entry.pageId === 1)!.afterChecksum,
    )

    await expect(
      executeWingsSideHiFiReleasePlan({ direction: 'rollback', payload, plan }),
    ).resolves.toEqual({ direction: 'rollback', mutated: 40, verified: 40 })
    expect(update).toHaveBeenCalledTimes(80)
    expect(pagesByLocale.get('en')!.every((page) => page.wingsSideHiFi === null)).toBe(true)
  })

  it('refuses apply when current data drifted after the plan was created', async () => {
    const { pagesByLocale, payload, update } = createPayload()
    const plan = await buildWingsSideHiFiReleasePlan({ payload, siteCode: 'wing-side' })
    pagesByLocale.get('en')![0]!.wingsSideHiFi = { enabled: false } as never

    await expect(
      executeWingsSideHiFiReleasePlan({ direction: 'apply', payload, plan }),
    ).rejects.toThrow(/Drift detected/)
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects any site outside wing-side', async () => {
    const { payload } = createPayload()
    await expect(buildWingsSideHiFiReleasePlan({ payload, siteCode: 'wings-go' })).rejects.toThrow(
      /restricted to wing-side/,
    )
  })
})
