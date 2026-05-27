import type { JSONLD } from '@/utilities/structuredData'

import { stringifyJSONLD } from '@/utilities/structuredData'

export const JsonLd = ({
  data,
}: {
  data: JSONLD | Array<JSONLD | null | undefined> | null | undefined
}) => {
  const nodes = Array.isArray(data) ? data.filter((node): node is JSONLD => Boolean(node)) : data ? [data] : []

  if (nodes.length === 0) {
    return null
  }

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: stringifyJSONLD(nodes),
      }}
      type="application/ld+json"
    />
  )
}
