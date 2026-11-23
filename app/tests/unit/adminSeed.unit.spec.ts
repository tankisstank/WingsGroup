import { describe, expect, it, vi } from 'vitest'

import {
  assertLocalAdminSeedAllowed,
  ensureLocalAdminUser,
  resolveLocalAdminPassword,
} from '@/utilities/adminSeed'

const postgresURL = 'postgresql://user:pass@db.example.com:5432/prod'

describe('local admin seed guard', () => {
  it('allows a local file: SQLite database or an unset DATABASE_URL', () => {
    expect(assertLocalAdminSeedAllowed({ env: { DATABASE_URL: 'file:./local.db' } })).toBe(
      'local-sqlite',
    )
    expect(assertLocalAdminSeedAllowed({ env: {} })).toBe('local-sqlite')
  })

  it('refuses NODE_ENV=production even on SQLite', () => {
    expect(() =>
      assertLocalAdminSeedAllowed({
        env: { DATABASE_URL: 'file:./local.db', NODE_ENV: 'production' },
      }),
    ).toThrow(/NODE_ENV=production/)
  })

  it('refuses PostgreSQL and remote stores without the disposable opt-in', () => {
    expect(() => assertLocalAdminSeedAllowed({ env: { DATABASE_URL: postgresURL } })).toThrow(
      /not a local file: SQLite/,
    )
    expect(() =>
      assertLocalAdminSeedAllowed({ env: { DATABASE_URL: 'libsql://remote.example.com' } }),
    ).toThrow(/not a local file: SQLite/)
    expect(() =>
      assertLocalAdminSeedAllowed({
        env: {
          DATABASE_URL: 'file:./local.db',
          E09_PREVIEW_STORE_TOKEN: 'token',
          E09_PREVIEW_STORE_URL: 'https://preview-store.example.com',
        },
      }),
    ).toThrow(/not a local file: SQLite/)
  })

  it('allows disposable PostgreSQL only with an explicit opt-in, never in production', () => {
    expect(
      assertLocalAdminSeedAllowed({
        env: { DATABASE_URL: postgresURL, LOCAL_ADMIN_SEED_ALLOW_DISPOSABLE_POSTGRES: 'true' },
      }),
    ).toBe('disposable-postgres')
    expect(
      assertLocalAdminSeedAllowed({
        allowDisposablePostgres: true,
        env: { DATABASE_URL: postgresURL },
      }),
    ).toBe('disposable-postgres')
    expect(() =>
      assertLocalAdminSeedAllowed({
        allowDisposablePostgres: true,
        env: { DATABASE_URL: postgresURL, NODE_ENV: 'production' },
      }),
    ).toThrow(/NODE_ENV=production/)
  })

  it('takes the password from LOCAL_ADMIN_PASSWORD and never uses the dev default on PostgreSQL', () => {
    expect(resolveLocalAdminPassword('local-sqlite', { LOCAL_ADMIN_PASSWORD: 'from-env' })).toBe(
      'from-env',
    )
    expect(
      resolveLocalAdminPassword('disposable-postgres', { LOCAL_ADMIN_PASSWORD: 'from-env' }),
    ).toBe('from-env')
    const generated = resolveLocalAdminPassword('disposable-postgres', {})
    expect(generated).not.toBe('test')
    expect(generated.length).toBeGreaterThanOrEqual(24)
  })
})

describe('ensureLocalAdminUser', () => {
  const createPayload = (existing: unknown[]) => ({
    create: vi.fn(async ({ data }: { data: unknown }) => ({ id: 2, ...(data as object) })),
    find: vi.fn(async () => ({ docs: existing })),
    update: vi.fn(),
  })

  it('throws before touching users when the database is not local', async () => {
    const payload = createPayload([])
    await expect(
      ensureLocalAdminUser(payload as never, undefined, { env: { DATABASE_URL: postgresURL } }),
    ).rejects.toThrow(/not a local file: SQLite/)
    expect(payload.find).not.toHaveBeenCalled()
    expect(payload.create).not.toHaveBeenCalled()
  })

  it('returns an existing user without resetting its password or role', async () => {
    const existing = { email: 'local-admin@wingsgroup.test', id: 1, role: 'editor' }
    const payload = createPayload([existing])
    const result = await ensureLocalAdminUser(payload as never, undefined, {
      env: { DATABASE_URL: 'file:./local.db' },
    })
    expect(result).toBe(existing)
    expect(payload.update).not.toHaveBeenCalled()
    expect(payload.create).not.toHaveBeenCalled()
  })

  it('creates the user with the configured password when it does not exist', async () => {
    const payload = createPayload([])
    await ensureLocalAdminUser(payload as never, undefined, {
      env: { DATABASE_URL: 'file:./local.db', LOCAL_ADMIN_PASSWORD: 'configured-password' },
    })
    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ password: 'configured-password', role: 'super-admin' }),
      }),
    )
  })
})
