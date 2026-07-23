import { randomUUID } from 'node:crypto'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  clearSharedMemoryCache,
  getSharedCachedValue,
  invalidateSharedCache,
} from '@/infrastructure/cache/sharedCache'
import { ensureRedisConnected, getSharedRedisClient } from '@/infrastructure/redis/client'

const redisURL = process.env.TEST_REDIS_URL
const describeRedis = redisURL ? describe : describe.skip

describeRedis('shared cache with Redis', () => {
  const prefix = `cache-int-${randomUUID()}`
  const previousPrefix = process.env.REDIS_KEY_PREFIX
  const previousRedisURL = process.env.REDIS_URL

  beforeAll(async () => {
    process.env.REDIS_URL = redisURL
    process.env.REDIS_KEY_PREFIX = prefix
    await ensureRedisConnected(getSharedRedisClient())
  })

  afterAll(async () => {
    clearSharedMemoryCache()
    const redis = getSharedRedisClient()
    const keys = await redis.keys(`wingstravel:${prefix}:*`)
    if (keys.length > 0) await redis.del(...keys)
    if (previousRedisURL === undefined) delete process.env.REDIS_URL
    else process.env.REDIS_URL = previousRedisURL
    if (previousPrefix === undefined) delete process.env.REDIS_KEY_PREFIX
    else process.env.REDIS_KEY_PREFIX = previousPrefix
  })

  it('shares values across process-local cache resets and invalidates exact tenant variants', async () => {
    const firstLoad = async () => ({ id: 41, siteName: 'WingsTravel' })
    await getSharedCachedValue({
      load: firstLoad,
      namespace: 'site-settings',
      tenant: 41,
      variant: 'vi',
    })

    clearSharedMemoryCache()
    const databaseLoad = async () => ({ id: 999 })
    await expect(
      getSharedCachedValue({
        load: databaseLoad,
        namespace: 'site-settings',
        tenant: 41,
        variant: 'vi',
      }),
    ).resolves.toEqual({ id: 41, siteName: 'WingsTravel' })

    await invalidateSharedCache({
      namespace: 'site-settings',
      tenant: 41,
      variants: ['vi'],
    })
    clearSharedMemoryCache()
    await expect(
      getSharedCachedValue({
        load: databaseLoad,
        namespace: 'site-settings',
        tenant: 41,
        variant: 'vi',
      }),
    ).resolves.toEqual({ id: 999 })
  })
})
