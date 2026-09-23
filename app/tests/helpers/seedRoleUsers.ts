export const scopedUsers = {
  siteManager: {
    email: '',
    password: '',
  },
  editor: {
    email: '',
    password: '',
  },
} as const

export type RoleScopeSeed = {
  wingsCareSiteID: number | string
  wingsGoSiteID: number | string
}

export async function cleanupRoleScopedUsers(): Promise<void> {
  throw new Error(
    'Account cleanup is disabled for US-074 admin E2E; use a pre-provisioned fixture instead.',
  )
}
