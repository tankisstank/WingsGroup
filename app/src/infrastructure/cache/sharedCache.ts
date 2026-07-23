import { createHash } from 'node:crypto'

import { ensureRedisConnected, getSharedRedisClient } from '@/infrastructure/redis/client'

type Entry = { expiresAt: number; value: unknown }

const memory = new Map<string, Entry>()
const pending = new Map<string, Promise<unknown>>()
const revisions = new Map<string, number>()
let globalRevision = 0
const MAX_MEMORY_ENTRIES = 200
const DEFAULT_TTL_SECONDS = 60

const ttlSeconds = (): number => {
  const configured = Number.parseInt(process.env.SITE_CACHE_TTL_SECONDS || '', 10)
  return Number.isFinite(configured) ? Math.min(300, Math.max(5, configured)) : DEFAULT_TTL_SECONDS
}

const environmentPrefix = (): string =>
  (process.env.REDIS_KEY_PREFIX || process.env.NODE_ENV || 'development').replace(/[^a-zA-Z0-9_-]/g, '_')

const safePart = (value: string | number): string => {
  const normalized = String(value)
  if (/^[a-zA-Z0-9_-]{1,80}$/.test(normalized)) return normalized
  return createHash('sha256').update(normalized).digest('hex')
}

const cacheKey = (namespace: string, tenant: string | number, variant: string): string =>
  `wingstravel:${environmentPrefix()}:cache:${safePart(namespace)}:${safePart(tenant)}:${safePart(variant)}`

const remember = (key: string, value: unknown): void => {
  memory.delete(key)
  memory.set(key, { expiresAt: Date.now() + ttlSeconds() * 1000, value })
  while (memory.size > MAX_MEMORY_ENTRIES) {
    const oldest = memory.keys().next().value
    if (typeof oldest !== 'string') break
    memory.delete(oldest)
  }
}

const readMemory = <T>(key: string): T | undefined => {
  const entry = memory.get(key)
  if (!entry) return undefined
  if (entry.expiresAt <= Date.now()) {
    memory.delete(key)
    return undefined
  }
  memory.delete(key)
  memory.set(key, entry)
  return entry.value as T
}

export const getSharedCachedValue = async <T>({
  load,
  namespace,
  tenant,
  variant,
}: {
  load: () => Promise<T>
  namespace: string
  tenant: number | string
  variant: string
}): Promise<T> => {
  const key = cacheKey(namespace, tenant, variant)
  const local = readMemory<T>(key)
  if (local !== undefined) return local

  const inFlight = pending.get(key)
  if (inFlight) return inFlight as Promise<T>

  const operationRevision = revisions.get(key) || 0
  const operationGlobalRevision = globalRevision

  const operation = (async () => {
    if (process.env.REDIS_URL) {
      try {
        const redis = getSharedRedisClient()
        await ensureRedisConnected(redis)
        const serialized = await redis.get(key)
        if (serialized !== null) {
          const value = JSON.parse(serialized) as T
          remember(key, value)
          return value
        }
      } catch {
        // Redis is an optimization. Database-backed resolution remains available.
      }
    }

    const value = await load()
    const isCurrent =
      operationGlobalRevision === globalRevision && operationRevision === (revisions.get(key) || 0)
    if (isCurrent) remember(key, value)

    if (process.env.REDIS_URL && isCurrent) {
      try {
        const redis = getSharedRedisClient()
        await ensureRedisConnected(redis)
        await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds())
      } catch {
        // Do not turn a cache outage into a public-site outage.
      }
    }
    return value
  })().finally(() => {
    if (pending.get(key) === operation) pending.delete(key)
  })

  pending.set(key, operation)
  return operation
}

export const invalidateSharedCache = async ({
  namespace,
  tenant,
  variants,
}: {
  namespace: string
  tenant: number | string
  variants: string[]
}): Promise<void> => {
  const keys = variants.map((variant) => cacheKey(namespace, tenant, variant))
  keys.forEach((key) => {
    memory.delete(key)
    pending.delete(key)
    revisions.set(key, (revisions.get(key) || 0) + 1)
  })
  if (!process.env.REDIS_URL) return
  try {
    const redis = getSharedRedisClient()
    await ensureRedisConnected(redis)
    if (keys.length > 0) await redis.del(...keys)
  } catch {
    // Bounded TTL guarantees eventual consistency if invalidation cannot reach Redis.
  }
}

export const clearSharedMemoryCache = (): void => {
  globalRevision += 1
  memory.clear()
  pending.clear()
  revisions.clear()
}
