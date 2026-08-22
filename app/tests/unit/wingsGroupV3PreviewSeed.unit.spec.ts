import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  assertWingsGroupPreviewMediaPending,
  assertRunOwnedWingsGroupPreviewDatabase,
  parseWingsGroupV3PreviewSeedCommand,
  WINGSGROUP_PREVIEW_MEDIA_FILENAMES,
} from '../../scripts/seed-wingsgroup-v3-home-preview'
import { resolveWingsGroupLocalPreviewMediaDirectory } from '@/utilities/localPreviewMedia'

const pendingMedia = (sourceFilename: string) => ({
  governance: {
    managedBy: 'wingsgroup-v3',
    publicationState: 'pending',
    sourceFilename,
  },
})

describe('E09-20 local preview seed', () => {
  it('keeps all 13 governed editorial assets pending', () => {
    const media = WINGSGROUP_PREVIEW_MEDIA_FILENAMES.map(pendingMedia)

    expect(() => assertWingsGroupPreviewMediaPending(media)).not.toThrow()
    expect(() =>
      assertWingsGroupPreviewMediaPending([
        ...media.slice(0, -1),
        pendingMedia(WINGSGROUP_PREVIEW_MEDIA_FILENAMES.at(-1)!),
      ]),
    ).not.toThrow()
    expect(() =>
      assertWingsGroupPreviewMediaPending([
        ...media.slice(0, -1),
        {
          governance: {
            managedBy: 'wingsgroup-v3',
            publicationState: 'published',
            sourceFilename: WINGSGROUP_PREVIEW_MEDIA_FILENAMES.at(-1),
          },
        },
      ]),
    ).toThrow(/remain pending/)
  })

  it('uses the draft page path and contains no media promotion mutation', () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), 'scripts/seed-wingsgroup-v3-home-preview.ts'),
      'utf8',
    )

    expect(source).toContain("_status: 'draft'")
    expect(source).toContain('WINGSGROUP_LOCAL_DRAFT_PREVIEW_CONTEXT')
    expect(source).not.toContain("publicationState: 'published'")
    expect(source).toContain('E09_PREVIEW_MEDIA_SEED')
    expect(source).toContain('seedWingsGroupV3PreviewMedia')
  })

  it('requires explicit assets and a run-owned preview database', () => {
    expect(() => parseWingsGroupV3PreviewSeedCommand(['--apply'])).toThrow('--assets-dir')
    expect(
      parseWingsGroupV3PreviewSeedCommand([
        '--apply',
        '--assets-dir=/tmp/e09-preview-assets',
        '--manifest=/tmp/manifest.json',
      ]),
    ).toMatchObject({
      apply: true,
      assetsDirectory: '/tmp/e09-preview-assets',
      manifestPath: '/tmp/manifest.json',
    })
    expect(
      assertRunOwnedWingsGroupPreviewDatabase('file:/tmp/e09-preview-run/e09-preview.db'),
    ).toBe('/tmp/e09-preview-run/e09-preview.db')
    expect(() => assertRunOwnedWingsGroupPreviewDatabase('file:./e09-preview.db')).toThrow(
      /run-owned/,
    )
  })

  it('rejects arbitrary preview media directories and production preview configuration', () => {
    const environment = process.env as Record<string, string | undefined>
    const originalNodeEnv = environment.NODE_ENV
    const originalSeedFlag = environment.E09_PREVIEW_MEDIA_SEED
    environment.E09_PREVIEW_MEDIA_SEED = 'true'
    expect(() => resolveWingsGroupLocalPreviewMediaDirectory('/tmp/not-e09/media')).toThrow(
      /e09-preview/,
    )

    environment.NODE_ENV = 'production'
    try {
      expect(() =>
        resolveWingsGroupLocalPreviewMediaDirectory('/tmp/e09-preview-production/media'),
      ).toThrow(/non-production/)
    } finally {
      if (originalNodeEnv === undefined) delete environment.NODE_ENV
      else environment.NODE_ENV = originalNodeEnv
      if (originalSeedFlag === undefined) delete environment.E09_PREVIEW_MEDIA_SEED
      else environment.E09_PREVIEW_MEDIA_SEED = originalSeedFlag
    }
  })
})
