import type { Metadata } from 'next'

export const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  description: 'Multi-site content platform for WingsGroup and its service brands.',
  images: [
    {
      url: '/website-template-OG.webp',
    },
  ],
  siteName: 'WingsGroup',
  title: 'WingsGroup',
}

export const mergeOpenGraph = (og?: Metadata['openGraph']): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
