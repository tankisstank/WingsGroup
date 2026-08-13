import { describe, expect, it } from 'vitest'

import { validateEcosystemProfiles } from '@/blocks/WingsGroupEcosystem/config'
import { validateProofRecords } from '@/blocks/WingsGroupProofArchive/config'
import { validateConsultationChannels, validateMediaGovernance } from '@/fields/wingsGroupV3'
import { resolveSiteSettingsUpsert } from '../../scripts/lib/wingsGroupV3MediaPlan'
import { parseWingsGroupV3MediaCommand } from '../../scripts/import-wingsgroup-v3-media'
import {
  buildWingsGroupV3MediaPlan,
  parseWingsGroupV3MediaManifest,
} from '../../scripts/lib/wingsGroupV3MediaPlan'
import fs from 'node:fs/promises'

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

  it('keeps media lifecycle plan-only and rejects apply/verify/rollback', () => {
    expect(() =>
      parseWingsGroupV3MediaCommand([
        'plan',
        '--manifest=/tmp/manifest.json',
        '--assets-dir=/tmp/assets',
      ]),
    ).not.toThrow()
    for (const command of ['apply', 'verify', 'rollback']) {
      expect(() =>
        parseWingsGroupV3MediaCommand([
          command,
          '--manifest=/tmp/manifest.json',
          '--assets-dir=/tmp/assets',
        ]),
      ).toThrow(/plan-only/)
    }
  })

  it('blocks a manifest/file dimension mismatch', async () => {
    const manifest = parseWingsGroupV3MediaManifest(
      JSON.parse(
        await fs.readFile(
          '/home/docker-admin/src/WingsTravel/docs/product/wingsgroup-v3-media-manifest.json',
          'utf8',
        ),
      ),
    )
    const plan = await buildWingsGroupV3MediaPlan({
      assetsDirectory:
        '/home/docker-admin/src/WingsTravel/artifacts/tmp/win-20-handoff/extracted/wingsgroup-v3-development-package/assets',
      manifest,
    })
    expect(plan.errors).toContainEqual(expect.stringMatching(/airport-welcome.*dimensions/))
    expect(plan.planned).toBe(12)
  })
})
