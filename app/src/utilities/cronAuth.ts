import { createHash, timingSafeEqual } from 'node:crypto'

const sha256 = (value: string): Buffer => createHash('sha256').update(value, 'utf8').digest()

export const isAuthorizedCronRequest = (
  authorizationHeader: string | null | undefined,
  secret: string | null | undefined,
): boolean => {
  if (!secret || !authorizationHeader) return false
  // Hash both sides so the comparison is constant-time and length-independent.
  return timingSafeEqual(sha256(authorizationHeader), sha256(`Bearer ${secret}`))
}
