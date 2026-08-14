import { describe, expect, it } from 'vitest'

import {
  buildWingsGroupPublicPageAccessWhere,
  findWingsGroupPublicJargon,
  getWingsGroupRoutePublicationState,
  hasApprovedWingsGroupPrivacyGovernance,
  hasApprovedPolicyGovernance,
  isValidWingsGroupPolicyDate,
  isWingsGroupRoutePublic,
  WINGSGROUP_CORPORATE_ROUTES,
  WINGSGROUP_LEGAL_IDENTITY,
  WINGSGROUP_POLICY_ROUTES,
  WINGSGROUP_POLICY_VALIDATION_MARKER,
  WINGSGROUP_RELATIONSHIP_STATEMENT_EN,
} from '@/wingsgroup/corporateRoutes'
import {
  WINGSGROUP_CONSENT_VERSION,
  WINGSGROUP_DATA_CONTACT,
  WINGSGROUP_LEAD_RETENTION_MONTHS,
  WINGSGROUP_POLICY_ROUTES as CONTACT_POLICY_ROUTES,
  WINGSGROUP_PRIVACY_VERSION,
} from '@/lead-capture/wingsGroupV3'
import {
  buildWingsGroupCorporateRouteSeeds,
  resolveCorporateRouteSeedAction,
  routeGovernanceForSeed,
} from '../../scripts/lib/wingsGroupCorporateRouteSeed'

const governedPage = (path = '/ve-wingsgroup') => ({
  pathname: path,
  wingsGroupRoute: {
    archetype: path === '/ve-wingsgroup' ? 'corporate' : 'policy',
    managedBy: 'wingsgroup-v3',
    publication: { en: 'approved', vi: 'approved' },
  },
})

const trustedSettings = ({
  englishPublicationState = 'hidden',
  privacyApproved = false,
}: {
  englishPublicationState?: 'approved' | 'hidden' | 'route-ready'
  privacyApproved?: boolean
} = {}) => ({
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
      policyRouteEn: CONTACT_POLICY_ROUTES.en,
      policyRouteVi: CONTACT_POLICY_ROUTES.vi,
      policyVersion: WINGSGROUP_PRIVACY_VERSION,
      retentionMonths: WINGSGROUP_LEAD_RETENTION_MONTHS,
    },
  },
})

describe('WingsGroup corporate route contract', () => {
  it('defines exactly the nine accepted paths and only three policy paths', () => {
    expect(WINGSGROUP_CORPORATE_ROUTES.map(({ path }) => path)).toEqual([
      '/',
      '/ve-wingsgroup',
      '/nang-luc-dich-vu',
      '/tin-cay-va-phap-ly',
      '/tin-tuc',
      '/lien-he',
      '/chinh-sach-bao-mat',
      '/dieu-khoan-su-dung',
      '/chinh-sach-thanh-toan',
    ])
    expect(WINGSGROUP_POLICY_ROUTES).toEqual([
      '/chinh-sach-bao-mat',
      '/dieu-khoan-su-dung',
      '/chinh-sach-thanh-toan',
    ])
  })

  it('fails closed when governance, policy approval, or the English site gate is absent', () => {
    expect(
      isWingsGroupRoutePublic({
        locale: 'vi',
        page: { pathname: '/ve-wingsgroup' },
        siteCode: 'wings-group',
      }),
    ).toBe(false)
    expect(
      getWingsGroupRoutePublicationState({
        locale: 'vi',
        page: governedPage('/chinh-sach-bao-mat'),
        settings: trustedSettings(),
        siteCode: 'wings-group',
      }),
    ).toBe('pending')
    expect(
      isWingsGroupRoutePublic({
        locale: 'en',
        page: governedPage(),
        settings: trustedSettings(),
        siteCode: 'wings-group',
      }),
    ).toBe(false)
    expect(
      isWingsGroupRoutePublic({
        locale: 'en',
        page: governedPage(),
        settings: trustedSettings({ englishPublicationState: 'approved' }),
        siteCode: 'wings-group',
      }),
    ).toBe(true)
  })

  it('adds the same locale and policy gate to anonymous direct Page reads', () => {
    const viWhere = JSON.stringify(buildWingsGroupPublicPageAccessWhere('vi', trustedSettings()))
    const enHiddenWhere = JSON.stringify(
      buildWingsGroupPublicPageAccessWhere('en', trustedSettings()),
    )
    const enWhere = JSON.stringify(
      buildWingsGroupPublicPageAccessWhere(
        'en',
        trustedSettings({ englishPublicationState: 'approved', privacyApproved: true }),
      ),
    )
    expect(viWhere).toContain('wingsGroupRoute.publication.vi')
    expect(viWhere).not.toContain('/chinh-sach-bao-mat')
    expect(enHiddenWhere).not.toContain('"equals":"wings-group"')
    expect(enWhere).toContain('wingsGroupRoute.publication.en')
    expect(enWhere).toContain('wingsGroupRoute.policy.approvalState')
    expect(enWhere).toContain(WINGSGROUP_LEGAL_IDENTITY.legalEntityName)
    expect(enWhere).toContain('site.code')
    expect(enWhere).not.toContain('"exists"')
    expect(enWhere).toContain('"pathname":{"equals":"/ve-wingsgroup"}')
    expect(enWhere).toContain('"wingsGroupRoute.archetype":{"equals":"corporate"}')
    expect(
      JSON.stringify(
        buildWingsGroupPublicPageAccessWhere(
          'all',
          trustedSettings({ englishPublicationState: 'approved', privacyApproved: true }),
        ),
      ),
    ).not.toContain('"equals":"wings-group"')
  })

  it('requires complete, exact policy approval metadata', () => {
    const settings = trustedSettings({ privacyApproved: true })
    const privacy = settings.wingsGroupV3.privacy
    const approved = {
      approvalReference: 'legal-minute-2026-08-14',
      approvalState: 'approved',
      consentEvidenceReference: privacy.consentEvidenceReference,
      consentVersion: privacy.consentVersion,
      dataSubjectContact: privacy.dataSubjectContact,
      dataSubjectRightsEvidence: privacy.dataSubjectRightsEvidence,
      dataSubjectRightsStatement: privacy.dataSubjectRightsStatement,
      effectiveDate: '2026-09-01',
      legalEntity: WINGSGROUP_LEGAL_IDENTITY.legalEntityName,
      legalOwner: 'Authorized legal owner',
      policyVersion: privacy.policyVersion,
      privacyApprovalReference: privacy.approvalReference,
      retentionMonths: WINGSGROUP_LEAD_RETENTION_MONTHS,
      scope: 'WingsGroup public contact service',
      validationMarker: WINGSGROUP_POLICY_VALIDATION_MARKER,
      version: '1.0',
    }
    expect(hasApprovedWingsGroupPrivacyGovernance(settings)).toBe(true)
    expect(hasApprovedPolicyGovernance(approved, settings)).toBe(true)
    expect(hasApprovedPolicyGovernance({ ...approved, approvalReference: '   ' }, settings)).toBe(false)
    expect(hasApprovedPolicyGovernance({ ...approved, legalEntity: 'Another company' }, settings)).toBe(false)
    expect(hasApprovedPolicyGovernance({ ...approved, effectiveDate: '2026-99-99' }, settings)).toBe(false)
    expect(hasApprovedPolicyGovernance({ ...approved, retentionMonths: 23 }, settings)).toBe(false)
    expect(hasApprovedPolicyGovernance({ ...approved, dataSubjectRightsStatement: 'Different' }, settings)).toBe(false)
    expect(hasApprovedPolicyGovernance({ ...approved, validationMarker: null }, settings)).toBe(false)
    expect(isValidWingsGroupPolicyDate('2026-99-99')).toBe(false)
  })

  it('uses only the exact approved relationship statement and keeps its faithful English copy hidden', () => {
    expect(WINGSGROUP_LEGAL_IDENTITY.relationshipStatement).toBe(
      'WingsGroup là thương hiệu phát triển mới trong cùng hệ sinh thái tổ chức với VietWings và Đôi Cánh Việt. Hệ sinh thái tiếp tục phát triển các thương hiệu WingsGo, WingSide, WingsCare và các dịch vụ liên quan.',
    )
    expect(WINGSGROUP_RELATIONSHIP_STATEMENT_EN).toBe(
      'WingsGroup is a newly developed brand within the same organisational ecosystem as VietWings and Đôi Cánh Việt. The ecosystem continues to develop WingsGo, WingSide, WingsCare and related services.',
    )
    const about = buildWingsGroupCorporateRouteSeeds().find(
      ({ path }) => path === '/ve-wingsgroup',
    )!
    expect(JSON.stringify(about.vi)).toContain(WINGSGROUP_LEGAL_IDENTITY.relationshipStatement)
    expect(JSON.stringify(about.en)).toContain(WINGSGROUP_RELATIONSHIP_STATEMENT_EN)
    expect(JSON.stringify(about.en)).not.toMatch(
      /same (?:legal entity|organisation)\b|service branches/i,
    )
    expect(routeGovernanceForSeed(about).publication.en).toBe('hidden')
  })

  it('detects prohibited implementation language in public copy', () => {
    expect(findWingsGroupPublicJargon({ title: 'A courteous public introduction' })).toBeNull()
    expect(findWingsGroupPublicJargon({ body: 'This root site routes every line business.' })).toBeTruthy()
    expect(findWingsGroupPublicJargon({ body: 'Nội dung cho site con.' })).toBeTruthy()
  })

  it('builds an idempotent route plan with policy and English gates pending', () => {
    const seeds = buildWingsGroupCorporateRouteSeeds()
    expect(seeds).toHaveLength(9)
    expect(seeds.flatMap((seed) => [seed.vi, seed.en]).every((copy) => !findWingsGroupPublicJargon(copy))).toBe(true)
    expect(JSON.stringify(seeds)).not.toMatch(/\/wingsside(?:[/?#"])/i)

    for (const seed of seeds) {
      expect(resolveCorporateRouteSeedAction([], seed)).toBe('create')
      expect(resolveCorporateRouteSeedAction([{ id: 1, pathname: seed.path }], seed)).toBe('update')
      const governance = routeGovernanceForSeed(seed)
      expect(governance.publication.en).toBe('hidden')
      if (seed.policy) {
        expect(governance.publication.vi).toBe('pending')
        expect(governance.policy).toMatchObject({
          approvalState: 'pending',
          dataSubjectRightsStatement: null,
          effectiveDate: null,
          legalOwner: null,
          privacyApprovalReference: null,
          validationMarker: null,
        })
      } else {
        expect(governance.publication.vi).toBe('approved')
      }
    }
  })

  it('rejects duplicate route rows instead of choosing one nondeterministically', () => {
    const route = buildWingsGroupCorporateRouteSeeds()[1]
    expect(() =>
      resolveCorporateRouteSeedAction(
        [
          { id: 1, pathname: route.path },
          { id: 2, pathname: route.path },
        ],
        route,
      ),
    ).toThrow(/Duplicate/)
  })
})
