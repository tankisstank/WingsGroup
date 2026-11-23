import { describe, expect, it } from 'vitest'

import { isAuthorizedCronRequest } from '@/utilities/cronAuth'

describe('isAuthorizedCronRequest', () => {
  const secret = 'cron-secret-value'

  it('accepts the exact Bearer token', () => {
    expect(isAuthorizedCronRequest(`Bearer ${secret}`, secret)).toBe(true)
  })

  it('rejects wrong, partial, or differently formatted tokens', () => {
    expect(isAuthorizedCronRequest('Bearer wrong-secret', secret)).toBe(false)
    expect(isAuthorizedCronRequest(`Bearer ${secret}x`, secret)).toBe(false)
    expect(isAuthorizedCronRequest('Bearer cron', secret)).toBe(false)
    expect(isAuthorizedCronRequest(secret, secret)).toBe(false)
    expect(isAuthorizedCronRequest(`bearer ${secret}`, secret)).toBe(false)
  })

  it('rejects empty or missing headers', () => {
    expect(isAuthorizedCronRequest('', secret)).toBe(false)
    expect(isAuthorizedCronRequest(null, secret)).toBe(false)
    expect(isAuthorizedCronRequest(undefined, secret)).toBe(false)
  })

  it('rejects every request when the secret is unset', () => {
    expect(isAuthorizedCronRequest('Bearer ', undefined)).toBe(false)
    expect(isAuthorizedCronRequest('Bearer ', '')).toBe(false)
    expect(isAuthorizedCronRequest('Bearer undefined', undefined)).toBe(false)
  })
})
