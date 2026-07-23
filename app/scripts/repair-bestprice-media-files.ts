/**
 * Restore BestPrice media binaries into public/media for local testing.
 *
 * Local DBs often keep media rows (filename/url) after a DB copy while the
 * corresponding files under public/media are missing — tour pages then 500 on
 * /api/media/file/* and next/image returns blank.
 *
 * Usage:
 *   pnpm exec tsx scripts/repair-bestprice-media-files.ts
 *   pnpm exec tsx scripts/repair-bestprice-media-files.ts --dry-run
 */
import fs from 'node:fs/promises'
import path from 'node:path'

import {
  bestPriceMediaFilename,
  buildBestPriceNormalizedTours,
} from './lib/bestprice22'

const defaultCrawlerRoot = 'E:\\repo\\tour-crawlers'
const defaultManifestPath = path.resolve(
  process.cwd(),
  '..',
  '..',
  'WingsTravel',
  'output',
  'doc',
  'tour-source-match-20260717.csv',
)
const mediaDir = path.resolve(process.cwd(), 'public', 'media')

const main = async () => {
  const dryRun = process.argv.includes('--dry-run')
  const crawlerRoot = process.env.BESTPRICE_CRAWLER_ROOT || defaultCrawlerRoot
  const manifestPath =
    process.env.BESTPRICE_MANIFEST ||
    (await fs
      .access(defaultManifestPath)
      .then(() => defaultManifestPath)
      .catch(() => path.resolve(process.cwd(), '..', 'output', 'doc', 'tour-source-match-20260717.csv')))
  const rawPath = path.join(crawlerRoot, 'bestprice_tours.json')

  // Prefer monorepo manifest path used in worktree imports.
  const worktreeManifest = path.resolve(
    process.cwd(),
    '..',
    '..',
    'WingsTravel',
    'output',
    'doc',
    'tour-source-match-20260717.csv',
  )
  const resolvedManifest = await fs
    .access(worktreeManifest)
    .then(() => worktreeManifest)
    .catch(async () => {
      const alt = path.resolve('E:\\repo\\WingsTravel\\output\\doc\\tour-source-match-20260717.csv')
      await fs.access(alt)
      return alt
    })

  const { missing, tours } = await buildBestPriceNormalizedTours({
    crawlerRoot,
    manifestPath: resolvedManifest || manifestPath,
    rawPath,
  })
  if (missing.length) {
    throw new Error(`Missing raw records for ${missing.length} manifest rows`)
  }

  await fs.mkdir(mediaDir, { recursive: true })

  let copied = 0
  let already = 0
  let failed = 0
  const failures: string[] = []

  for (const tour of tours) {
    for (const [imageIndex, image] of tour.images.entries()) {
      const filename = bestPriceMediaFilename(tour.sourceId, imageIndex, image)
      const dest = path.join(mediaDir, filename)
      try {
        await fs.access(dest)
        already += 1
        continue
      } catch {
        // missing — copy from crawler
      }

      try {
        if (dryRun) {
          copied += 1
          continue
        }
        await fs.copyFile(image.localPath, dest)
        copied += 1
      } catch (error) {
        failed += 1
        failures.push(
          `${tour.sourceId}#${imageIndex + 1} ${filename}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        tours: tours.length,
        mediaDir,
        alreadyOnDisk: already,
        copied,
        failed,
        failures: failures.slice(0, 20),
      },
      null,
      2,
    ),
  )

  if (failed) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
