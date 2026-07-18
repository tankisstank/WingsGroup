import { describe, expect, it } from 'vitest'

import { assertDestructiveSeedAllowed } from '@/endpoints/seed/guard'
import { POST as postSeed } from '@/app/(frontend)/next/seed/route'

describe('destructive seed security', () => {
  it('does not expose destructive seed over HTTP', async () => {
    const response = await postSeed()

    expect(response.status).toBe(404)
  })

  it('always rejects production even when explicitly enabled', () => {
    expect(() =>
      assertDestructiveSeedAllowed({ enabled: 'true', nodeEnv: 'production' }),
    ).toThrow('disabled in production')
  })

  it('requires an explicit local opt-in', () => {
    expect(() => assertDestructiveSeedAllowed({ nodeEnv: 'development' })).toThrow(
      'ENABLE_DESTRUCTIVE_SEED=true',
    )
  })

  it('allows a non-production caller only after explicit opt-in', () => {
    expect(() =>
      assertDestructiveSeedAllowed({ enabled: 'true', nodeEnv: 'development' }),
    ).not.toThrow()
  })

  it('refuses a remote database even when NODE_ENV is misconfigured', () => {
    expect(() =>
      assertDestructiveSeedAllowed({
        databaseURL: 'postgresql://user:secret@db.production.example/wings',
        enabled: 'true',
        nodeEnv: 'development',
      }),
    ).toThrow('refuses non-local DATABASE_URL')
  })

  it('allows explicitly opted-in local SQLite and PostgreSQL targets', () => {
    expect(() =>
      assertDestructiveSeedAllowed({
        databaseURL: 'file:./payload.db',
        enabled: 'true',
        nodeEnv: 'test',
      }),
    ).not.toThrow()
    expect(() =>
      assertDestructiveSeedAllowed({
        databaseURL: 'postgresql://postgres:postgres@127.0.0.1:5432/wings_seed_test',
        enabled: 'true',
        nodeEnv: 'test',
      }),
    ).not.toThrow()
  })
})
