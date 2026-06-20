import type { NextConfig } from 'next'

export const redirects: NextConfig['redirects'] = async () => {
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

  return [...wingsGroupLegacyRedirects, ...wingsPlusCapabilitiesRedirects, internetExplorerRedirect]
}
