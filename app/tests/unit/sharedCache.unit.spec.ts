import { beforeEach, describe, expect, it, vi } from 'vitest'

const redis = vi.hoisted(() => ({
  del: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
}))

const redisClient = vi.hoisted(() => ({
  ensureRedisConnected: vi.fn(),
  getSharedRedisClient: vi.fn(() => redis),
}))

vi.mock('@/infrastructure/redis/client', () => redisClient)

import {
  clearSharedMemoryCache,
  getSharedCachedValue,
  invalidateSharedCache,
} from '@/infrastructure/cache/sharedCache'

describe('shared tenant cache', () => {
  beforeEach(() => {
    clearSharedMemoryCache()
    delete process.env.REDIS_URL
    process.env.REDIS_KEY_PREFIX = 'test'
    redis.del.mockReset().mockResolvedValue(1)
    redis.get.mockReset().mockResolvedValue(null)
    redis.set.mockReset().mockResolvedValue('OK')
    redisClient.ensureRedisConnected.mockReset().mockResolvedValue(undefined)
    redisClient.getSharedRedisClient.mockClear()
  })

  it('deduplicates concurrent database loads and keeps a bounded local fallback', async () => {
    const load = vi.fn(async () => ({ id: 1 }))
    const input = { load, namespace: 'site-settings', tenant: 1, variant: 'vi' }

    const [first, second] = await Promise.all([
      getSharedCachedValue(input),
      getSharedCachedValue(input),
    ])

    expect(first).toEqual({ id: 1 })
    expect(second).toEqual({ id: 1 })
    expect(load).toHaveBeenCalledOnce()
    expect(redisClient.getSharedRedisClient).not.toHaveBeenCalled()
  })

  it('uses a shared Redis hit without querying the database', async () => {
    process.env.REDIS_URL = 'redis://cache'
    redis.get.mockResolvedValue(JSON.stringify({ id: 2, siteName: 'WingsGo' }))
    const load = vi.fn()

    await expect(
      getSharedCachedValue({ load, namespace: 'site-settings', tenant: 2, variant: 'en' }),
    ).resolves.toEqual({ id: 2, siteName: 'WingsGo' })

    expect(load).not.toHaveBeenCalled()
    expect(redis.get).toHaveBeenCalledWith('wingstravel:test:cache:site-settings:2:en')
  })

  it('degrades to the database when Redis is unavailable', async () => {
    process.env.REDIS_URL = 'redis://cache'
    redisClient.ensureRedisConnected.mockRejectedValue(new Error('offline'))
    const load = vi.fn(async () => ({ code: 'wings-care' }))

    await expect(
      getSharedCachedValue({ load, namespace: 'sites', tenant: 'wings-care', variant: 'active' }),
    ).resolves.toEqual({ code: 'wings-care' })
    expect(load).toHaveBeenCalledOnce()
  })

  it('keeps tenant and locale keys isolated', async () => {
    process.env.REDIS_URL = 'redis://cache'
    await getSharedCachedValue({
      load: async () => ({ id: 1 }),
      namespace: 'site-settings',
      tenant: 1,
      variant: 'vi',
    })
    await getSharedCachedValue({
      load: async () => ({ id: 2 }),
      namespace: 'site-settings',
      tenant: 2,
      variant: 'en',
    })

    expect(redis.set).toHaveBeenCalledWith(
      'wingstravel:test:cache:site-settings:1:vi',
      JSON.stringify({ id: 1 }),
      'EX',
      60,
    )
    expect(redis.set).toHaveBeenCalledWith(
      'wingstravel:test:cache:site-settings:2:en',
      JSON.stringify({ id: 2 }),
      'EX',
      60,
    )
  })

  it('invalidates only explicitly bounded variants without Redis key scans', async () => {
    process.env.REDIS_URL = 'redis://cache'
    await invalidateSharedCache({
      namespace: 'site-settings',
      tenant: 7,
      variants: ['vi', 'en'],
    })

    expect(redis.del).toHaveBeenCalledWith(
      'wingstravel:test:cache:site-settings:7:vi',
      'wingstravel:test:cache:site-settings:7:en',
    )
  })

  it('does not repopulate stale cache data when invalidation races an in-flight load', async () => {
    let release!: (value: { id: number }) => void
    const staleLoad = vi.fn(
      () =>
        new Promise<{ id: number }>((resolve) => {
          release = resolve
        }),
    )

    const pendingRead = getSharedCachedValue({
      load: staleLoad,
      namespace: 'site-settings',
      tenant: 9,
      variant: 'vi',
    })
    await invalidateSharedCache({
      namespace: 'site-settings',
      tenant: 9,
      variants: ['vi'],
    })
    const freshLoad = vi.fn(async () => ({ id: 2 }))
    const freshRead = getSharedCachedValue({
      load: freshLoad,
      namespace: 'site-settings',
      tenant: 9,
      variant: 'vi',
    })
    release({ id: 1 })
    await expect(pendingRead).resolves.toEqual({ id: 1 })
    await expect(freshRead).resolves.toEqual({ id: 2 })
    expect(freshLoad).toHaveBeenCalledOnce()
  })
})
