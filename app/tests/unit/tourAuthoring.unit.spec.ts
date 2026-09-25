import { describe, expect, it, vi } from 'vitest'
import { Forbidden, ValidationError } from 'payload'

import {
  buildAuthoringRevision,
  buildAuthoringState,
  authoringIssues,
  ensurePublishedTourRedirect,
  getWrapperHealth,
  normalizeAuthoringError,
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
  it('returns actionable, sanitized errors for wrapper validation and permissions', () => {
    const validationError = new ValidationError({
      collection: 'pages',
      errors: [
        { message: 'Sensitive validator detail', path: 'layout.0.title' },
        { message: 'Invalid path', path: 'pathname' },
      ],
    })
    const normalized = normalizeAuthoringError(validationError)
    expect(normalized).toMatchObject({
      code: 'wrapper_validation_failed',
      message: 'Không thể tạo trang tour vì dữ liệu chưa hợp lệ. Kiểm tra: bố cục nội dung, đường dẫn.',
      status: 422,
    })
    expect((normalized as Error).message).not.toContain('Sensitive')
    expect(normalizeAuthoringError(new Forbidden())).toMatchObject({
      code: 'wrapper_forbidden',
      status: 403,
    })
  })

  it('parses only the bounded authoring contract', () => {
    expect(parseAuthoringBody({ action: 'publish', locale: 'vi', revision: 'a'.repeat(64), departureIDs: [1, '2'] })).toEqual({
      action: 'publish',
      departureIDs: ['1', '2'],
      locale: 'vi',
      revision: 'a'.repeat(64),
    })
    expect(() => parseAuthoringBody({ action: 'publish', locale: 'vi' })).toThrow('ít nhất một departure')
    expect(() => parseAuthoringBody({ action: 'provision', locale: 'vi', site: 10 })).toThrow('site')
    expect(parseAuthoringBody({ action: 'relink', locale: 'vi', wrapperID: 314 })).toMatchObject({ action: 'relink', wrapperID: 314 })
    expect(() => parseAuthoringBody({ action: 'relink', locale: 'vi' })).toThrow('wrapperID')
  })

  it('classifies wrapper health before allowing a relink or publish', () => {
    const product = { id: 112, site: 2, slug: 'demo' }
    expect(getWrapperHealth({ linkedProductIDs: [112], product, siteID: 2, wrapper: { id: 314, site: 2, pathname: '/tour/demo' } })).toBe('valid')
    expect(getWrapperHealth({ linkedProductIDs: [112], product, siteID: 2, wrapper: { id: 314, site: 2, pathname: '/tour/old' } })).toBe('invalid_path')
    expect(getWrapperHealth({ linkedProductIDs: [112], product, siteID: 2, wrapper: { id: 314, site: 3, pathname: '/tour/demo' } })).toBe('invalid_site')
    expect(getWrapperHealth({ linkedProductIDs: [], product, siteID: 2, wrapper: { id: 314, site: 2, pathname: '/tour/demo' } })).toBe('orphan')
    expect(getWrapperHealth({ linkedProductIDs: [112, 113], product, siteID: 2, wrapper: { id: 314, site: 2, pathname: '/tour/demo' } })).toBe('shared')
  })

  it('keeps publish readiness closed until wrapper and departure prerequisites exist', () => {
    const issues = authoringIssues({ canPublish: true, departures: [], locale: 'vi', product: { id: 1, site: 10, slug: 'demo', title: 'Demo' }, wrapper: null })
    expect(issues.map((issue) => issue.code)).toEqual(['missing_wrapper', 'no_departures'])
  })

  it('creates one permanent redirect for a changed published tour path', async () => {
    const create = vi.fn(async () => ({ id: 9 }))
    const payload = {
      find: vi.fn(async () => ({ docs: [] })),
      create,
    }

    await expect(ensurePublishedTourRedirect({ from: '/tour/old', payload, req: request, to: '/tour/new' })).resolves.toBe(true)
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'redirects',
      data: { from: '/tour/old', to: { type: 'custom', url: '/tour/new' }, type: '301' },
    }))
  })

  it('fails closed when the old path already redirects elsewhere', async () => {
    const create = vi.fn()
    const payload = {
      find: vi.fn(async () => ({ docs: [{ id: 10, to: { url: '/tour/another' }, type: '301' }] })),
      create,
    }

    await expect(ensurePublishedTourRedirect({ from: '/tour/old', payload, req: request, to: '/tour/new' })).rejects.toMatchObject({
      code: 'redirect_conflict',
      status: 409,
    })
    expect(create).not.toHaveBeenCalled()
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

  it('provisions from the registered tour preset and classifies page validation failures', async () => {
    const rollback = vi.fn(async () => undefined)
    const pageValidationError = new ValidationError({
      collection: 'pages',
      errors: [{ message: 'Invalid page data', path: 'layout.0.title' }],
    })
    const payload = {
      db: {
        packageName: '@payloadcms/db-postgres',
        beginTransaction: vi.fn(async () => 'tx'),
        sessions: { tx: { db: {} } },
        execute: vi.fn(async () => ({ rows: [] })),
        commitTransaction: vi.fn(async () => undefined),
        rollbackTransaction: rollback,
      },
      findByID: vi.fn(async ({ collection }: { collection: string }) => {
        if (collection === 'sites') return { id: 10, code: 'wings-go' }
        return { id: 1, site: 10, slug: 'demo', title: 'Demo', summary: 'Summary', updatedAt: 'p1', _status: 'draft', wrapperPage: null }
      }),
      find: vi.fn(async ({ where }: { where: { and?: Array<{ pathname?: { equals?: string } }> } }) =>
        where.and?.[0]?.pathname?.equals === '/tour'
          ? { docs: [{ id: 20, site: 10, pathname: '/tour', _status: 'published' }] }
          : { docs: [] },
      ),
      create: vi.fn(async (_args: { data: Record<string, unknown> }) => { throw pageValidationError }),
    }

    const failure = await provisionAuthoring({ id: 1, locale: 'vi', payload, req: { ...request, payload } as never }).catch((error) => error)
    const pageData = payload.create.mock.calls[0][0].data

    expect(pageData).toMatchObject({
      _status: 'draft',
      layoutPresetKey: 'tour-conversion',
      parentPage: 20,
      site: 10,
      slug: 'demo',
      title: 'Demo',
    })
    expect(pageData.layout).toHaveLength(5)
    expect(pageData.hero).toBeTruthy()
    expect(normalizeAuthoringError(failure)).toMatchObject({
      code: 'wrapper_validation_failed',
      message: 'Không thể tạo trang tour vì dữ liệu chưa hợp lệ. Kiểm tra: bố cục nội dung.',
      status: 422,
    })
    expect(rollback).toHaveBeenCalledWith('tx')
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
