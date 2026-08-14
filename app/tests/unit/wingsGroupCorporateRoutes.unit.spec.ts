import { describe, expect, it } from 'vitest'

import {
  buildWingsGroupPublicPageAccessWhere,
  findWingsGroupPublicJargon,
  getWingsGroupRoutePublicationState,
  hasApprovedPolicyGovernance,
  isWingsGroupRoutePublic,
  WINGSGROUP_CORPORATE_ROUTES,
  WINGSGROUP_LEGAL_IDENTITY,
  WINGSGROUP_POLICY_ROUTES,
} from '@/wingsgroup/corporateRoutes'
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
        siteCode: 'wings-group',
      }),
    ).toBe('pending')
    expect(
      isWingsGroupRoutePublic({
        locale: 'en',
        page: governedPage(),
        settings: { wingsGroupV3: { englishPublicationState: 'hidden' } },
        siteCode: 'wings-group',
      }),
    ).toBe(false)
    expect(
      isWingsGroupRoutePublic({
        locale: 'en',
        page: governedPage(),
        settings: { wingsGroupV3: { englishPublicationState: 'approved' } },
        siteCode: 'wings-group',
      }),
    ).toBe(true)
  })

  it('adds the same locale and policy gate to anonymous direct Page reads', () => {
    const viWhere = JSON.stringify(buildWingsGroupPublicPageAccessWhere('vi'))
    const enWhere = JSON.stringify(buildWingsGroupPublicPageAccessWhere('en'))
    expect(viWhere).toContain('wingsGroupRoute.publication.vi')
    expect(enWhere).toContain('wingsGroupRoute.publication.en')
    expect(enWhere).toContain('wingsGroupRoute.policy.approvalState')
    expect(enWhere).toContain(WINGSGROUP_LEGAL_IDENTITY.legalEntityName)
    expect(enWhere).toContain('site.code')
  })

  it('requires complete, exact policy approval metadata', () => {
    const approved = {
      approvalReference: 'legal-minute-2026-08-14',
      approvalState: 'approved',
      effectiveDate: '2026-09-01',
      legalEntity: WINGSGROUP_LEGAL_IDENTITY.legalEntityName,
      legalOwner: 'Authorized legal owner',
      scope: 'WingsGroup public contact service',
      version: '1.0',
    }
    expect(hasApprovedPolicyGovernance(approved)).toBe(true)
    expect(hasApprovedPolicyGovernance({ ...approved, approvalReference: '' })).toBe(false)
    expect(hasApprovedPolicyGovernance({ ...approved, legalEntity: 'Another company' })).toBe(false)
    expect(hasApprovedPolicyGovernance({ ...approved, effectiveDate: '' })).toBe(false)
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
        expect(governance.policy).toMatchObject({ approvalState: 'pending', effectiveDate: null, legalOwner: null })
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
