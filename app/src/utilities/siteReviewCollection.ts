import type { createLocalReq, Payload } from 'payload'

import type { Page, Post } from '@/payload-types'

export const loadCollection = async <T extends Page | Post>({
  collection,
  payload,
  req,
}: {
  collection: 'pages' | 'posts'
  payload: Payload
  req: Awaited<ReturnType<typeof createLocalReq>>
}): Promise<{ docs: T[] }> => {
  const docs: T[] = []
  const pageLimit = 100
  let page = 1

  while (page <= 10_000) {
    const result = (await payload.find({
      collection,
      depth: 1,
      limit: pageLimit,
      overrideAccess: false,
      page,
      pagination: true,
      req,
      sort: collection === 'pages' ? 'pathname' : 'slug',
    })) as unknown as { docs: T[]; hasNextPage?: boolean; nextPage?: number | null }

    docs.push(...result.docs)
    if (!result.hasNextPage) return { docs }

    const nextPage = result.nextPage || page + 1
    if (nextPage <= page) throw new Error(`Site Review pagination did not advance for ${collection}`)
    page = nextPage
  }

  throw new Error(`Site Review pagination exceeded the safety limit for ${collection}`)
}
