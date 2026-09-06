import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  activeCounts,
  buildMediaReferenceIndex,
  cleanupCreatedResources,
  prepareRunArtifacts,
  type ImportState,
} from '../../scripts/import-doicanhviet'

const emptyState = (): ImportState => ({
  created: 1,
  skippedExisting: 0,
  skippedDecision: 0,
  rejected: 0,
  errors: 1,
  mediaCreated: 5,
  mediaReused: 1,
  departuresCreated: 2,
  pagesCreated: 2,
  productsCreated: 1,
  mediaRolledBack: 2,
  pagesRolledBack: 1,
  productsRolledBack: 1,
  departuresRolledBack: 1,
  parentPagesCreated: 0,
  parentPagesRolledBack: 0,
  cleanupFailures: 0,
  partialFailures: 0,
})

describe('Doicanhviet importer rollback and provenance safety', () => {
  it('indexes media in blocks, localized fields, custom relations, globals, and versions', async () => {
    const payload = {
      config: {
        collections: [
          {
            slug: 'pages',
            versions: { drafts: true },
            fields: [
              { name: 'hero', type: 'upload', relationTo: 'media', localized: true },
              {
                name: 'layout',
                type: 'blocks',
                blocks: [
                  {
                    slug: 'content',
                    fields: [{ name: 'imageAsset', type: 'upload', relationTo: 'media' }],
                  },
                ],
              },
            ],
          },
          {
            slug: 'custom',
            fields: [{ name: 'assetRef', type: 'relationship', relationTo: 'media' }],
          },
          { slug: 'media', fields: [] },
        ],
        globals: [{ slug: 'site-settings', fields: [{ name: 'brandMark', type: 'upload', relationTo: 'media' }] }],
      },
      find: async ({ collection }: { collection: string }) => ({
        docs:
          collection === 'pages'
            ? [
                {
                  id: 1,
                  hero: { vi: 11, en: 12 },
                  layout: [{ blockType: 'content', imageAsset: 13 }],
                },
              ]
            : collection === 'custom'
              ? [{ id: 2, assetRef: 14 }]
              : [],
        hasNextPage: false,
      }),
      findVersions: async ({ collection }: { collection: string }) => ({
        docs: collection === 'pages' ? [{ id: 3, version: { layout: [{ blockType: 'content', imageAsset: 15 }] } }] : [],
        hasNextPage: false,
      }),
      findGlobal: async () => ({ id: 'settings', brandMark: 16 }),
      findGlobalVersions: async () => ({ docs: [{ version: { brandMark: 17 } }], hasNextPage: false }),
    }

    const index = await buildMediaReferenceIndex(payload as any, {} as any)
    expect(index.coverage).toBe('complete')
    expect([...index.ids].sort()).toEqual(['11', '12', '13', '14', '15', '16'])
  })

  it('does not call findVersions for a non-versioned collection', async () => {
    const payload = {
      config: { collections: [{ slug: 'custom', fields: [{ name: 'asset', type: 'upload', relationTo: 'media' }] }, { slug: 'payload-jobs', fields: [] }, { slug: 'media', fields: [] }], globals: [] },
      find: async ({ collection }: { collection: string }) => {
        if (collection === 'payload-jobs') throw new Error('must not query unrelated jobs collection')
        return { docs: [{ asset: 22 }], hasNextPage: false }
      },
      findVersions: async () => { throw new Error('must not query non-versioned collection versions') },
    }
    const index = await buildMediaReferenceIndex(payload as any, {} as any)
    expect(index.coverage).toBe('complete')
    expect([...index.ids]).toEqual(['22'])
  })

  it('records failed deletes and preserves the complete write journal', async () => {
    const deleted: Array<[string, number]> = []
    const payload = {
      config: { collections: [], globals: [] },
      find: async () => ({ docs: [], hasNextPage: false }),
      findVersions: async () => ({ docs: [], hasNextPage: false }),
      delete: async ({ collection, id }: { collection: string; id: number }) => {
        if (collection === 'media' && id === 5) throw new Error('simulated media delete failure')
        deleted.push([collection, id])
      },
    }

    const outcome = await cleanupCreatedResources({
      createdDepartures: [9],
      createdMedia: [4, 5],
      createdPage: 3,
      createdProduct: 2,
      payload: payload as any,
      req: {} as any,
    })
    expect(outcome.status).toBe('partial-failure')
    expect(outcome.deleted).toMatchObject({ departures: [9], page: [3], media: [4], product: [2] })
    expect(outcome.errors).toEqual([
      { collection: 'media', id: 5, error: 'simulated media delete failure' },
    ])
    expect(deleted).toEqual([
      ['tour-departures', 9],
      ['tour-products', 2],
      ['pages', 3],
      ['media', 4],
    ])
    expect(activeCounts(emptyState())).toEqual({ media: 3, pages: 1, products: 0, departures: 1 })
  })

  it('fails closed and retains media when version/reference coverage is unavailable', async () => {
    const payload = {
      config: { collections: [{ slug: 'pages', versions: { drafts: true }, fields: [{ name: 'asset', type: 'upload', relationTo: 'media' }] }], globals: [] },
      find: async () => ({ docs: [], hasNextPage: false }),
      delete: async () => undefined,
    }
    const outcome = await cleanupCreatedResources({
      createdDepartures: [],
      createdMedia: [4],
      createdPage: null,
      createdProduct: null,
      payload: payload as any,
      req: {} as any,
    })
    expect(outcome.status).toBe('partial-failure')
    expect(outcome.deleted.media).toEqual([])
    expect(outcome.retained[0].reason).toContain('reference-coverage-incomplete')
  })

  it('does not overwrite an existing run artifact directory', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'doicanhviet-run-'))
    const normalizedPath = path.join(root, 'tours.normalized.json')
    const decisionsPath = path.join(root, 'import-decisions.json')
    const inventoryPath = path.join(root, 'source-inventory.json')
    await Promise.all([
      fs.writeFile(normalizedPath, '{"records":[]}\n'),
      fs.writeFile(decisionsPath, '{}\n'),
      fs.writeFile(inventoryPath, '{}\n'),
    ])
    try {
      await prepareRunArtifacts({
        decisionsPath,
        filePath: normalizedPath,
        referenceDate: '2026-09-06',
        runId: 'immutable-run-001',
        sourceSnapshotHash: 'a'.repeat(64),
      })
      await expect(
        prepareRunArtifacts({
          decisionsPath,
          filePath: normalizedPath,
          referenceDate: '2026-09-06',
          runId: 'immutable-run-001',
          sourceSnapshotHash: 'a'.repeat(64),
        }),
      ).rejects.toMatchObject({ code: 'EEXIST' })
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })
})
