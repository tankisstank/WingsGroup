import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

import {
  applicationSecurityHeaders,
  productionTransportSecurityHeader,
} from './src/utilities/securityHeaders'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)
import { redirects } from './redirects'

const configuredServerURL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.NEXT_PUBLIC_SERVER_URL || process.env.__NEXT_PRIVATE_ORIGIN

const remoteImagePatterns = configuredServerURL
  ? (() => {
      const url = new URL(configuredServerURL)
      const isLocalOrPlaceholder =
        ['localhost', '127.0.0.1', 'example.com'].includes(url.hostname) ||
        url.hostname.endsWith('.invalid')

      if (process.env.NODE_ENV === 'production' && isLocalOrPlaceholder) {
        return []
      }

      return [
        {
          hostname: url.hostname,
          protocol: url.protocol.replace(':', '') as 'http' | 'https',
        },
      ]
    })()
  : []

const allowedDevOrigins = [
  'wingsgroup.vn',
  'www.wingsgroup.vn',
  'wingsgo.vn',
  'www.wingsgo.vn',
  'wingsplus.vn',
  'www.wingsplus.vn',
  'wingscare.wingsgroup.vn',
  'wingspass.wingsgroup.vn',
  'wingside.vn',
  'www.wingside.vn',
  // Allow Next.js dev resources and HMR through the local Tailscale interface.
  '100.89.49.21',
  'ubuntu-docker.taild819fc.ts.net',
]

const nextConfig: NextConfig = {
  output: 'standalone',
  // Payload's SQLite adapter loads libsql through an optional runtime path;
  // include it explicitly so standalone local/staging smoke servers can boot.
  outputFileTracingIncludes: {
    '/*': ['./node_modules/libsql/**/*', './node_modules/@libsql/**/*'],
  },
  allowedDevOrigins,
  // Temporarily required on Windows until Next.js fixes Turbopack Sass resolution.
  // See: https://github.com/vercel/next.js/issues/86431
  sassOptions: {
    loadPaths: ['./node_modules/@payloadcms/ui/dist/scss/'],
  },
  images: {
    localPatterns: [
      {
        pathname: '/media/**',
      },
      {
        pathname: '/brand/**',
      },
    ],
    qualities: [80],
    remotePatterns: remoteImagePatterns,
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  reactStrictMode: true,
  redirects,
  async headers() {
    return [
      // Administrative and API responses can be user-specific. Keep this
      // explicit even when an individual route does not set its own policy.
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/next/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          ...applicationSecurityHeaders,
          ...(process.env.NODE_ENV === 'production' ? [productionTransportSecurityHeader] : []),
        ],
      },
    ]
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
