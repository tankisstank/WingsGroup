import { postgresAdapter } from '@payloadcms/db-postgres'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { en } from 'payload/i18n/en'
import { vi } from 'payload/i18n/vi'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { SiteSettings } from './collections/SiteSettings'
import { Sites } from './collections/Sites'
import { DepartureVariants } from './collections/DepartureVariants'
import { TourCampaigns } from './collections/TourCampaigns'
import { TourDepartures } from './collections/TourDepartures'
import { TourProducts } from './collections/TourProducts'
import { ThemePresets } from './collections/ThemePresets'
import { HeroPresentationPresets } from './collections/HeroPresentationPresets'
import { Users } from './collections/Users'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'
import { resolveLocalDatabaseURL } from './utilities/localDatabase'
import { repairLocalSQLiteSchema } from './utilities/repairLocalSQLiteSchema'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const databaseURL = resolveLocalDatabaseURL(process.env.DATABASE_URL)
const isPostgresURL =
  databaseURL.startsWith('postgres://') || databaseURL.startsWith('postgresql://')
const shouldPushDatabaseSchema = process.env.PAYLOAD_DB_PUSH === 'true'

if (!isPostgresURL) {
  await repairLocalSQLiteSchema(databaseURL)
}

export default buildConfig({
  admin: {
    meta: {
      titleSuffix: 'WingsGroup CMS',
    },
    suppressHydrationWarning: true,
    components: {
      beforeLogin: ['@/components/AdminThemeBootstrap', '@/components/BeforeLogin'],
      beforeDashboard: ['@/components/BeforeDashboard'],
      beforeNav: ['@/components/AdminThemeBootstrap', '@/components/AdminNavIntro'],
      graphics: {
        Icon: '@/components/AdminBranding/Icon#AdminIcon',
        Logo: '@/components/AdminBranding/Logo#AdminLogo',
      },
      views: {
        operatorConsole: {
          Component: '@/components/AdminOperatorConsole',
          path: '/console',
        },
        themeManager: {
          Component: '@/components/ThemeManager',
          path: '/theme',
        },
        siteReview: {
          Component: '@/components/SiteReview',
          path: '/site-review',
        },
        pageWizard: {
          Component: '@/components/PageWizard',
          path: '/page-wizard',
        },
      },
    },
    dashboard: {
      defaultLayout: [
        {
          widgetSlug: 'wings-group-metrics',
          width: 'full',
        },
      ],
      widgets: [
        {
          slug: 'wings-group-metrics',
          Component: '@/components/AdminDashboard/WingsGroupMetrics#WingsGroupMetrics',
          minWidth: 'full',
          maxWidth: 'full',
        },
      ],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  i18n: {
    fallbackLanguage: 'vi',
    supportedLanguages: {
      en,
      vi,
    },
  },
  db: isPostgresURL
    ? postgresAdapter({
        pool: {
          connectionString: databaseURL,
        },
        push: shouldPushDatabaseSchema,
      })
    : sqliteAdapter({
        client: {
          url: databaseURL,
        },
        push: shouldPushDatabaseSchema,
      }),
  collections: [
    Sites,
    ThemePresets,
    HeroPresentationPresets,
    SiteSettings,
    Pages,
    Posts,
    TourProducts,
    DepartureVariants,
    TourDepartures,
    TourCampaigns,
    Media,
    Categories,
    Users,
  ],
  localization: {
    locales: [
      {
        code: 'vi',
        label: 'Tiếng Việt',
      },
      {
        code: 'en',
        label: 'English',
      },
    ],
    defaultLocale: 'vi',
    fallback: true,
  },
  cors: [getServerSideURL()].filter(Boolean),
  globals: [Header, Footer],
  plugins,
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        const secret = process.env.CRON_SECRET
        if (!secret) return false

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${secret}`
      },
    },
    tasks: [],
  },
})
