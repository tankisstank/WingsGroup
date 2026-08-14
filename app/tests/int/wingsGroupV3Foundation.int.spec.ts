import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { Media } from '@/collections/Media'
import { Pages } from '@/collections/Pages'
import { SiteSettings } from '@/collections/SiteSettings'
import { validateGovernedMediaBeforeChange } from '@/fields/wingsGroupV3'
import { validateWingsGroupV3Governance } from '@/collections/Pages/hooks/validateWingsGroupV3Governance'

const namedField = (fields: NonNullable<typeof SiteSettings.fields>, name: string) =>
  fields.find((field) => 'name' in field && field.name === name)

const completeGovernance = {
  derivativeState: 'verified',
  managedBy: 'wingsgroup-v3',
  provenanceReference: 'manifest:v1',
  publicationState: 'published',
  responsiveDerivatives: [
    { format: 'webp', sha256: 'a'.repeat(64), url: 'https://cdn/a.webp', width: 640 },
    { format: 'avif', sha256: 'a'.repeat(64), url: 'https://cdn/a.avif', width: 640 },
  ],
  rightsEvidence: 'approved',
  rightsState: 'approved',
  sourceArchiveSha256: 'a'.repeat(64),
  sourceAttachmentId: 'attachment',
  sourceFileSha256: 'a'.repeat(64),
  sourceFilename: 'source.png',
  sourceIdentity: `attachment:${'a'.repeat(64)}`,
  usageScope: 'editorial-service',
}

describe('WingsGroup v3 Payload foundation', () => {
  it('registers optional settings/media fields and governed Page blocks', () => {
    expect(namedField(SiteSettings.fields, 'wingsGroupV3')).toBeTruthy()
    expect(namedField(Media.fields, 'governance')).toBeTruthy()

    const tabs = Pages.fields.find((field) => field.type === 'tabs')
    const contentTab =
      tabs && 'tabs' in tabs ? tabs.tabs.find((tab) => tab.label === 'Nội dung') : undefined
    const layout = contentTab?.fields.find((field) => 'name' in field && field.name === 'layout')
    const blockSlugs =
      layout && layout.type === 'blocks' ? layout.blocks.map((block) => block.slug) : []
    expect(blockSlugs).toEqual(
      expect.arrayContaining(['wingsGroupEcosystem', 'wingsGroupProofArchive']),
    )
  })

  it('keeps the PostgreSQL migration focused on E09 additive tables', () => {
    const migration = fs.readFileSync(
      path.resolve(
        process.cwd(),
        'src/migrations/20260813_193226_wingsgroup_v3_data_foundation.ts',
      ),
      'utf8',
    )
    expect(migration).toContain('CREATE TABLE "wg_ecosystem"')
    expect(migration).toContain('CREATE TABLE "wg_proof"')
    expect(migration).toContain('CREATE TABLE "media_governance_responsive_derivatives"')
    expect(migration).not.toContain('tour_products')
    expect(migration).not.toContain('form_submissions')
  })

  it('requires super-admin for all three governance approval transitions', async () => {
    const transitions = [
      [{ rightsState: 'pending' }, { rightsState: 'approved' }],
      [{ derivativeState: 'generated' }, { derivativeState: 'verified' }],
      [{ publicationState: 'ready' }, { publicationState: 'published' }],
    ]
    for (const [before, after] of transitions) {
      await expect(
        validateGovernedMediaBeforeChange({
          data: { governance: after },
          originalDoc: { governance: before },
          req: { user: { role: 'editor' } },
        } as never),
      ).rejects.toThrow(/super-admin/)
    }
  })

  it('prevents an editor mutating approved evidence or provenance', async () => {
    await expect(
      validateGovernedMediaBeforeChange({
        data: { governance: { ...completeGovernance, rightsEvidence: 'replacement' } },
        originalDoc: { governance: completeGovernance },
        req: { user: { role: 'editor' } },
      } as never),
    ).rejects.toThrow(/super-admin/)
  })

  it('checks Page hero media relations at the trusted server boundary', async () => {
    await expect(
      validateWingsGroupV3Governance({
        data: { hero: { media: 22 }, layout: [], site: 1 },
        originalDoc: {},
        req: {
          payload: {
            findByID: async () => ({ governance: {}, id: 22, site: 2 }),
          },
        },
      } as never),
    ).rejects.toThrow(/tenant khác/)
  })

  it('extracts main, supporting, slide and video hero media for same-site checks', async () => {
    const checked: number[] = []
    await validateWingsGroupV3Governance({
      data: {
        hero: {
          media: 1,
          slides: [{ media: 3, mobileMedia: 4 }],
          supportingMedia: [2],
          video: { desktopVideo: 5, mobileVideo: 6, poster: 7 },
        },
        layout: [],
        site: 10,
      },
      originalDoc: {},
      req: {
        payload: {
          findByID: async ({ id }: { id: number }) => {
            checked.push(id)
            return { governance: {}, id, site: 10 }
          },
        },
      },
    } as never)
    expect(checked.sort((left, right) => left - right)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('loads both localized alt values with fallback disabled before publication', async () => {
    const calls: Array<{ fallbackLocale?: unknown; locale?: unknown }> = []
    await expect(
      validateGovernedMediaBeforeChange({
        data: {
          alt: '',
          governance: completeGovernance,
          site: 1,
        },
        originalDoc: {
          governance: completeGovernance,
          id: 9,
          site: 1,
        },
        req: {
          payload: {
            findByID: async (args: {
              collection: string
              fallbackLocale?: unknown
              locale?: unknown
            }) => {
              if (args.collection === 'sites') return { code: 'wings-group', id: 1 }
              calls.push(args)
              return { alt: args.locale === 'vi' ? 'Alt VI' : '' }
            },
          },
          locale: 'vi',
          user: { role: 'super-admin' },
        },
      } as never),
    ).rejects.toThrow(/cả vi và en/)
    expect(calls).toEqual([expect.objectContaining({ fallbackLocale: false, locale: 'en' })])
  })
})
