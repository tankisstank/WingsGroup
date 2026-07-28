import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildWingsSideCatalogAuthoringDraft,
  reconcileWingsSideCatalogAuthoringReview,
  type CatalogAuthoringDraftPacket,
  type CatalogAuthoringReviewArtifact,
} from './lib/wingsSideTourEditorialCatalogAuthoring'
import {
  wingsSideTourEditorialLocales,
  type EditorialSourceTour,
  type WingsSideTourEditorialLocaleFile,
  type WingsSideTourEditorialSourceManifest,
} from './lib/wingsSideTourEditorialLocalization'

const argument = (name: string) => {
  const inline = process.argv.find((value) => value.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const required = (name: string) => {
  const value = argument(name)
  if (!value) throw new Error(`Missing required ${name}`)
  return path.resolve(value)
}

const readJSON = async <T>(filePath: string): Promise<T> =>
  JSON.parse(await readFile(filePath, 'utf8')) as T

export const runWingsSideCatalogAuthoring = async () => {
  const mode = argument('--mode')
  if (mode !== 'draft' && mode !== 'reconcile') {
    throw new Error('Choose --mode=draft or --mode=reconcile')
  }
  const sourceTours = await readJSON<EditorialSourceTour[]>(required('--source'))
  const sourceManifest = await readJSON<WingsSideTourEditorialSourceManifest>(
    required('--manifest'),
  )
  const legacyDirectory = required('--legacy-dir')
  const localeFiles = await Promise.all(
    wingsSideTourEditorialLocales.map((locale) =>
      readJSON<WingsSideTourEditorialLocaleFile>(path.join(legacyDirectory, `${locale}.json`)),
    ),
  )
  const outputPath = required('--output')
  const draft = argument('--draft')
    ? await readJSON<CatalogAuthoringDraftPacket>(required('--draft'))
    : buildWingsSideCatalogAuthoringDraft({ localeFiles, sourceManifest, sourceTours })
  const output =
    mode === 'draft'
      ? draft
      : reconcileWingsSideCatalogAuthoringReview({
          draft,
          localeFiles,
          review: await readJSON<CatalogAuthoringReviewArtifact>(required('--review')),
          sourceManifest,
          sourceTours,
          trustedApprovers: String(argument('--trusted-approvers') || '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
        })
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  })
  return { mode, outputPath }
}

const direct =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))

if (direct) {
  void runWingsSideCatalogAuthoring().then(
    (result) => console.log(JSON.stringify(result)),
    (error) => {
      console.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
    },
  )
}
