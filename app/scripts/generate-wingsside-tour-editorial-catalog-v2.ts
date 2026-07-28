import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildWingsSideCatalogAuthoringDraft,
  parseCatalogAuthoringDraftPacket,
  parseCatalogAuthoringLocaleFile,
  parseCatalogAuthoringReviewArtifact,
  parseCatalogAuthoringSourceManifest,
  readFrozenCatalogAuthoringArtifact,
  reconcileWingsSideCatalogAuthoringReview,
  type CatalogAuthoringSourceManifest,
  type CatalogAuthoringSourceTour,
} from './lib/wingsSideTourEditorialCatalogAuthoring'
import { wingsSideTourEditorialLocales } from './lib/wingsSideTourEditorialLocalization'

const argument = (name: string) => {
  const inline = process.argv.find((value) => value.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}
export const assertCatalogAuthoringCLITrustBoundary = (
  mode: 'draft' | 'reconcile',
  argv: string[],
) => {
  const present = (name: string) =>
    argv.some((value) => value === name || value.startsWith(`${name}=`))
  if (mode === 'draft' && present('--draft')) {
    throw new Error('Draft mode always rebuilds and rejects --draft')
  }
  if (present('--trusted-approvers')) {
    throw new Error('Trusted approvers must come from protected environment, not CLI')
  }
  if (present('--legacy-dir')) {
    throw new Error('Unprotected --legacy-dir locale discovery is forbidden')
  }
}

const required = (name: string) => {
  const value = argument(name)
  if (!value) throw new Error(`Missing required ${name}`)
  return path.resolve(value)
}

const readJSON = async <T>(filePath: string): Promise<T> =>
  JSON.parse(await readFile(filePath, 'utf8')) as T

export const resolveProtectedCatalogAuthoringValue = ({
  cliName,
  cliValue,
  envName,
  envValue,
}: {
  cliName: string
  cliValue?: string
  envName: string
  envValue?: string
}) => {
  const expected = envValue?.trim()
  if (!expected) throw new Error(`Protected environment ${envName} is required`)
  if (cliValue && cliValue !== expected) {
    throw new Error(`Protected catalog CLI/environment conflict: ${cliName}`)
  }
  return expected
}

export const resolveProtectedCatalogAuthoringPath = ({
  cliName,
  cliValue,
  envName,
  envValue,
}: {
  cliName: string
  cliValue?: string
  envName: string
  envValue?: string
}) => {
  if (!cliValue?.trim()) throw new Error(`Missing required ${cliName}`)
  const protectedValue = envValue?.trim()
  if (!protectedValue) throw new Error(`Protected environment ${envName} is required`)
  const cliPath = path.resolve(cliValue)
  const protectedPath = path.resolve(protectedValue)
  if (cliPath !== protectedPath) {
    throw new Error(`Protected catalog CLI/environment conflict: ${cliName}`)
  }
  return protectedPath
}

const protectedExpected = (envName: string, cliName: string) =>
  resolveProtectedCatalogAuthoringValue({
    cliName,
    cliValue: argument(cliName),
    envName,
    envValue: process.env[envName],
  })

export const runWingsSideCatalogAuthoring = async () => {
  const mode = argument('--mode')
  if (mode !== 'draft' && mode !== 'reconcile') {
    throw new Error('Choose --mode=draft or --mode=reconcile')
  }
  assertCatalogAuthoringCLITrustBoundary(mode, process.argv)
  const expectedSourceManifestSha256 = protectedExpected(
    'WINGSSIDE_CATALOG_SOURCE_MANIFEST_SHA256',
    '--manifest-sha256',
  )
  const sourceTours = await readJSON<CatalogAuthoringSourceTour[]>(required('--source'))
  const manifestArtifact = readFrozenCatalogAuthoringArtifact<CatalogAuthoringSourceManifest>({
    expectedSha256: expectedSourceManifestSha256,
    filePath: required('--manifest'),
    validate: parseCatalogAuthoringSourceManifest,
  })
  const sourceManifest = manifestArtifact.value
  const localeArtifacts = wingsSideTourEditorialLocales.map((locale) => {
    const cliPathName = `--locale-${locale}`
    const cliShaName = `--locale-${locale}-sha256`
    const envPrefix = `WINGSSIDE_CATALOG_LOCALE_${locale.toUpperCase()}`
    const filePath = resolveProtectedCatalogAuthoringPath({
      cliName: cliPathName,
      cliValue: argument(cliPathName),
      envName: `${envPrefix}_PATH`,
      envValue: process.env[`${envPrefix}_PATH`],
    })
    const cliSha = argument(cliShaName)
    if (!cliSha) throw new Error(`Missing required ${cliShaName}`)
    const expectedSha256 = resolveProtectedCatalogAuthoringValue({
      cliName: cliShaName,
      cliValue: cliSha,
      envName: `${envPrefix}_SHA256`,
      envValue: process.env[`${envPrefix}_SHA256`],
    })
    const artifact = readFrozenCatalogAuthoringArtifact({
      expectedSha256,
      filePath,
      validate: (value) => parseCatalogAuthoringLocaleFile(value, locale),
    })
    return { locale, ...artifact }
  })
  const outputPath = required('--output')
  const draft =
    mode === 'reconcile'
      ? parseCatalogAuthoringDraftPacket(
          await readJSON<unknown>(required('--draft')),
        )
      : buildWingsSideCatalogAuthoringDraft({
          expectedSourceManifestSha256,
          localeArtifacts,
          sourceManifest,
          sourceManifestArtifactSha256: manifestArtifact.sha256,
          sourceTours,
        })
  const output =
    mode === 'draft'
      ? draft
      : (() => {
          const expectedReviewArtifactSha256 = protectedExpected(
            'WINGSSIDE_CATALOG_REVIEW_ARTIFACT_SHA256',
            '--review-sha256',
          )
          const reviewArtifact = readFrozenCatalogAuthoringArtifact({
            expectedSha256: expectedReviewArtifactSha256,
            filePath: required('--review'),
            validate: parseCatalogAuthoringReviewArtifact,
          })
          const trustedApprovers = String(
            process.env.WINGSSIDE_CATALOG_TRUSTED_APPROVERS || '',
          )
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
          if (trustedApprovers.length === 0) {
            throw new Error('Protected environment WINGSSIDE_CATALOG_TRUSTED_APPROVERS is required')
          }
          return reconcileWingsSideCatalogAuthoringReview({
            approvalPolicy: {
              reviewArtifactSha256: expectedReviewArtifactSha256,
              trustedApprovers,
            },
            draft,
            expectedSourceManifestSha256,
            localeArtifacts,
            review: reviewArtifact.value,
            reviewArtifactSha256: reviewArtifact.sha256,
            sourceManifest,
            sourceManifestArtifactSha256: manifestArtifact.sha256,
            sourceTours,
          })
        })()
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
