import fs from 'node:fs/promises'
import path from 'node:path'

import { parseArgs } from './lib/doicanhviet'
import { parseTourSnapshotRecord, readTourSnapshotRecords } from './lib/tourSnapshots'

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  const root = path.resolve(String(args['crawler-root'] || 'E:\\repo\\tour-crawlers'))
  const outputDir = path.resolve(
    String(
      args['artifact-dir'] ||
        path.resolve(import.meta.dirname, '..', '..', 'artifacts', 'imports', 'tour-snapshots'),
    ),
  )
  const only = args.only
    ? new Set(
        String(args.only)
          .split(/[\s,]+/u)
          .filter(Boolean),
      )
    : null
  const limit = args.limit ? Number(args.limit) : undefined
  const sourceRecords = await readTourSnapshotRecords(root)
  const selected = sourceRecords
    .filter(({ record }) => !only || only.has(String(record.tour_id)))
    .slice(0, limit)
  const normalized = []
  for (const item of selected)
    normalized.push(
      await parseTourSnapshotRecord(root, path.relative(root, item.file), item.record),
    )
  const decisions = Object.fromEntries(
    normalized.map((record) => [
      record.sourceId,
      {
        action: record.blockingErrors.length ? 'reject' : 'create',
        approved: record.blockingErrors.length === 0,
        approvedTitle: record.title,
        approvedSlug: record.slug,
        approvedHeroSourceKey: record.images[0]?.sourceKey,
        notes: record.publishEligible
          ? 'publish-eligible after dry-run'
          : `draft-only: ${record.warnings.join(', ')}`,
      },
    ]),
  )
  const summary = normalized.reduce(
    (result, record) => {
      result.total += 1
      result[record.source.sourceSystem] += 1
      if (record.publishEligible) result.publishEligible += 1
      else result.draftOnly += 1
      if (record.blockingErrors.length) result.rejected += 1
      result.media += record.images.length
      result.departures += record.departures.length
      return result
    },
    {
      total: 0,
      doicanhviet: 0,
      bestpricetravel: 0,
      thesinhtour: 0,
      publishEligible: 0,
      draftOnly: 0,
      rejected: 0,
      media: 0,
      departures: 0,
    },
  )
  await fs.mkdir(outputDir, { recursive: true })
  await fs.writeFile(
    path.join(outputDir, 'tours.normalized.json'),
    `${JSON.stringify(normalized, null, 2)}\n`,
  )
  await fs.writeFile(
    path.join(outputDir, 'import-decisions.json'),
    `${JSON.stringify(decisions, null, 2)}\n`,
  )
  await fs.writeFile(
    path.join(outputDir, 'parse-summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
  )
  console.log(JSON.stringify({ outputDir, ...summary }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
