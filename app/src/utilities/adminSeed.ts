import { randomBytes } from 'node:crypto'

import type { Payload, PayloadRequest } from 'payload'

export const localAdminCredentials = {
  email: 'local-admin@wingsgroup.test',
  name: 'Local Admin',
  role: 'super-admin',
} as const

export const LOCAL_ADMIN_PASSWORD_ENV = 'LOCAL_ADMIN_PASSWORD'
export const LOCAL_ADMIN_SEED_ALLOW_DISPOSABLE_POSTGRES_ENV =
  'LOCAL_ADMIN_SEED_ALLOW_DISPOSABLE_POSTGRES'

// Only usable on a local SQLite bootstrap database; never on shared/production stores.
const LOCAL_SQLITE_DEVELOPMENT_PASSWORD = 'test'

type SeedEnvironment = Record<string, string | undefined>

export type LocalAdminSeedOptions = {
  /** Allow a disposable PostgreSQL database owned by a test/proof harness. */
  allowDisposablePostgres?: boolean
  env?: SeedEnvironment
}

type SeedDatabaseKind = 'local-sqlite' | 'disposable-postgres'

const resolveSeedDatabaseURL = (env: SeedEnvironment): string => {
  const previewStoreURL = env.E09_PREVIEW_STORE_URL?.trim()
  if (previewStoreURL && env.E09_PREVIEW_STORE_TOKEN?.trim()) return previewStoreURL
  // payload.config falls back to a local `file:` SQLite database when DATABASE_URL is unset.
  return env.DATABASE_URL?.trim() || 'file:'
}

export const assertLocalAdminSeedAllowed = (
  options: LocalAdminSeedOptions = {},
): SeedDatabaseKind => {
  const env = options.env ?? process.env

  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed the local admin user when NODE_ENV=production.')
  }

  const databaseURL = resolveSeedDatabaseURL(env)
  if (databaseURL.startsWith('file:')) return 'local-sqlite'

  const isPostgres = /^postgres(?:ql)?:\/\//.test(databaseURL)
  const disposablePostgresAllowed =
    options.allowDisposablePostgres === true ||
    env[LOCAL_ADMIN_SEED_ALLOW_DISPOSABLE_POSTGRES_ENV] === 'true'
  if (isPostgres && disposablePostgresAllowed) return 'disposable-postgres'

  throw new Error(
    'Refusing to seed the local admin user: DATABASE_URL is not a local file: SQLite database. ' +
      `Disposable PostgreSQL test harnesses must set ${LOCAL_ADMIN_SEED_ALLOW_DISPOSABLE_POSTGRES_ENV}=true.`,
  )
}

export const resolveLocalAdminPassword = (
  databaseKind: SeedDatabaseKind,
  env: SeedEnvironment = process.env,
): string => {
  const configured = env[LOCAL_ADMIN_PASSWORD_ENV]
  if (configured) return configured
  if (databaseKind === 'local-sqlite') return LOCAL_SQLITE_DEVELOPMENT_PASSWORD
  return randomBytes(24).toString('base64url')
}

/** Password to log in as the seeded local admin (E2E and local tooling). */
export const getLocalAdminPassword = (env: SeedEnvironment = process.env): string =>
  env[LOCAL_ADMIN_PASSWORD_ENV] || LOCAL_SQLITE_DEVELOPMENT_PASSWORD

const seedContext = {
  disableRevalidate: true,
  seed: true,
}

export const ensureLocalAdminUser = async (
  payload: Payload,
  req?: PayloadRequest,
  options: LocalAdminSeedOptions = {},
) => {
  const databaseKind = assertLocalAdminSeedAllowed(options)

  const existing = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: {
      email: {
        equals: localAdminCredentials.email,
      },
    },
  })

  // Never reset the password or role of an existing account.
  if (existing.docs[0]) return existing.docs[0]

  return payload.create({
    collection: 'users',
    context: seedContext,
    data: {
      email: localAdminCredentials.email,
      name: localAdminCredentials.name,
      password: resolveLocalAdminPassword(databaseKind, options.env ?? process.env),
      role: localAdminCredentials.role,
      sites: [],
    },
    overrideAccess: true,
    req,
  })
}
