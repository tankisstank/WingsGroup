import type { Metadata } from 'next'
import { getServerSideURL } from './getURL'

export const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  description: 'Multi-site content platform for WingsTravel and its service brands.',
  images: [
    {
      url: `${getServerSideURL()}/website-template-OG.webp`,
    },
  ],
  siteName: 'WingsTravel',
  title: 'WingsTravel',
}

export const mergeOpenGraph = (og?: Metadata['openGraph']): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
