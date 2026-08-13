import type { CollectionBeforeChangeHook } from 'payload'

type UnknownRecord = Record<string, unknown>

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {}

const relationID = (value: unknown): number | string | undefined => {
  if (typeof value === 'number' || typeof value === 'string') return value
  const record = asRecord(value)
  return typeof record.id === 'number' || typeof record.id === 'string' ? record.id : undefined
}

const sameID = (left: unknown, right: unknown): boolean => {
  const leftID = relationID(left)
  const rightID = relationID(right)
  return leftID !== undefined && rightID !== undefined && String(leftID) === String(rightID)
}

/**
 * Payload admin relationship filters are editor guidance, not authorization.
 * This hook re-checks every WingsGroup v3 block media relation at the trusted
 * server boundary and applies publication gates only when the Page is public.
 */
export const validateWingsGroupV3Governance: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const site = data?.site ?? originalDoc?.site
  const layout = data?.layout ?? originalDoc?.layout
  if (!site || !Array.isArray(layout)) return data

  const isPublishing = (data?._status ?? originalDoc?._status) === 'published'
  const checks: Array<{ kind: 'editorial' | 'proof'; media: unknown }> = []

  for (const rawBlock of layout) {
    const block = asRecord(rawBlock)
    if (block.blockType === 'wingsGroupEcosystem') {
      for (const rawProfile of Array.isArray(block.profiles) ? block.profiles : []) {
        const profile = asRecord(rawProfile)
        if (profile.stageMedia) checks.push({ kind: 'editorial', media: profile.stageMedia })
      }
    }

    if (block.blockType === 'wingsGroupProofArchive') {
      for (const rawProof of Array.isArray(block.records) ? block.records : []) {
        const proof = asRecord(rawProof)
        if (proof.publicationState === 'approved' && proof.media) {
          checks.push({ kind: 'proof', media: proof.media })
        }
      }
    }
  }

  const mediaByID = new Map<string, UnknownRecord>()
  for (const check of checks) {
    const id = relationID(check.media)
    if (id === undefined) throw new Error('WingsGroup v3 media relation không hợp lệ.')
    const key = String(id)
    if (!mediaByID.has(key)) {
      const media = await req.payload.findByID({
        collection: 'media',
        id,
        depth: 0,
        overrideAccess: true,
        req,
      })
      mediaByID.set(key, asRecord(media))
    }

    const media = mediaByID.get(key)!
    if (!sameID(media.site, site)) {
      throw new Error('WingsGroup v3 block không được tham chiếu media của tenant khác.')
    }

    if (!isPublishing) continue
    const governance = asRecord(media.governance)
    if (governance.managedBy === 'wingsgroup-v3' && governance.publicationState !== 'published') {
      throw new Error('WingsGroup v3 page không được publish với media chưa qua publication gate.')
    }
    if (check.kind === 'proof' && governance.usageScope === 'editorial-service') {
      throw new Error('Editorial/service media không được sử dụng làm legal hoặc trust proof.')
    }
  }

  return data
}
