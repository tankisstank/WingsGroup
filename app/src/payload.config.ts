import { postgresAdapter } from '@payloadcms/db-postgres'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { de } from 'payload/i18n/de'
import { en } from 'payload/i18n/en'
import { es } from 'payload/i18n/es'
import { fr } from 'payload/i18n/fr'
import { it } from 'payload/i18n/it'
import { ja } from 'payload/i18n/ja'
import { ko } from 'payload/i18n/ko'
import { pt } from 'payload/i18n/pt'
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
import { cmsEnabledLocaleMetadata } from './utilities/locales'
import { resolveLocalDatabaseURL } from './utilities/localDatabase'
import { repairLocalSQLiteSchema } from './utilities/repairLocalSQLiteSchema'
import {
  getWingsGroupLocalPreviewStoreURL,
  isWingsGroupLocalPreviewStoreConfigured,
} from './utilities/localPreviewStore'
import {
  purgeExpiredWingsGroupLeadsTask,
  reconcileLeadNotificationTask,
  sendLeadNotificationTask,
} from './lead-capture/job'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const localPreviewStore = isWingsGroupLocalPreviewStoreConfigured()
const databaseURL = resolveLocalDatabaseURL(
  localPreviewStore ? getWingsGroupLocalPreviewStoreURL() : process.env.DATABASE_URL,
)
const databaseAuthToken = localPreviewStore
  ? process.env.E09_PREVIEW_STORE_TOKEN!.trim()
  : undefined
const isPostgresURL =
  databaseURL.startsWith('postgres://') || databaseURL.startsWith('postgresql://')
const shouldPushDatabaseSchema = process.env.PAYLOAD_DB_PUSH === 'true'
const smtpPort = Number.parseInt(process.env.SMTP_PORT || '587', 10)
const smtpConfigured = Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASSWORD &&
  process.env.SMTP_FROM_EMAIL,
)

if (!isPostgresURL && !shouldPushDatabaseSchema) {
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
      beforeNav: [
        '@/components/AdminThemeBootstrap',
        '@/components/AdminNavIntro',
        '@/components/AdminNavTooltip',
      ],
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
  email: smtpConfigured
    ? await nodemailerAdapter({
        defaultFromAddress: process.env.SMTP_FROM_EMAIL!,
        defaultFromName: process.env.SMTP_FROM_NAME || 'WingsTravel Website',
        transportOptions: {
          auth: { pass: process.env.SMTP_PASSWORD!, user: process.env.SMTP_USER! },
          host: process.env.SMTP_HOST!,
          port: smtpPort,
          secure: process.env.SMTP_SECURE === 'true',
        },
      })
    : undefined,
  i18n: {
    fallbackLanguage: 'vi',
    translations: {
      vi: {
        ...vi.translations,
        general: {
          ...vi.translations.general,
          menu: 'điều hướng',
        },
      },
    },
    supportedLanguages: {
      de,
      en,
      es,
      fr,
      it,
      ja,
      ko,
      pt,
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
        busyTimeout: 30000,
        client: {
          ...(databaseAuthToken ? { authToken: databaseAuthToken } : {}),
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
    locales: cmsEnabledLocaleMetadata.map((locale) => ({
      code: locale.code,
      fallbackLocale: locale.fallbackLocale,
      label: locale.label,
      rtl: false,
    })),
    defaultLocale: 'vi',
    fallback: true,
  },
  cors: [getServerSideURL()].filter(Boolean),
  globals: [Header, Footer],
  graphQL: {
    // No production consumer is registered. Keep the development API available
    // for schema work while removing the public production attack surface.
    disable: process.env.NODE_ENV === 'production',
    disableIntrospectionInProduction: true,
    disablePlaygroundInProduction: true,
    maxComplexity: 1000,
  },
  plugins,
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        if (req.user?.role === 'super-admin') return true

        const secret = process.env.CRON_SECRET
        if (!secret) return false

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${secret}`
      },
    },
    tasks: [
      sendLeadNotificationTask,
      reconcileLeadNotificationTask,
      purgeExpiredWingsGroupLeadsTask,
    ],
  },
})
