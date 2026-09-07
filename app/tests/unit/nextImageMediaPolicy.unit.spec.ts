import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('Next Image public-media policy', () => {
  it('allows only the site-context-aware public media route for local optimization', () => {
    const source = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8')

    expect(source).toContain("pathname: '/media/**'")
    expect(source).not.toContain("pathname: '/api/media/file/**'")
  })
})
