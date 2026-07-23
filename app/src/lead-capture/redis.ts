import { createHash } from 'node:crypto'

import type Redis from 'ioredis'
import { ensureRedisConnected, getSharedRedisClient } from '@/infrastructure/redis/client'

const RATE_LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
if count > tonumber(ARGV[2]) then return {0, count} end
return {1, count}
`

export type LeadRateLimitResult = {
  allowed: boolean
  formCount: number
  ipCount: number
  requiresChallenge: boolean
}

export type LeadRedisStore = {
  checkIPRateLimit(input: { ip: string }): Promise<LeadRateLimitResult>
  checkValidatedRateLimits(input: { formId: number | string; siteCode: string }): Promise<LeadRateLimitResult>
  completeIdempotency(key: string, submissionId: number | string): Promise<void>
  releaseIdempotency(key: string): Promise<void>
  reserveIdempotency(key: string): Promise<boolean>
}

const getRedis = (): Redis => {
  if (!process.env.REDIS_URL) throw new Error('Lead capture requires REDIS_URL.')
  return getSharedRedisClient()
}

const ensureConnected = async (client: Redis): Promise<void> => {
  await ensureRedisConnected(client)
}

const digest = (value: string): string => createHash('sha256').update(value).digest('hex')
const prefix = (): string => process.env.REDIS_KEY_PREFIX || process.env.NODE_ENV || 'development'

export const getClientIP = (headers: Headers): string => {
  // Only middleware-generated context is accepted. Nginx overwrites
  // X-Real-IP; middleware strips public X-Client-IP and recreates it from that
  // edge-owned value. Never fall back to X-Forwarded-For/CF-Connecting-IP.
  const candidate =
    headers.get('x-site-context-source') === 'proxy'
      ? headers.get('x-client-ip') || 'unknown'
      : 'unknown'
  return candidate.slice(0, 128)
}

export const createLeadRedisStore = (): LeadRedisStore => {
  const client = getRedis()

  return {
    async checkIPRateLimit({ ip }) {
      await ensureConnected(client)
      const ipHash = digest(ip)
      const base = `wingstravel:${prefix()}:lead`
      const result = (await client.eval(
        RATE_LIMIT_SCRIPT,
        1,
        `${base}:rate:ip:${ipHash}`,
        10 * 60 * 1000,
        5,
      )) as [number, number]

      return {
        allowed: Number(result[0]) === 1,
        formCount: 0,
        ipCount: Number(result[1]),
        requiresChallenge: process.env.TURNSTILE_ALWAYS_REQUIRED === 'true' || Number(result[1]) > 2,
      }
    },
    async checkValidatedRateLimits({ formId, siteCode }) {
      await ensureConnected(client)
      const base = `wingstravel:${prefix()}:lead:rate`
      // These keys are created only after Payload has confirmed the form and
      // tenant relationship, so arbitrary public formId values cannot create
      // unbounded Redis key cardinality.
      const [siteResult, formResult] = await Promise.all([
        client.eval(RATE_LIMIT_SCRIPT, 1, `${base}:site:${siteCode}`, 60 * 60 * 1000, 100),
        client.eval(RATE_LIMIT_SCRIPT, 1, `${base}:form:${siteCode}:${formId}`, 60 * 60 * 1000, 20),
      ]) as [[number, number], [number, number]]
      return {
        allowed: Number(siteResult[0]) === 1 && Number(formResult[0]) === 1,
        formCount: Number(formResult[1]),
        ipCount: Number(siteResult[1]),
        requiresChallenge: false,
      }
    },
    async reserveIdempotency(key) {
      await ensureConnected(client)
      const result = await client.set(
        `wingstravel:${prefix()}:lead:idempotency:${digest(key)}`,
        'pending',
        'EX',
        24 * 60 * 60,
        'NX',
      )
      return result === 'OK'
    },
    async completeIdempotency(key, submissionId) {
      await ensureConnected(client)
      await client.set(
        `wingstravel:${prefix()}:lead:idempotency:${digest(key)}`,
        `accepted:${submissionId}`,
        'EX',
        24 * 60 * 60,
        'XX',
      )
    },
    async releaseIdempotency(key) {
      await ensureConnected(client)
      await client.del(`wingstravel:${prefix()}:lead:idempotency:${digest(key)}`)
    },
  }
}

export const checkLeadRedisHealth = async (): Promise<'disabled' | 'up'> => {
  if (!process.env.REDIS_URL) return 'disabled'
  const client = getRedis()
  await ensureConnected(client)
  await client.ping()
  return 'up'
}
