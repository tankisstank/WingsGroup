import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { Pages } from '@/collections/Pages'
import { validateWingsGroupV3Governance } from '@/collections/Pages/hooks/validateWingsGroupV3Governance'
import { validateWingsGroupV3Settings } from '@/fields/wingsGroupV3'
import {
  WINGSGROUP_LEGAL_IDENTITY,
  WINGSGROUP_POLICY_VALIDATION_MARKER,
} from '@/wingsgroup/corporateRoutes'
import {
  WINGSGROUP_CONSENT_VERSION,
  WINGSGROUP_DATA_CONTACT,
  WINGSGROUP_LEAD_RETENTION_MONTHS,
  WINGSGROUP_POLICY_ROUTES,
  WINGSGROUP_PRIVACY_VERSION,
} from '@/lead-capture/wingsGroupV3'
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

const trustedSettings = ({
  englishPublicationState = 'hidden',
  privacyApproved = false,
}: {
  englishPublicationState?: 'approved' | 'hidden' | 'route-ready'
  privacyApproved?: boolean
} = {}) => ({
  id: 20,
  site: 1,
  wingsGroupV3: {
    enabled: true,
    englishPublicationState,
    legalIdentity: WINGSGROUP_LEGAL_IDENTITY,
    privacy: {
      approvalReference: privacyApproved ? 'privacy-approval-2026-08-14' : null,
      approvalState: privacyApproved ? 'approved' : 'pending',
      consentEvidenceReference: privacyApproved ? 'consent-evidence-2026-08-14' : null,
      consentRequired: true,
      consentVersion: WINGSGROUP_CONSENT_VERSION,
      dataSubjectContact: WINGSGROUP_DATA_CONTACT,
      dataSubjectRightsEvidence: privacyApproved ? 'rights-evidence-2026-08-14' : null,
      dataSubjectRightsStatement: privacyApproved ? 'Legal-owner supplied rights statement.' : null,
      interBranchTransferAllowed: true,
      policyRouteEn: WINGSGROUP_POLICY_ROUTES.en,
      policyRouteVi: WINGSGROUP_POLICY_ROUTES.vi,
      policyVersion: WINGSGROUP_PRIVACY_VERSION,
      retentionMonths: WINGSGROUP_LEAD_RETENTION_MONTHS,
    },
  },
})

const approvedPolicy = (settings = trustedSettings({ privacyApproved: true })) => ({
  approvalReference: 'policy-approval-2026-08-14',
  approvalState: 'approved',
  consentEvidenceReference: settings.wingsGroupV3.privacy.consentEvidenceReference,
  consentVersion: settings.wingsGroupV3.privacy.consentVersion,
  dataSubjectContact: settings.wingsGroupV3.privacy.dataSubjectContact,
  dataSubjectRightsEvidence: settings.wingsGroupV3.privacy.dataSubjectRightsEvidence,
  dataSubjectRightsStatement: settings.wingsGroupV3.privacy.dataSubjectRightsStatement,
  effectiveDate: '2026-09-01',
  legalEntity: WINGSGROUP_LEGAL_IDENTITY.legalEntityName,
  legalOwner: 'Authorized legal owner',
  policyVersion: settings.wingsGroupV3.privacy.policyVersion,
  privacyApprovalReference: settings.wingsGroupV3.privacy.approvalReference,
  retentionMonths: WINGSGROUP_LEAD_RETENTION_MONTHS,
  scope: 'Approved WingsGroup policy scope',
  version: '1.0',
})

const request = (role = 'super-admin', settings = trustedSettings()) => ({
  payload: {
    find: async ({ collection }: { collection: string }) =>
      collection === 'site-settings' ? { docs: [settings] } : { docs: [] },
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
    const correctionMigration = fs.readFileSync(
      path.resolve(
        process.cwd(),
        'src/migrations/20260814_130000_wingsgroup_policy_release_governance.ts',
      ),
      'utf8',
    )
    expect(correctionMigration).toContain('wings_group_route_policy_data_subject_rights_statement')
    expect(correctionMigration).toContain('wings_group_v3_privacy_approval_state')
    expect(correctionMigration).not.toMatch(/UPDATE\s+"(?:pages|site_settings)"/i)
  })

  it('allows only super-admins to mutate the SiteSettings release-governance snapshot', async () => {
    const original = trustedSettings()
    for (const role of ['editor', 'site-manager']) {
      expect(() =>
        validateWingsGroupV3Settings({
          data: {
            wingsGroupV3: {
              ...original.wingsGroupV3,
              englishPublicationState: 'approved',
            },
          },
          originalDoc: original,
          req: { context: {}, user: { role } },
        } as never),
      ).toThrow(/super-admin/)
      expect(() =>
        validateWingsGroupV3Settings({
          data: {
            wingsGroupV3: {
              ...original.wingsGroupV3,
              privacy: { ...original.wingsGroupV3.privacy, approvalState: 'approved' },
            },
          },
          originalDoc: original,
          req: { context: {}, user: { role } },
        } as never),
      ).toThrow(/super-admin/)
      expect(() =>
        validateWingsGroupV3Settings({
          data: {
            wingsGroupV3: {
              ...original.wingsGroupV3,
              consultationChannels: [
                {
                  key: 'zalo',
                  owner: 'Commercial owner',
                  sla: '1 business day',
                  state: 'approved',
                  trackingReference: 'tracking-review',
                  url: 'https://example.com/zalo',
                },
              ],
            },
          },
          originalDoc: original,
          req: { context: {}, user: { role } },
        } as never),
      ).toThrow(/super-admin/)
    }

    expect(
      validateWingsGroupV3Settings({
        data: { wingsGroupV3: original.wingsGroupV3 },
        originalDoc: original,
        req: { context: {}, user: { role: 'super-admin' } },
      } as never),
    ).toBeTruthy()

    expect(() =>
      validateWingsGroupV3Settings({
        data: {
          wingsGroupV3: {
            ...original.wingsGroupV3,
            privacy: { ...original.wingsGroupV3.privacy, approvalState: 'approved' },
          },
        },
        originalDoc: original,
        req: { context: {}, user: { role: 'super-admin' } },
      } as never),
    ).toThrow(/quyền chủ thể dữ liệu/)
  })

  it('fails anonymous Page API access closed for English and policy gates', async () => {
    const read = Pages.access?.read
    expect(typeof read).toBe('function')
    if (typeof read !== 'function') throw new Error('Pages read access is not callable.')
    const payloadFor = (settings: ReturnType<typeof trustedSettings>) => ({
      find: async ({ collection }: { collection: string }) => {
        if (collection === 'sites') return { docs: [{ code: 'wings-group', id: 1 }] }
        if (collection === 'site-settings') return { docs: [settings] }
        throw new Error(`Unexpected collection: ${collection}`)
      },
    })

    const hiddenEnglish = await read({
      req: { locale: 'en', payload: payloadFor(trustedSettings()), user: null },
    } as never)
    expect(JSON.stringify(hiddenEnglish)).not.toContain('"equals":"wings-group"')

    const approvedEnglish = await read({
      req: {
        locale: 'en',
        payload: payloadFor(
          trustedSettings({ englishPublicationState: 'approved', privacyApproved: true }),
        ),
        user: null,
      },
    } as never)
    const accessJSON = JSON.stringify(approvedEnglish)
    expect(accessJSON).toContain('"pathname":{"equals":"/ve-wingsgroup"}')
    expect(accessJSON).toContain('"wingsGroupRoute.archetype":{"equals":"corporate"}')
    expect(accessJSON).toContain('wingsGroupRoute.policy.dataSubjectRightsStatement')
    expect(accessJSON).not.toContain('"wingsGroupRoute.policy.legalOwner":{"exists"')
    expect(accessJSON).not.toContain('"wingsGroupRoute.policy.effectiveDate":{"exists"')
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
    ).rejects.toThrow(/trusted privacy|publication gate/)
  })

  it('binds an approved policy snapshot to the trusted privacy and legal settings', async () => {
    const settings = trustedSettings({ privacyApproved: true })
    const policyPage = routeData({
      pathname: '/chinh-sach-bao-mat',
      wingsGroupRoute: {
        archetype: 'policy',
        managedBy: 'wingsgroup-v3',
        policy: approvedPolicy(settings),
        publication: { en: 'hidden', vi: 'approved' },
      },
    })
    const validated = await validateWingsGroupV3Governance({
      data: policyPage,
      originalDoc: {},
      req: request('super-admin', settings),
    } as never)
    expect(
      (validated?.wingsGroupRoute?.policy as { validationMarker?: unknown })?.validationMarker,
    ).toBe(WINGSGROUP_POLICY_VALIDATION_MARKER)

    await expect(
      validateWingsGroupV3Governance({
        data: {
          ...policyPage,
          wingsGroupRoute: {
            ...(policyPage.wingsGroupRoute as Record<string, unknown>),
            policy: { ...approvedPolicy(settings), retentionMonths: 12 },
          },
        },
        originalDoc: {},
        req: request('super-admin', settings),
      } as never),
    ).rejects.toThrow(/trusted privacy/)
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
            find: async ({ collection }: { collection: string }) =>
              collection === 'site-settings' ? { docs: [trustedSettings()] } : { docs: [] },
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
