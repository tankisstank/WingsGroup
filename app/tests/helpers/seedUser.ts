import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

export const testUser = {
  email: 'dev@payloadcms.com',
  password: 'test',
  role: 'super-admin',
} as const

const retrySQLiteBusy = async <T>(operation: () => Promise<T>): Promise<T> => {
  let lastError: unknown

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (!String(error).includes('SQLITE_BUSY') || attempt === 4) {
        break
      }

      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)))
    }
  }

  throw lastError
}

/**
 * Seeds a test user for e2e admin tests.
 */
export async function seedTestUser(): Promise<void> {
  const payload = await getPayload({ config })

  // Delete existing test user if any
  await retrySQLiteBusy(() =>
    payload.delete({
      collection: 'users',
      where: {
        email: {
          equals: testUser.email,
        },
      },
    }),
  )

  // Create fresh test user
  await payload.create({
    collection: 'users',
    context: {
      seed: true,
    },
    data: testUser,
  })
}

/**
 * Cleans up test user after tests
 */
export async function cleanupTestUser(): Promise<void> {
  const payload = await getPayload({ config })

  await retrySQLiteBusy(() =>
    payload.delete({
      collection: 'users',
      where: {
        email: {
          equals: testUser.email,
        },
      },
    }),
  )
}
