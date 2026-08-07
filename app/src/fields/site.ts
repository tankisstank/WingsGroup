import type { Field, FilterOptionsProps, Where } from 'payload'

import type { AppUser, RelationValue } from '@/types/auth'

import { getUserSiteIDs, isSuperAdmin, normalizeRelationID } from '@/access/roles'

const currentUserSiteFilter = ({ req }: FilterOptionsProps): boolean | Where => {
  const user = req.user as AppUser | undefined

  if (!user) {
    return false
  }

  if (isSuperAdmin(user)) {
    return true
  }

  const siteIDs = getUserSiteIDs(user)

  if (siteIDs.length === 0) {
    return false
  }

  return {
    id: {
      in: siteIDs,
    },
  }
}

export { currentUserSiteFilter }

export const siteField = (): Field => {
  return {
    name: 'site',
    label: 'Site',
    type: 'relationship',
    relationTo: 'sites',
    required: true,
    admin: {
      components: {
        Cell: '@/components/AdminCells/SiteRelationCell',
      },
      position: 'sidebar',
    },
    filterOptions: currentUserSiteFilter,
  }
}

export const sameSiteFilterOptions = ({
  siblingData,
}: FilterOptionsProps<{ site?: RelationValue }>): boolean | Where => {
  const siteID = normalizeRelationID((siblingData as { site?: RelationValue } | undefined)?.site)

  if (!siteID) {
    return true
  }

  return {
    site: {
      equals: siteID,
    },
  }
}
