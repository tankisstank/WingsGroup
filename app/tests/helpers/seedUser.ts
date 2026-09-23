/**
 * Retained as a compatibility import for older test references. US-074 never
 * creates, deletes, or resets accounts; admin E2E reads credentials from the
 * pre-provisioned fixture contract in adminE2EConfig.ts.
 */
export async function seedTestUser(): Promise<never> {
  throw new Error(
    'Account lifecycle is disabled for US-074 admin E2E; provide pre-provisioned credentials instead.',
  )
}

export async function cleanupTestUser(): Promise<never> {
  throw new Error(
    'Account cleanup is disabled for US-074 admin E2E; tests must not mutate Users/Roles.',
  )
}
