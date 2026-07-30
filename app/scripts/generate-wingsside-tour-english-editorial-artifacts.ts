import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  buildWingsSideTourEnglishEditorialConfigArtifact,
  buildWingsSideTourEnglishEditorialManifest,
  buildWingsSideTourEnglishEditorialPlan,
  wingsSideTourEnglishEditorialChecksum,
  type WingsSideTourEnglishEditorialConfig,
  type WingsSideTourEnglishEditorialDocument,
} from './lib/wingsSideTourEnglishEditorial'

type SourceTour = {
  excludes?: Array<{ id: string; label: string }>
  id: number | string
  includes?: Array<{ id: string; label: string }>
  meta?: {
    breadcrumbLabel?: string
    description?: string
    title?: string
  }
  primaryCTALabel?: string
  routeSummary?: string
  slug: string
  summary: string
  title: string
}

type CandidateTour = {
  meta?: {
    breadcrumbLabel?: string
    description?: string
    title?: string
  }
  primaryCTALabel?: string
  routeSummary?: string
  slug: string
  summary: string
  title: string
}

const argumentValue = (name: string) => {
  const inline = process.argv.find((argument) => argument.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const required = (name: string) => {
  const value = argumentValue(name)
  if (!value) throw new Error(`Missing required ${name}`)
  return path.resolve(value)
}

const readJSON = async <T>(filePath: string): Promise<T> =>
  JSON.parse(await readFile(filePath, 'utf8')) as T

const config: WingsSideTourEnglishEditorialConfig = {
  allCapsAllowlist: ['UNESCO', 'IATA', 'CTA', 'SEO', 'USD'],
  allowIataCodes: true,
  editorialPaths: [
    'title',
    'summary',
    'factSummary.routeSummary',
    'primaryCTA.label',
    'meta.title',
    'meta.description',
    'meta.breadcrumbLabel',
  ],
  lockedFactualPaths: [
    'durationDays',
    'durationNights',
    'priceFrom',
    'currency',
    'includes',
    'excludes',
    'itineraryDays',
  ],
  publicTextPaths: [
    'title',
    'summary',
    'factSummary.routeSummary',
    'primaryCTA.label',
    'meta.title',
    'meta.description',
    'meta.breadcrumbLabel',
  ],
  requiredPaths: [
    'title',
    'summary',
    'factSummary.routeSummary',
    'primaryCTA.label',
    'meta.title',
    'meta.description',
    'meta.breadcrumbLabel',
  ],
  serviceRowPaths: [],
  vendorBrands: ['BestPrice', 'BestPrice Travel'],
}

const sourceDocument = (source: SourceTour): WingsSideTourEnglishEditorialDocument => ({
  factSummary: {
    routeSummary: source.routeSummary || '',
  },
  meta: {
    breadcrumbLabel: source.meta?.breadcrumbLabel || '',
    description: source.meta?.description || '',
    title: source.meta?.title || '',
  },
  primaryCTA: {
    label: source.primaryCTALabel || '',
  },
  slug: source.slug,
  summary: source.summary,
  title: source.title,
})

const proposedDocument = (
  source: SourceTour,
  candidate: CandidateTour,
): WingsSideTourEnglishEditorialDocument => ({
  ...sourceDocument(source),
  factSummary: {
    routeSummary: candidate.routeSummary || '',
  },
  meta: {
    breadcrumbLabel: candidate.meta?.breadcrumbLabel || '',
    description: candidate.meta?.description || '',
    title: candidate.meta?.title || '',
  },
  primaryCTA: {
    label: candidate.primaryCTALabel || '',
  },
  summary: candidate.summary,
  title: candidate.title,
})

const main = async () => {
  const sourcePath = required('--source')
  const candidatesPath = required('--candidates')
  const outputDir = required('--output-dir')
  const releaseSha = argumentValue('--release-sha')
  if (!releaseSha || !/^[0-9a-f]{40}$/u.test(releaseSha)) {
    throw new Error('Missing or invalid --release-sha')
  }

  const source = await readJSON<SourceTour[]>(sourcePath)
  const candidatesFile = await readJSON<{ tours: CandidateTour[] }>(candidatesPath)
  if (source.length !== 22 || candidatesFile.tours.length !== 22) {
    throw new Error('English editorial artifacts require exactly 22 source and candidate tours')
  }
  const sourceBySlug = new Map(source.map((tour) => [tour.slug, tour]))
  const candidateBySlug = new Map(candidatesFile.tours.map((tour) => [tour.slug, tour]))
  const expectedSlugs = source.map(({ slug }) => slug).sort()
  if (
    new Set(expectedSlugs).size !== 22 ||
    expectedSlugs.some((slug) => !candidateBySlug.has(slug))
  ) {
    throw new Error('English editorial source/candidate inventory mismatch')
  }

  const sourceDocuments = expectedSlugs.map((slug) => sourceDocument(sourceBySlug.get(slug)!))
  const proposedDocuments = expectedSlugs.map((slug) =>
    proposedDocument(sourceBySlug.get(slug)!, candidateBySlug.get(slug)!),
  )
  const configArtifact = buildWingsSideTourEnglishEditorialConfigArtifact(config)
  const manifest = buildWingsSideTourEnglishEditorialManifest({
    config,
    releaseSha,
    tours: expectedSlugs.map((slug) => {
      const sourceTour = sourceBySlug.get(slug)!
      const before = sourceDocument(sourceTour)
      return {
        slug,
        sourceChecksum: wingsSideTourEnglishEditorialChecksum(before),
        tourID: sourceTour.id,
      }
    }),
  })
  const plan = buildWingsSideTourEnglishEditorialPlan({
    config,
    createdAt: new Date().toISOString(),
    expectedSlugs,
    manifest,
    proposedTours: proposedDocuments,
    runID: randomUUID(),
    sourceTours: sourceDocuments,
  })

  await mkdir(outputDir, { recursive: true })
  await writeFile(path.join(outputDir, 'config.json'), `${JSON.stringify(configArtifact, null, 2)}\n`)
  await writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  await writeFile(path.join(outputDir, 'plan.json'), `${JSON.stringify(plan, null, 2)}\n`)
  console.log(
    JSON.stringify({
      configSha256: wingsSideTourEnglishEditorialChecksum(configArtifact),
      manifestSha256: wingsSideTourEnglishEditorialChecksum(manifest),
      outputDir,
      planSha256: plan.planChecksum,
      tours: plan.expectedTourCount,
    }),
  )
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
