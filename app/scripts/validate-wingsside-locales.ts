import 'dotenv/config'

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import config from '../src/payload.config'
import { createLocalReq, getPayload } from 'payload'

import { ensureLocalAdminUser } from '../src/utilities/adminSeed'
import { publicLocales, type PublicLocaleCode } from '../src/i18n/publicCopy'
import {
  auditWingsSideLocaleContent,
  renderLocaleAuditMarkdown,
  type LocaleAuditInput,
} from './lib/localeContentAudit'

const getArgumentValue = (name: string): string | undefined => {
  const inlineArgument = process.argv.find((argument) => argument.startsWith(`${name}=`))
  if (inlineArgument) return inlineArgument.split('=')[1]

  const index = process.argv.indexOf(name)
  if (index >= 0) return process.argv[index + 1]

  return undefined
}

const outputDirectory = getArgumentValue('--output-dir')

const payload = await getPayload({ config })
const adminUser = await ensureLocalAdminUser(payload)
const req = await createLocalReq({ user: adminUser }, payload)

const siteResult = await payload.find({
  collection: 'sites',
  depth: 0,
  limit: 1,
  locale: 'en',
  pagination: false,
  overrideAccess: true,
  req,
  where: {
    code: {
      equals: 'wing-side',
    },
  },
})

const site = siteResult.docs[0]

if (!site) {
  throw new Error('Could not find WingsSide site record for locale validation.')
}

const input: LocaleAuditInput = {
  pagesByLocale: {},
  settingsByLocale: {},
}

for (const locale of publicLocales) {
  const pages = await payload.find({
    collection: 'pages',
    // Validate only fields owned by the localized page. Expanded relations can contain
    // captions and metadata from shared documents that this backfill does not own.
    depth: 0,
    fallbackLocale: false,
    limit: 1000,
    locale,
    pagination: false,
    overrideAccess: true,
    req,
    where: {
      site: {
        equals: site.id,
      },
    },
  })

  const settings = await payload.find({
    collection: 'site-settings',
    depth: 0,
    fallbackLocale: false,
    limit: 1,
    locale,
    pagination: false,
    overrideAccess: true,
    req,
    where: {
      site: {
        equals: site.id,
      },
    },
  })

  input.pagesByLocale[locale as PublicLocaleCode] = pages.docs
  input.settingsByLocale![locale as PublicLocaleCode] = settings.docs[0] || null
}

const result = auditWingsSideLocaleContent(input)
const json = JSON.stringify(result, null, 2)
const markdown = renderLocaleAuditMarkdown(result)

if (outputDirectory) {
  const targetDirectory = resolve(outputDirectory)
  await mkdir(targetDirectory, { recursive: true })

  const jsonPath = resolve(targetDirectory, 'wingsside-locale-validation.json')
  const markdownPath = resolve(targetDirectory, 'wingsside-locale-validation.md')

  if (dirname(jsonPath) !== targetDirectory || dirname(markdownPath) !== targetDirectory) {
    throw new Error('Invalid output path.')
  }

  await writeFile(jsonPath, json)
  await writeFile(markdownPath, markdown)
}

console.log(markdown)

process.exit(result.ok ? 0 : 1)
