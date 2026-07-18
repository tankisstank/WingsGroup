export const assertDestructiveSeedAllowed = ({
  databaseURL = process.env.DATABASE_URL,
  enabled = process.env.ENABLE_DESTRUCTIVE_SEED,
  nodeEnv = process.env.NODE_ENV,
}: {
  databaseURL?: string
  enabled?: string
  nodeEnv?: string
} = {}): void => {
  if (nodeEnv === 'production') {
    throw new Error('Destructive seed is disabled in production.')
  }

  if (enabled !== 'true') {
    throw new Error('Set ENABLE_DESTRUCTIVE_SEED=true to run the local destructive seed.')
  }

  if (!databaseURL || databaseURL.startsWith('file:')) {
    return
  }

  let database: URL

  try {
    database = new URL(databaseURL)
  } catch {
    throw new Error('Destructive seed requires a local SQLite or PostgreSQL DATABASE_URL.')
  }

  const isPostgres = database.protocol === 'postgres:' || database.protocol === 'postgresql:'
  const isLoopback = ['127.0.0.1', '::1', 'localhost'].includes(database.hostname)

  if (!isPostgres || !isLoopback) {
    throw new Error('Destructive seed refuses non-local DATABASE_URL targets.')
  }
}
