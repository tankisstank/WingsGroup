import type { CollectionAfterChangeHook } from 'payload'

import { revalidateTag } from 'next/cache.js'

export const revalidateRedirects: CollectionAfterChangeHook = ({ context, doc, req: { payload } }) => {
  if (context.disableRevalidate) {
    return doc
  }

  payload.logger.info(`Revalidating redirects`)
  revalidateTag('redirects', 'max')

  return doc
}
