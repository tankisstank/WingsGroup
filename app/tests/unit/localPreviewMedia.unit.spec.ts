import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/utilities/localPreviewStore', () => ({
  isWingsGroupLocalPreviewStoreConfigured: () => false,
}))

import { resolveWingsGroupLocalPreviewMediaDirectory } from '@/utilities/localPreviewMedia'

describe('local preview media directory', () => {
  it('resolves the bundled public media directory without import.meta.dirname', () => {
    expect(resolveWingsGroupLocalPreviewMediaDirectory()).toBe(
      path.resolve(process.cwd(), 'public/media'),
    )
  })
})
