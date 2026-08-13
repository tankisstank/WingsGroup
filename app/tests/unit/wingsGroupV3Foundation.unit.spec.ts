import { describe, expect, it } from 'vitest'

import { validateEcosystemProfiles } from '@/blocks/WingsGroupEcosystem/config'
import { validateProofRecords } from '@/blocks/WingsGroupProofArchive/config'
import { validateConsultationChannels, validateMediaGovernance } from '@/fields/wingsGroupV3'
import { resolveSiteSettingsUpsert } from '../../scripts/lib/wingsGroupV3MediaPlan'

const sha = 'a'.repeat(64)

describe('WingsGroup v3 fail-closed governance', () => {
  it('keeps unconfigured consultation channels non-blocking but gates approved URLs', () => {
    expect(validateConsultationChannels([{ key: 'zalo', state: 'unconfigured' }])).toBe(true)
    expect(
      validateConsultationChannels([{ key: 'zalo', state: 'approved', url: 'http://x' }]),
    ).toMatch(/HTTPS/)
    expect(
      validateConsultationChannels([
        {
          key: 'zalo',
          owner: 'Commercial operations',
          sla: '4 business hours',
          state: 'approved',
          trackingReference: 'analytics-test-1',
          url: 'https://example.com/zalo',
        },
      ]),
    ).toBe(true)
  })

  it('does not allow WingsGroup media publication without rights and verified WebP/AVIF', () => {
    expect(
      validateMediaGovernance({ managedBy: 'wingsgroup-v3', publicationState: 'published' }),
    ).toMatch(/attachment/)
    expect(
      validateMediaGovernance({
        derivativeState: 'verified',
        managedBy: 'wingsgroup-v3',
        provenanceReference: 'manifest:v1',
        publicationState: 'published',
        responsiveDerivatives: [
          { format: 'webp', sha256: sha, url: 'https://cdn.example/a.webp', width: 640 },
          { format: 'avif', sha256: sha, url: 'https://cdn.example/a.avif', width: 640 },
        ],
        rightsEvidence: 'stakeholder-approval',
        rightsState: 'approved',
        sourceArchiveSha256: sha,
        sourceAttachmentId: 'attachment-1',
        sourceFileSha256: sha,
        sourceIdentity: `attachment-1:${sha}`,
      }),
    ).toBe(true)
  })

  it('gates approved proof and ecosystem deep links on complete evidence', () => {
    expect(
      validateProofRecords([
        { key: 'licence', permissionState: 'pending', publicationState: 'approved' },
      ]),
    ).toMatch(/source/)
    expect(
      validateEcosystemProfiles([
        { brandKey: 'wingsgo', cta: { state: 'contact-fallback' }, proofState: 'pending' },
        {
          brandKey: 'wing-side',
          cta: { state: 'approved-deep-link', url: 'https://wingside.vn' },
          proofState: 'pending',
        },
      ]),
    ).toMatch(/owner/)
  })

  it('rejects nondeterministic duplicate site-settings instead of choosing limit:1', () => {
    expect(() =>
      resolveSiteSettingsUpsert({
        settings: [
          { id: 10, site: 1 },
          { id: 11, site: { id: 1 } },
        ],
        sites: [{ code: 'wings-group', id: 1 }],
      }),
    ).toThrow(/found 2/)
  })
})
