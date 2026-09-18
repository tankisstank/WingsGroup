import { describe, expect, it, vi } from 'vitest'

import {
  buildAuthoringRevision,
  buildAuthoringState,
  authoringIssues,
  parseAuthoringBody,
  provisionAuthoring,
} from '@/tours/authoring'
import {
  buildTourAuthoringDepartureQuery,
  getTourAuthoringFreshness,
  getTourAuthoringSiteState,
  getTourAuthoringTourTypePresentation,
  normalizeTourAuthoringRelations,
  parseTourAuthoringPrice,
} from '@/utilities/tourAuthoring'

const user = { id: 7, role: 'site-manager', sites: [10] }
const request = { user, locale: 'vi' } as any

describe('WingsGo tour authoring', () => {
  it('parses only the bounded authoring contract', () => {
    expect(parseAuthoringBody({ action: 'publish', locale: 'vi', revision: 'a'.repeat(64), departureIDs: [1, '2'] })).toEqual({
      action: 'publish',
      departureIDs: ['1', '2'],
      locale: 'vi',
      revision: 'a'.repeat(64),
    })
    expect(() => parseAuthoringBody({ action: 'publish', locale: 'vi' })).toThrow('ít nhất một departure')
    expect(() => parseAuthoringBody({ action: 'provision', locale: 'vi', site: 10 })).toThrow('site')
  })

  it('keeps publish readiness closed until wrapper and departure prerequisites exist', () => {
    const issues = authoringIssues({ canPublish: true, departures: [], locale: 'vi', product: { id: 1, site: 10, slug: 'demo', title: 'Demo' }, wrapper: null })
    expect(issues.map((issue) => issue.code)).toEqual(['missing_wrapper', 'no_departures'])
  })

  it('scopes state to WingsGo and changes revision with locale or persisted versions', async () => {
    const payload = {
      findByID: vi.fn(async ({ collection }: { collection: string }) => {
        if (collection === 'tour-products') return { id: 1, site: 10, slug: 'demo', title: 'Demo', updatedAt: 'p1', _status: 'draft', wrapperPage: 2 }
        if (collection === 'sites') return { id: 10, code: 'wings-go' }
        return { id: 2, site: 10, pathname: '/tour/demo', updatedAt: 'w1', _status: 'draft' }
      }),
      find: vi.fn(async () => ({ docs: [{ id: 3, site: 10, tourProduct: 1, updatedAt: 'd1', _status: 'draft' }] })),
    }
    const state = await buildAuthoringState({ id: 1, locale: 'vi', payload, req: request })
    expect(state.product.site).toBe(10)
    expect(state.wrapper?.path).toBe('/tour/demo')
    expect(state.canPublish).toBe(true)
    expect(buildAuthoringRevision({ departures: [], locale: 'vi', product: { id: 1, updatedAt: 'p1' }, wrapper: null })).not.toBe(
      buildAuthoringRevision({ departures: [], locale: 'en', product: { id: 1, updatedAt: 'p1' }, wrapper: null }),
    )
    await expect(buildAuthoringState({ id: 1, locale: 'vi', payload: { ...payload, findByID: vi.fn(async ({ collection }: { collection: string }) => collection === 'sites' ? { id: 11, code: 'wings-care' } : { id: 1, site: 11, slug: 'demo', title: 'Demo' }) }, req: { ...request, user: { ...user, sites: [11] } } as any })).rejects.toMatchObject({ code: 'not_wingsgo' })
  })

  it('rolls back provision when linking the saved product fails', async () => {
    const rollback = vi.fn(async () => undefined)
    const commit = vi.fn(async () => undefined)
    const update = vi.fn(async () => { throw new Error('injected product failure') })
    const payload = {
      db: {
        packageName: '@payloadcms/db-postgres',
        beginTransaction: vi.fn(async () => 'tx'),
        sessions: { tx: { db: {} } },
        execute: vi.fn(async () => ({ rows: [] })),
        commitTransaction: commit,
        rollbackTransaction: rollback,
      },
      findByID: vi.fn(async ({ collection }: { collection: string }) => {
        if (collection === 'tour-products') return { id: 1, site: 10, slug: 'demo', title: 'Demo', summary: 'Summary', updatedAt: 'p1', _status: 'draft', wrapperPage: null }
        if (collection === 'sites') return { id: 10, code: 'wings-go' }
        throw new Error('not found')
      }),
      find: vi.fn(async ({ collection, where }: { collection: string; where: any }) => {
        if (collection !== 'pages') return { docs: [] }
        return where.and?.[0]?.pathname?.equals === '/tour' ? { docs: [{ id: 20, site: 10, pathname: '/tour', _status: 'published' }] } : { docs: [] }
      }),
      create: vi.fn(async () => ({ id: 30, site: 10, pathname: '/tour/demo', _status: 'draft' })),
      update,
    }
    const failure = await provisionAuthoring({ id: 1, locale: 'vi', payload, req: { ...request, payload } as any }).catch((error) => error)
    expect(failure).toMatchObject({ message: 'injected product failure' })
    expect(rollback).toHaveBeenCalledWith('tx')
    expect(commit).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('fails closed when the /tour hub is absent', async () => {
    const payload = {
      db: { packageName: '@payloadcms/db-postgres', beginTransaction: vi.fn(async () => 'tx'), sessions: { tx: { db: {} } }, execute: vi.fn(async () => ({ rows: [] })), commitTransaction: vi.fn(), rollbackTransaction: vi.fn() },
      findByID: vi.fn(async ({ collection }: { collection: string }) => collection === 'sites' ? { id: 10, code: 'wings-go' } : { id: 1, site: 10, slug: 'demo', title: 'Demo', wrapperPage: null }),
      find: vi.fn(async () => ({ docs: [] })),
    }
    await expect(provisionAuthoring({ id: 1, locale: 'vi', payload, req: { ...request, payload } as any })).rejects.toMatchObject({ code: 'tour_hub_required' })
  })
})

describe('Tour authoring admin helpers', () => {
  it('parses unambiguous VND prices and rejects ambiguous decimals', () => {
    expect(parseTourAuthoringPrice('12,000,000')).toBe(12000000)
    expect(parseTourAuthoringPrice('12.000.000')).toBe(12000000)
    expect(parseTourAuthoringPrice('12000000')).toBe(12000000)
    expect(parseTourAuthoringPrice('12.5')).toBeNull()
  })

  it('exposes the freshness states used by the operator table', () => {
    const now = Date.parse('2026-09-17T00:00:00.000Z')
    expect(getTourAuthoringFreshness({ expiresAt: '2026-09-18T00:00:00.000Z', verifiedAt: '2026-09-16T00:00:00.000Z' }, now)).toBe('current')
    expect(getTourAuthoringFreshness({ expiresAt: '2026-09-16T00:00:00.000Z', verifiedAt: '2026-09-16T00:00:00.000Z' }, now)).toBe('expired')
    expect(getTourAuthoringFreshness({}, now)).toBe('needs-verification')
  })

  it('fixes a single-site operator scope and keeps multi-site choice', () => {
    expect(getTourAuthoringSiteState({ isNew: true, userSiteIDs: [10] })).toMatchObject({ kind: 'fixed', siteID: 10 })
    expect(getTourAuthoringSiteState({ isNew: true, userSiteIDs: [10, 11] })).toMatchObject({ kind: 'choose', siteIDs: [10, 11] })
    expect(getTourAuthoringSiteState({ currentSite: { id: 12 }, isNew: false, userSiteIDs: [10, 11] })).toMatchObject({ kind: 'fixed', siteID: 12 })
  })

  it('hides WingSide-only presentation on WingsGo without changing stored values', () => {
    expect(getTourAuthoringTourTypePresentation('wings-go')).toEqual({ hidden: true, label: 'Phân loại tour' })
    expect(getTourAuthoringTourTypePresentation('wing-side')).toEqual({ hidden: false, label: 'Loại tour WingSide' })
  })

  it('normalizes gallery relations and scopes departure queries', () => {
    expect(normalizeTourAuthoringRelations([{ id: 1 }, 2, '3', null])).toEqual([1, 2, '3'])
    expect(buildTourAuthoringDepartureQuery(41, 10)).toContain('where%5BtourProduct%5D%5Bequals%5D=41')
    expect(buildTourAuthoringDepartureQuery(41, 10)).toContain('where%5Bsite%5D%5Bequals%5D=10')
  })
})
