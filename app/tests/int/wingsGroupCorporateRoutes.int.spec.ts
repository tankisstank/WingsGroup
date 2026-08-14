import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { Pages } from '@/collections/Pages'
import { validateWingsGroupV3Governance } from '@/collections/Pages/hooks/validateWingsGroupV3Governance'
import { WINGSGROUP_LEGAL_IDENTITY } from '@/wingsgroup/corporateRoutes'
import { seedWingsGroupCorporateRoutes } from '../../scripts/lib/wingsGroupCorporateRouteSeed'

const routeData = (overrides: Record<string, unknown> = {}) => ({
  _status: 'published',
  hero: { type: 'none' },
  layout: [],
  pathname: '/ve-wingsgroup',
  site: 1,
  title: 'Về WingsGroup',
  wingsGroupRoute: {
    archetype: 'corporate',
    managedBy: 'wingsgroup-v3',
    publication: { en: 'hidden', vi: 'approved' },
  },
  ...overrides,
})

const request = (role = 'super-admin') => ({
  payload: {
    findByID: async ({ collection, id }: { collection: string; id: number | string }) =>
      collection === 'sites' ? { code: 'wings-group', id } : { id, site: 1 },
  },
  user: { role },
})

describe('WingsGroup corporate route integration', () => {
  it('registers the Page route governance field and additive PostgreSQL migration', () => {
    expect(Pages.fields.find((field) => 'name' in field && field.name === 'wingsGroupRoute')).toBeTruthy()
    const migration = fs.readFileSync(
      path.resolve(process.cwd(), 'src/migrations/20260814_120000_wingsgroup_corporate_route_governance.ts'),
      'utf8',
    )
    expect(migration).toContain('wings_group_route_policy_approval_state')
    expect(migration).toContain('wings_group_v3_legal_identity_legal_entity_name')
    expect(migration).not.toMatch(/UPDATE\s+"pages"/i)
  })

  it('prevents ordinary editors and site managers from approving route governance', async () => {
    for (const role of ['editor', 'site-manager']) {
      await expect(
        validateWingsGroupV3Governance({
          data: routeData(),
          originalDoc: { ...routeData(), wingsGroupRoute: { ...routeData().wingsGroupRoute, publication: { en: 'hidden', vi: 'pending' } } },
          req: request(role),
        } as never),
      ).rejects.toThrow(/super-admin/)
    }
  })

  it('rejects policy publication until complete trusted approval is present', async () => {
    await expect(
      validateWingsGroupV3Governance({
        data: routeData({ pathname: '/chinh-sach-bao-mat', wingsGroupRoute: { archetype: 'policy', managedBy: 'wingsgroup-v3', policy: { approvalState: 'pending', legalEntity: WINGSGROUP_LEGAL_IDENTITY.legalEntityName }, publication: { en: 'hidden', vi: 'approved' } } }),
        originalDoc: {},
        req: request(),
      } as never),
    ).rejects.toThrow(/publication gate/)
  })

  it('accepts a governed VI corporate route and enforces same-site forms', async () => {
    await expect(
      validateWingsGroupV3Governance({ data: routeData(), originalDoc: {}, req: request() } as never),
    ).resolves.toBeTruthy()

    await expect(
      validateWingsGroupV3Governance({
        data: routeData({ layout: [{ blockType: 'formBlock', form: 7 }] }),
        originalDoc: {},
        req: {
          ...request(),
          payload: {
            findByID: async ({ collection, id }: { collection: string; id: number | string }) =>
              collection === 'sites' ? { code: 'wings-group', id } : { id, site: 2 },
          },
        },
      } as never),
    ).rejects.toThrow(/tenant khác/)
  })

  it('rejects internal implementation copy and cross-tenant public links', async () => {
    await expect(
      validateWingsGroupV3Governance({ data: routeData({ title: 'Legacy root site' }), originalDoc: {}, req: request() } as never),
    ).rejects.toThrow(/thuật ngữ/)
    await expect(
      validateWingsGroupV3Governance({ data: routeData({ layout: [{ blockType: 'cta', links: [{ link: { type: 'custom', url: '/wingsgo' } }] }] }), originalDoc: {}, req: request() } as never),
    ).rejects.toThrow(/site scope/)
  })

  it('reconciles the same technical inventory twice without duplicate Page rows', async () => {
    const pages: Array<Record<string, unknown> & { id: number; pathname: string }> = []
    const settings = {
      id: 20,
      wingsGroupV3: {
        consultationChannels: [{ key: 'zalo', state: 'unconfigured' }],
      },
    }
    const form = {
      fields: [
        { blockType: 'text', name: 'full-name' },
        { blockType: 'textarea', name: 'message' },
      ],
      id: 30,
      site: 1,
      title: 'Liên hệ WingsGroup',
    }
    const payload = {
      create: async ({ collection, data }: { collection: string; data: Record<string, unknown> }) => {
        if (collection !== 'pages') throw new Error(`Unexpected create: ${collection}`)
        const page = { ...data, id: pages.length + 1 } as (typeof pages)[number]
        pages.push(page)
        return page
      },
      find: async ({ collection }: { collection: string }) => {
        if (collection === 'sites') return { docs: [{ code: 'wings-group', id: 1 }] }
        if (collection === 'site-settings') return { docs: [settings] }
        if (collection === 'forms') return { docs: [form] }
        if (collection === 'pages') return { docs: pages }
        throw new Error(`Unexpected find: ${collection}`)
      },
      update: async ({ collection, data, id }: { collection: string; data: Record<string, unknown>; id: number }) => {
        if (collection === 'site-settings') return settings
        const page = pages.find((candidate) => candidate.id === id)
        if (!page) throw new Error(`Page ${id} missing`)
        Object.assign(page, data)
        return page
      },
    }
    const req = { user: { role: 'super-admin' } }

    const first = await seedWingsGroupCorporateRoutes({ payload: payload as never, req: req as never })
    const second = await seedWingsGroupCorporateRoutes({ payload: payload as never, req: req as never })

    expect(first.created).toHaveLength(9)
    expect(second.created).toEqual([])
    expect(second.updated).toHaveLength(9)
    expect(pages.map(({ pathname }) => pathname).sort()).toEqual(
      [
        '/',
        '/chinh-sach-bao-mat',
        '/chinh-sach-thanh-toan',
        '/dieu-khoan-su-dung',
        '/lien-he',
        '/nang-luc-dich-vu',
        '/tin-cay-va-phap-ly',
        '/tin-tuc',
        '/ve-wingsgroup',
      ],
    )
  })
})
