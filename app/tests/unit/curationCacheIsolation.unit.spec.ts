import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const redis = vi.hoisted(() => ({ scan: vi.fn(), del: vi.fn() }))
const client = vi.hoisted(() => ({
  ensureRedisConnected: vi.fn(),
  getSharedRedisClient: vi.fn(() => redis),
}))

vi.mock('next/cache.js', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/infrastructure/redis/client', () => client)

import { clearRedisCurationCache } from '@/collections/TourCurations/hooks'

describe('curation cache tenant isolation', () => {
  beforeEach(() => {
    vi.stubEnv('REDIS_URL', 'redis://local-test')
    vi.clearAllMocks()
    redis.scan.mockResolvedValue(['0', ['cache:wingsgo-curation:7:en']])
  })
  afterEach(() => vi.unstubAllEnvs())

  it('does not scan or delete without a tenant', async () => {
    await clearRedisCurationCache()
    expect(client.getSharedRedisClient).not.toHaveBeenCalled()
    expect(redis.del).not.toHaveBeenCalled()
  })

  it('only scans the selected tenant namespace', async () => {
    await clearRedisCurationCache(7)
    expect(redis.scan).toHaveBeenCalledWith('0', 'MATCH', '*wingsgo-curation:7:*', 'COUNT', 100)
    expect(redis.del).toHaveBeenCalledWith('cache:wingsgo-curation:7:en')
  })
})
