import type { Access, Where } from 'payload'

import type { AppRole, AppUser, RelationID, RelationValue } from '@/types/auth'

const contentRoles: AppRole[] = ['super-admin', 'site-manager', 'editor']
const managerRoles: AppRole[] = ['super-admin', 'site-manager']

export const normalizeRelationID = (value: RelationValue): RelationID | undefined => {
  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }

  if (value && typeof value === 'object' && 'id' in value) {
    return value.id
  }

  return undefined
}

export const hasRole = (user: AppUser | null | undefined, roles: AppRole[]): boolean => {
  return Boolean(user?.role && roles.includes(user.role))
}

export const isSuperAdmin = (user: AppUser | null | undefined): boolean => {
  return user?.role === 'super-admin'
}

export const getUserSiteIDs = (user: AppUser | null | undefined): RelationID[] => {
  if (!Array.isArray(user?.sites)) {
    return []
  }

  return user.sites
    .map((site) => normalizeRelationID(site))
    .filter((siteID): siteID is RelationID => siteID !== undefined)
}

export const buildSiteWhere = (fieldName = 'site', siteIDs: RelationID[] = []): Where | false => {
  if (siteIDs.length === 0) {
    return false
  }

  return {
    [fieldName]: {
      in: siteIDs,
    },
  }
}

export const canAccessAdmin: Access = ({ req }) => {
  return Boolean(req.user)
}

export const adminAccess = ({ req }: { req: { user?: unknown } }): boolean => {
  return Boolean(req.user)
}

export const contentCreateAccess: Access = ({ req }) => {
  return hasRole(req.user as AppUser | undefined, contentRoles)
}

export const contentDeleteAccess: Access = ({ req }) => {
  return hasRole(req.user as AppUser | undefined, managerRoles)
}

export const superAdminOnly: Access = ({ req }) => {
  return isSuperAdmin(req.user as AppUser | undefined)
}

export const usersReadAccess: Access = ({ req }) => {
  const user = req.user as AppUser | undefined

  if (!user) {
    return false
  }

  if (isSuperAdmin(user)) {
    return true
  }

  if (user.role === 'site-manager') {
    const siteIDs = getUserSiteIDs(user)

    if (siteIDs.length === 0) {
      return {
        id: {
          equals: user.id,
        },
      } as Where
    }

    return {
      or: [
        {
          id: {
            equals: user.id,
          },
        },
        {
          sites: {
            in: siteIDs,
          },
        },
      ],
    } as Where
  }

  return {
    id: {
      equals: user.id,
    },
  } as Where
}

export const usersUpdateAccess: Access = ({ req }) => {
  const user = req.user as AppUser | undefined

  if (!user) {
    return false
  }

  if (isSuperAdmin(user)) {
    return true
  }

  return {
    id: {
      equals: user.id,
    },
  } as Where
}

export const superAdminFieldAccess = ({ req }: { req: { user?: unknown } }): boolean => {
  return isSuperAdmin(req.user as AppUser | undefined)
}
