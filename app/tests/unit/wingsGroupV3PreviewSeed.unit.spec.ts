import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  assertWingsGroupPreviewMediaPending,
  WINGSGROUP_PREVIEW_MEDIA_FILENAMES,
} from '../../scripts/seed-wingsgroup-v3-home-preview'

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
    expect(source).not.toContain("collection: 'media',\n        data:")
  })
})
