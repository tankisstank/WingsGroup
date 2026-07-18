import { getPayload } from 'payload'

import config from '../../src/payload.config.js'

const password = 'test'

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

export const scopedUsers = {
  siteManager: {
    email: 'phase1-site-manager@example.com',
    password,
  },
  editor: {
    email: 'phase1-editor@example.com',
    password,
  },
} as const

export type RoleScopeSeed = {
  wingsCareSiteID: number | string
  wingsGoSiteID: number | string
}

export async function seedRoleScopedUsers(): Promise<RoleScopeSeed> {
  const payload = await getPayload({ config })
  const sites = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 10,
    pagination: false,
    where: {
      code: {
        in: ['wings-go', 'wings-care'],
      },
    },
  })

  const wingsGo = sites.docs.find((site) => site.code === 'wings-go')
  const wingsCare = sites.docs.find((site) => site.code === 'wings-care')

  if (!wingsGo || !wingsCare) {
    throw new Error('WingsGo and WingsCare sites must exist before role-scoped E2E tests run.')
  }

  await cleanupRoleScopedUsers()

  await payload.create({
    collection: 'users',
    context: {
      seed: true,
    },
    data: {
      ...scopedUsers.siteManager,
      name: 'Phase 1 Site Manager',
      role: 'site-manager',
      sites: [wingsGo.id],
    },
  })

  await payload.create({
    collection: 'users',
    context: {
      seed: true,
    },
    data: {
      ...scopedUsers.editor,
      name: 'Phase 1 Editor',
      role: 'editor',
      sites: [wingsGo.id],
    },
  })

  return {
    wingsCareSiteID: wingsCare.id,
    wingsGoSiteID: wingsGo.id,
  }
}

export async function cleanupRoleScopedUsers(): Promise<void> {
  const payload = await getPayload({ config })

  await retrySQLiteBusy(() =>
    payload.delete({
      collection: 'users',
      where: {
        email: {
          in: [scopedUsers.siteManager.email, scopedUsers.editor.email],
        },
      },
    }),
  )
}
