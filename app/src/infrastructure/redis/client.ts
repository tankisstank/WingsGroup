import Redis from 'ioredis'

let redisClient: Redis | null = null

/** One lazy Redis connection per Node.js process, shared by cache and KV users. */
export const getSharedRedisClient = (): Redis => {
  if (redisClient) return redisClient

  const url = process.env.REDIS_URL
  if (!url) throw new Error('REDIS_URL is not configured.')

  redisClient = new Redis(url, {
    connectTimeout: 2000,
    enableOfflineQueue: false,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  })
  redisClient.on('error', () => undefined)
  return redisClient
}

export const ensureRedisConnected = async (client: Redis): Promise<void> => {
  if (client.status === 'wait') await client.connect()
  if (client.status !== 'ready') await client.ping()
}

