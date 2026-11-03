import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utilities/localPreviewStore', () => ({
  isWingsGroupLocalPreviewStoreConfigured: () => false,
}))

import { resolveWingsGroupLocalPreviewMediaDirectory } from '@/utilities/localPreviewMedia'

describe('local preview media directory', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('resolves the bundled public media directory without import.meta.dirname', () => {
    expect(resolveWingsGroupLocalPreviewMediaDirectory()).toBe(
      path.resolve(process.cwd(), 'public/media'),
    )
  })

  it('uses the runtime working directory after moving a standalone bundle', () => {
    const runtimeDirectory = path.resolve('runtime-container', 'app')
    vi.spyOn(process, 'cwd').mockReturnValue(runtimeDirectory)
    vi.stubEnv('NODE_ENV', 'production')
    expect(resolveWingsGroupLocalPreviewMediaDirectory()).toBe(
      path.join(runtimeDirectory, 'public', 'media'),
    )
  })

  it('continues to reject preview directory overrides in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(() => resolveWingsGroupLocalPreviewMediaDirectory('/tmp/preview')).toThrow(
      'requires the explicit non-production local preview media seed',
    )
  })
})
