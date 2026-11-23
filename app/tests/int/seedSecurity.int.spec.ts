import { describe, expect, it } from 'vitest'

import { GET, POST } from '@/app/(frontend)/next/seed/route'

describe('destructive seed security', () => {
  it.each([
    ['GET', GET],
    ['POST', POST],
  ])('%s does not expose destructive seed over HTTP', async (_method, seed) => {
    const response = await seed()

    expect(response.status).toBe(404)
  })
})
