import type { NextConfig } from 'next'

export const redirects: NextConfig['redirects'] = async () => {
  const publicCompatibilityRedirects = [
    {
      destination: '/',
      has: [
        {
          type: 'host',
          value:
            '(?:www\\.)?(?:wingsgroup\\.vn|wingsgo\\.vn|wingsplus\\.vn|wingspass\\.wingsgroup\\.vn|wingscare\\.wingsgroup\\.vn)',
        },
      ],
      permanent: true,
      source: '/vi',
    },
    {
      destination: '/tin-tuc',
      has: [
        {
          type: 'host',
          value: '(?:www\\.)?wingsgroup\\.vn',
        },
      ],
      permanent: true,
      source: '/posts',
    },
    {
      destination: '/tin-tuc/:slug*',
      has: [
        {
          type: 'host',
          value: '(?:www\\.)?wingsgroup\\.vn',
        },
      ],
      permanent: true,
      source: '/posts/:slug*',
    },
    {
      destination: '/wing-side',
      permanent: true,
      source: '/wingsside',
    },
    {
      destination: '/wing-side/:path*',
      permanent: true,
      source: '/wingsside/:path*',
    },
  ]

  const wingsGroupLegacyRedirects = [
    {
      destination: '/wingsgroup',
      permanent: true,
      source: '/wingstravel',
    },
    {
      destination: '/wingsgroup/:path*',
      permanent: true,
      source: '/wingstravel/:path*',
    },
  ]

  const wingsPlusCapabilitiesRedirects = [
    {
      destination: '/wingsplus/nang-luc-dich-vu',
      permanent: true,
      source: '/wingsplus/case-studies',
    },
    {
      destination: '/wingsplus/vi/nang-luc-dich-vu',
      permanent: true,
      source: '/wingsplus/vi/case-studies',
    },
    {
      destination: '/wingsplus/en/nang-luc-dich-vu',
      permanent: true,
      source: '/wingsplus/en/case-studies',
    },
  ]

  const internetExplorerRedirect = {
    destination: '/ie-incompatible.html',
    has: [
      {
        type: 'header' as const,
        key: 'user-agent',
        value: '(.*Trident.*)', // all ie browsers
      },
    ],
    permanent: false,
    source: '/:path((?!ie-incompatible.html$).*)', // all pages except the incompatibility page
  }

  return [
    ...publicCompatibilityRedirects,
    ...wingsGroupLegacyRedirects,
    ...wingsPlusCapabilitiesRedirects,
    internetExplorerRedirect,
  ]
}
