import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { Media } from '@/collections/Media'
import { Pages } from '@/collections/Pages'
import { SiteSettings } from '@/collections/SiteSettings'
import { validateGovernedMediaBeforeChange } from '@/fields/wingsGroupV3'
import { validateWingsGroupV3Governance } from '@/collections/Pages/hooks/validateWingsGroupV3Governance'
import { WINGSGROUP_LOCAL_DRAFT_PREVIEW_CONTEXT } from '@/wingsgroup/corporateRoutes'

const namedField = (fields: NonNullable<typeof SiteSettings.fields>, name: string) =>
  fields.find((field) => 'name' in field && field.name === name)

const completeGovernance = {
  derivativeState: 'verified',
  managedBy: 'wingsgroup-v3',
  provenanceReference: 'manifest:v1',
  publicationState: 'published',
  responsiveDerivatives: [
    {
      format: 'webp',
      height: 400,
      sha256: 'a'.repeat(64),
      url: 'https://cdn.example/media/source-640.webp',
      width: 640,
    },
    {
      format: 'avif',
      height: 400,
      sha256: 'a'.repeat(64),
      url: 'https://cdn.example/media/source-640.avif',
      width: 640,
    },
    {
      format: 'webp',
      height: 600,
      sha256: 'a'.repeat(64),
      url: 'https://cdn.example/media/source-960.webp',
      width: 960,
    },
    {
      format: 'avif',
      height: 600,
      sha256: 'a'.repeat(64),
      url: 'https://cdn.example/media/source-960.avif',
      width: 960,
    },
    {
      format: 'webp',
      height: 900,
      sha256: 'a'.repeat(64),
      url: 'https://cdn.example/media/source-1440.webp',
      width: 1440,
    },
    {
      format: 'avif',
      height: 900,
      sha256: 'a'.repeat(64),
      url: 'https://cdn.example/media/source-1440.avif',
      width: 1440,
    },
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
      expect.arrayContaining([
        'wingsGroupEcosystem',
        'wingsGroupGallery',
        'wingsGroupProofArchive',
      ]),
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
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "wg_ecosystem"')
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "wg_proof"')
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS "media_governance_responsive_derivatives"',
    )
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "wings_group_v3_enabled"')
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS')
    expect(migration).toContain('pg_constraint')
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

  it('restricts the Gallery to WingsGroup and validates every media relation', async () => {
    const routeGovernance = {
      archetype: 'corporate',
      contentApproval: { en: null, vi: null },
      managedBy: 'wingsgroup-v3',
      publication: { en: 'pending', vi: 'pending' },
    }
    const layout = [
      {
        blockType: 'wingsGroupGallery',
        items: [{ media: 22, visible: true }],
      },
    ]
    const data = {
      _status: 'draft',
      layout,
      pathname: '/ve-wingsgroup',
      site: 1,
      wingsGroupRoute: routeGovernance,
    }
    const run = (mediaSite: number) =>
      validateWingsGroupV3Governance({
        data,
        originalDoc: data,
        req: {
          context: {},
          locale: 'vi',
          payload: {
            find: async () => ({ docs: [{ site: 1 }] }),
            findByID: async ({ collection }: { collection: string }) =>
              collection === 'sites'
                ? { code: 'wings-group', id: 1 }
                : { governance: {}, id: 22, site: mediaSite },
          },
          user: { role: 'super-admin' },
        },
      } as never)

    await expect(run(2)).rejects.toThrow(/tenant khác/)
    await expect(run(1)).resolves.toMatchObject({ pathname: '/ve-wingsgroup' })
  })

  it('requires a site relation before accepting a WingsGroup Gallery block', async () => {
    await expect(
      validateWingsGroupV3Governance({
        data: { layout: [{ blockType: 'wingsGroupGallery', items: [] }] },
        originalDoc: {},
        req: { context: {}, payload: {} },
      } as never),
    ).rejects.toThrow(/site scope/)
  })

  it('checks Page parent relations at the trusted server boundary', async () => {
    await expect(
      validateWingsGroupV3Governance({
        data: { layout: [], parentPage: 22, site: 1 },
        originalDoc: {},
        req: {
          payload: {
            findByID: async () => ({ id: 22, site: 2 }),
          },
        },
      } as never),
    ).rejects.toThrow(/tenant khác/)
  })

  it('accepts pending development media only in the explicit local draft preview path', async () => {
    const media = {
      alt: 'Preview editorial scene',
      governance: {
        derivativeState: 'pending',
        managedBy: 'wingsgroup-v3',
        publicationState: 'pending',
        provenanceReference: 'manifest:preview',
        rightsState: 'approved',
        sourceArchiveSha256: 'a'.repeat(64),
        sourceAttachmentId: 'attachment-preview',
        sourceFileSha256: 'a'.repeat(64),
        sourceIdentity: `attachment-preview:${'a'.repeat(64)}`,
        usageScope: 'editorial-service',
      },
      id: 22,
      site: {
        code: 'wings-group',
        id: 1,
      },
      url: '/media/preview.png',
    }

    await expect(
      validateWingsGroupV3Governance({
        data: { _status: 'draft', hero: { media: 22 }, layout: [], site: 1 },
        originalDoc: {},
        req: {
          context: { [WINGSGROUP_LOCAL_DRAFT_PREVIEW_CONTEXT]: true },
          payload: { findByID: async () => media },
        },
      } as never),
    ).resolves.toMatchObject({ _status: 'draft' })

    await expect(
      validateWingsGroupV3Governance({
        data: { _status: 'published', hero: { media: 22 }, layout: [], site: 1 },
        originalDoc: {},
        req: {
          context: { [WINGSGROUP_LOCAL_DRAFT_PREVIEW_CONTEXT]: true },
          payload: { findByID: async () => media },
        },
      } as never),
    ).rejects.toThrow(/chưa qua publication gate/)
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

  it('rejects a blank pending VI alt while persisted EN alt is valid', async () => {
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
              if (args.collection === 'sites') {
                return { code: 'wings-group', id: 1, primaryDomain: 'cdn.example' }
              }
              calls.push(args)
              return { alt: args.locale === 'en' ? 'Alt EN' : 'unexpected locale read' }
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
