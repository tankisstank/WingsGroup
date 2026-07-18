import 'dotenv/config'

import config from '../src/payload.config'
import { createLocalReq, getPayload, type Payload } from 'payload'

import { ensureLocalAdminUser } from '../src/utilities/adminSeed'
import { backfillWingsSideLocales, wingsSideBackfillLocales } from './lib/wingssideLocaleBackfill'
import { publicLocales, type PublicLocaleCode } from '../src/i18n/publicCopy'

const localeArgument = process.argv.find((argument) => argument.startsWith('--locales='))
const requestedPublicLocales = localeArgument
  ?.split('=')[1]
  ?.split(',')
  .map((value) => value.trim())
  .filter(Boolean)

const dryRun = process.argv.includes('--dry-run')
const validateOnly = process.argv.includes('--validate-only')

if (requestedPublicLocales) {
  const unknownLocales = requestedPublicLocales.filter(
    (locale): locale is string => !publicLocales.includes(locale as PublicLocaleCode),
  )

  if (unknownLocales.length > 0) {
    console.error(`Unknown WingsSide public locale(s): ${unknownLocales.join(', ')}`)
    process.exit(1)
  }
}

const settingsLocales = requestedPublicLocales as undefined | PublicLocaleCode[]
const pageLocales = settingsLocales?.filter((locale) =>
  wingsSideBackfillLocales.includes(locale as (typeof wingsSideBackfillLocales)[number]),
) as undefined | typeof wingsSideBackfillLocales[number][]

function disableVersionWritesForBackfill(payload: Payload) {
  const versionedCollections = [
    'pages',
    'posts',
    'tour-campaigns',
    'tour-departures',
    'tour-products',
  ] as const

  for (const slug of versionedCollections) {
    const collection = payload.collections[slug]

    if (collection?.config.versions) {
      collection.config.versions = false as never
    }
  }
}

function disableLocalTransactionsForBackfill(payload: Payload) {
  const create = payload.create.bind(payload)
  const update = payload.update.bind(payload)
  const deleteOperation = payload.delete.bind(payload)
  const updateGlobal = payload.updateGlobal.bind(payload)

  payload.create = ((args) =>
    create({ ...args, disableTransaction: true } as never)) as typeof payload.create
  payload.update = ((args) =>
    update({ ...args, disableTransaction: true } as never)) as typeof payload.update
  payload.delete = ((args) =>
    deleteOperation({ ...args, disableTransaction: true } as never)) as typeof payload.delete
  payload.updateGlobal = ((args) =>
    updateGlobal({ ...args, disableTransaction: true } as never)) as typeof payload.updateGlobal
}

try {
  const payload = await getPayload({ config })
  disableVersionWritesForBackfill(payload)
  disableLocalTransactionsForBackfill(payload)
  const adminUser = await ensureLocalAdminUser(payload)
  const req = await createLocalReq({ user: adminUser }, payload)

  const result = await backfillWingsSideLocales(payload, req, {
    dryRun: dryRun || validateOnly,
    locales: pageLocales,
    settingsLocales,
  })
  const updatedPages = result.updates.filter((entry) => entry.action === 'update').length
  const skippedPages = result.updates.filter((entry) => entry.action === 'skip').length
  const updatedSettings = result.siteSettingsUpdates.filter((entry) => entry.action === 'update').length
  const skippedSettings = result.siteSettingsUpdates.filter((entry) => entry.action === 'skip').length

  payload.logger.info(
    `${dryRun || validateOnly ? 'Dry run prepared' : 'Backfilled'} WingsSide locales ${result.locales.join(', ')} across ${result.totalPages} pages. pageUpdates=${updatedPages} pageSkips=${skippedPages} settingsUpdates=${updatedSettings} settingsSkips=${skippedSettings}.`,
  )
  process.exit(0)
} catch (error) {
  console.error(error)
  process.exit(1)
}
