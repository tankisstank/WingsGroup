/**
 * WingsGroup v3 media plan verifier.
 *
 * This command is deliberately plan-only. Transaction-safe Payload writes,
 * derivative-file rollback, exact-row verification and drift-aware rollback
 * are not yet implemented, so apply/verify/rollback fail closed.
 */
import fs from 'node:fs/promises'
import path from 'node:path'

import {
  assertApplicableWingsGroupV3MediaPlan,
  buildWingsGroupV3MediaPlan,
  parseWingsGroupV3MediaManifest,
} from './lib/wingsGroupV3MediaPlan'

export const parseWingsGroupV3MediaCommand = (argv: string[]) => {
  const positional = argv.find((argument) => !argument.startsWith('--')) || 'plan'
  if (positional !== 'plan' || argv.includes('--apply')) {
    throw new Error(
      'WingsGroup v3 media is plan-only. apply/verify/rollback remain disabled until transaction-safe DB and derivative-file rollback are implemented.',
    )
  }
  const option = (name: string): string | undefined =>
    argv.find((argument) => argument.startsWith(`--${name}=`))?.slice(name.length + 3)
  const manifest = option('manifest')
  const assetsDirectory = option('assets-dir')
  if (!manifest) throw new Error('--manifest is required.')
  if (!assetsDirectory) throw new Error('--assets-dir is required.')
  return {
    assetsDirectory: path.resolve(assetsDirectory),
    manifestPath: path.resolve(manifest),
  }
}

const main = async () => {
  const command = parseWingsGroupV3MediaCommand(process.argv.slice(2))
  const manifest = parseWingsGroupV3MediaManifest(
    JSON.parse(await fs.readFile(command.manifestPath, 'utf8')),
  )
  const plan = await buildWingsGroupV3MediaPlan({
    assetsDirectory: command.assetsDirectory,
    manifest,
  })
  assertApplicableWingsGroupV3MediaPlan(plan)
  console.log(
    JSON.stringify(
      {
        dryRun: true,
        lifecycle: {
          apply: 'disabled',
          plan: 'verified',
          rollback: 'disabled',
          verify: 'disabled',
        },
        ...plan,
      },
      null,
      2,
    ),
  )
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
