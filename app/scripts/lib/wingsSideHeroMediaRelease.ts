import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import type { WingsSideHiFiSeedPayload } from './wingssideHiFiContentSeed'
import type { ReleaseRepairPlanRecord } from './wingsSideBestPriceReleaseRepair'

export type WingsSideTourReleaseRepairPlan = {
  expectedCount: number
  records: ReleaseRepairPlanRecord[]
  siteID?: number | string
}

export type WingsSideHeroMediaPlanEntry = {
  destinationFilename: string
  destinationPath: string
  existedBefore: boolean
  expectedHash: string
  heroMediaID: number | string
  isHero?: boolean
  sourceFilename: string
  sourceId: string
  sourcePath: string
}

export type WingsSideHeroMediaPlan = {
  createdAt: string
  destinationRoot: string
  entries: WingsSideHeroMediaPlanEntry[]
  expectedCount: number
  heroCount?: 22
  sourceRoot: string
  version: 1
}

export const checksumFile = (filePath: string) =>
  createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')

const safeChildPath = (root: string, filename: string) => {
  if (path.basename(filename) !== filename) throw new Error(`Unsafe media filename: ${filename}`)
  const resolvedRoot = path.resolve(root)
  const resolved = path.resolve(resolvedRoot, filename)
  if (path.dirname(resolved) !== resolvedRoot)
    throw new Error(`Media path escapes root: ${filename}`)
  return resolved
}

export const buildWingsSideHeroMediaPlan = async (args: {
  destinationRoot: string
  payload: WingsSideHiFiSeedPayload
  releaseRepairPlan: WingsSideTourReleaseRepairPlan
  sourceRoot: string
}): Promise<WingsSideHeroMediaPlan> => {
  if (args.releaseRepairPlan.expectedCount !== 22 || args.releaseRepairPlan.records.length !== 22) {
    throw new Error('Hero media remediation requires the exact 22-tour release repair plan')
  }
  const heroIDs = args.releaseRepairPlan.records.map((record) => record.heroMediaID)
  if (new Set(heroIDs.map(String)).size !== 22) throw new Error('Hero media IDs are not unique')
  if (args.releaseRepairPlan.siteID == null) {
    throw new Error('Release repair plan is missing its exact site ID')
  }
  const result = await args.payload.find({
    collection: 'media',
    depth: 0,
    limit: 2000,
    where: { site: { equals: args.releaseRepairPlan.siteID } },
  })
  const mediaById = new Map(
    (result.docs as Array<{ filename?: null | string; id: number | string }>).map((media) => [
      String(media.id),
      media,
    ]),
  )
  if (heroIDs.some((id) => !mediaById.has(String(id)))) {
    throw new Error('One or more planned hero media documents are missing')
  }

  const sourcePrefixes = args.releaseRepairPlan.records.map((record) => {
    const firstImage = record.sourceDesired.firstImage
    const extension = path.extname(firstImage.expectedFilename)
    const suffix = `-01-${firstImage.hash.slice(0, 8)}${extension}`
    if (!firstImage.expectedFilename.endsWith(suffix)) {
      throw new Error(`Unexpected deterministic hero filename: ${firstImage.expectedFilename}`)
    }
    return {
      bpt: firstImage.expectedFilename.slice(0, -suffix.length),
      dcv: `dcv-${firstImage.expectedFilename.slice(4, -suffix.length)}`,
      record,
    }
  })

  const scopedMedia = [...mediaById.values()].flatMap((media) => {
    if (!media.filename) return []
    const match = sourcePrefixes.find(({ dcv }) => media.filename?.startsWith(`${dcv}-`))
    return match ? [{ match, media }] : []
  })
  const tourEntries = scopedMedia.map(({ match, media }) => {
    const sourceFilename = `bpt-${media.filename!.slice(4)}`
    const sourcePath = safeChildPath(args.sourceRoot, sourceFilename)
    if (!fs.existsSync(sourcePath)) throw new Error(`Hero source file missing: ${sourcePath}`)
    const sourceHash = checksumFile(sourcePath)
    const filenameHash = path
      .basename(sourceFilename, path.extname(sourceFilename))
      .split('-')
      .at(-1)
    if (filenameHash !== sourceHash.slice(0, 8)) {
      throw new Error(`Media source checksum suffix mismatch: ${match.record.sourceId}`)
    }
    const isHero = String(media.id) === String(match.record.heroMediaID)
    if (isHero && sourceHash !== match.record.sourceDesired.firstImage.hash) {
      throw new Error(`Hero source checksum mismatch: ${match.record.sourceId}`)
    }
    const destinationPath = safeChildPath(args.destinationRoot, media.filename!)
    const existedBefore = fs.existsSync(destinationPath)
    if (existedBefore && checksumFile(destinationPath) !== sourceHash) {
      throw new Error(`Existing hero destination checksum mismatch: ${destinationPath}`)
    }
    return {
      destinationFilename: media.filename!,
      destinationPath,
      existedBefore,
      expectedHash: sourceHash,
      heroMediaID: match.record.heroMediaID,
      isHero,
      sourceFilename,
      sourceId: match.record.sourceId,
      sourcePath,
    }
  })
  const sharedEntries = [...mediaById.values()].flatMap((media) => {
    if (!media.filename?.startsWith('wingsside-')) return []
    const sourcePath = safeChildPath(args.sourceRoot, media.filename)
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`WingSide shared media source file missing: ${sourcePath}`)
    }
    const expectedHash = checksumFile(sourcePath)
    const destinationPath = safeChildPath(args.destinationRoot, media.filename)
    const existedBefore = fs.existsSync(destinationPath)
    if (existedBefore && checksumFile(destinationPath) !== expectedHash) {
      throw new Error(`Existing WingSide shared destination checksum mismatch: ${destinationPath}`)
    }
    return [
      {
        destinationFilename: media.filename,
        destinationPath,
        existedBefore,
        expectedHash,
        heroMediaID: media.id,
        isHero: false,
        sourceFilename: media.filename,
        sourceId: `wing-side-shared:${media.id}`,
        sourcePath,
      },
    ]
  })
  const entries = [...tourEntries, ...sharedEntries]

  if (entries.filter((entry) => entry.isHero).length !== 22) {
    throw new Error('Media plan does not contain exactly 22 hero files')
  }
  if (
    new Set(entries.map((entry) => entry.destinationPath.toLowerCase())).size !== entries.length
  ) {
    throw new Error('Hero destination filenames are not unique')
  }
  return {
    createdAt: new Date().toISOString(),
    destinationRoot: path.resolve(args.destinationRoot),
    entries,
    expectedCount: entries.length,
    heroCount: 22,
    sourceRoot: path.resolve(args.sourceRoot),
    version: 1,
  }
}

const assertPlan = (plan: WingsSideHeroMediaPlan) => {
  const heroCount =
    plan.heroCount ?? (plan.expectedCount === 22 && plan.entries.length === 22 ? 22 : 0)
  if (
    plan.version !== 1 ||
    heroCount !== 22 ||
    plan.entries.length !== plan.expectedCount ||
    (plan.heroCount != null && plan.entries.filter((entry) => entry.isHero).length !== 22)
  ) {
    throw new Error('Invalid WingSide hero media plan scope')
  }
}

export const applyWingsSideHeroMediaPlan = (plan: WingsSideHeroMediaPlan) => {
  assertPlan(plan)
  fs.mkdirSync(plan.destinationRoot, { recursive: true })
  const created: string[] = []
  try {
    for (const entry of plan.entries) {
      if (checksumFile(entry.sourcePath) !== entry.expectedHash) {
        throw new Error(`Hero source drifted: ${entry.sourceId}`)
      }
      if (fs.existsSync(entry.destinationPath)) {
        if (checksumFile(entry.destinationPath) !== entry.expectedHash) {
          throw new Error(`Hero destination drifted: ${entry.destinationPath}`)
        }
        continue
      }
      if (entry.existedBefore) {
        throw new Error(`Hero destination disappeared after plan: ${entry.destinationPath}`)
      }
      const temporary = `${entry.destinationPath}.${process.pid}.tmp`
      fs.copyFileSync(entry.sourcePath, temporary, fs.constants.COPYFILE_EXCL)
      if (checksumFile(temporary) !== entry.expectedHash) {
        fs.rmSync(temporary, { force: true })
        throw new Error(`Copied hero checksum mismatch: ${entry.sourceId}`)
      }
      fs.renameSync(temporary, entry.destinationPath)
      created.push(entry.destinationPath)
    }
  } catch (error) {
    for (const createdPath of created.reverse()) fs.rmSync(createdPath, { force: true })
    throw error
  }
  return { created: created.length, verified: plan.entries.length }
}

export const rollbackWingsSideHeroMediaPlan = (plan: WingsSideHeroMediaPlan) => {
  assertPlan(plan)
  let removed = 0
  for (const entry of [...plan.entries].reverse()) {
    if (entry.existedBefore || !fs.existsSync(entry.destinationPath)) continue
    if (checksumFile(entry.destinationPath) !== entry.expectedHash) {
      throw new Error(`Refusing to remove drifted hero file: ${entry.destinationPath}`)
    }
    fs.rmSync(entry.destinationPath)
    removed += 1
  }
  return { removed, retained: plan.entries.filter((entry) => entry.existedBefore).length }
}
