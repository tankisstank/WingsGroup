import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'

import {
  applyWingsSideHeroMediaPlan,
  buildWingsSideHeroMediaPlan,
  rollbackWingsSideHeroMediaPlan,
  type WingsSideHeroMediaPlan,
  type WingsSideTourReleaseRepairPlan,
} from './lib/wingsSideHeroMediaRelease'
import type { WingsSideHiFiSeedPayload } from './lib/wingssideHiFiContentSeed'

const value = (name: string) =>
  process.argv
    .slice(2)
    .find((arg) => arg.startsWith(`--${name}=`))
    ?.slice(name.length + 3)

const planPath = value('plan')
const repairPlanPath = value('repair-plan')
const sourceRoot = value('source-root')
const destinationRoot = value('destination-root')
const apply = process.argv.includes('--apply')
const rollback = process.argv.includes('--rollback')

const assertWriteGuard = (root: string) => {
  if (process.env.WINGSSIDE_MEDIA_REMEDIATION_ALLOW !== 'local-clone') {
    throw new Error('Write blocked: set WINGSSIDE_MEDIA_REMEDIATION_ALLOW=local-clone')
  }
  if (!/(wp4|rehearsal|release-wingsside)/i.test(path.resolve(root))) {
    throw new Error('Write blocked: destination is not an explicit WP4/rehearsal path')
  }
}

const main = async () => {
  if (!planPath) throw new Error('Explicit --plan=<path> is required')
  if (apply && rollback) throw new Error('Choose only one of --apply or --rollback')
  const resolvedPlanPath = path.resolve(planPath)

  if (apply || rollback) {
    if (!fs.existsSync(resolvedPlanPath)) throw new Error(`Media plan missing: ${resolvedPlanPath}`)
    const plan = JSON.parse(fs.readFileSync(resolvedPlanPath, 'utf8')) as WingsSideHeroMediaPlan
    assertWriteGuard(plan.destinationRoot)
    const result = rollback
      ? rollbackWingsSideHeroMediaPlan(plan)
      : applyWingsSideHeroMediaPlan(plan)
    console.log(JSON.stringify({ action: rollback ? 'rollback' : 'apply', ...result }))
    return
  }

  if (!repairPlanPath || !sourceRoot || !destinationRoot) {
    throw new Error('Plan creation requires --repair-plan, --source-root, and --destination-root')
  }
  const releaseRepairPlan = JSON.parse(
    fs.readFileSync(path.resolve(repairPlanPath), 'utf8'),
  ) as WingsSideTourReleaseRepairPlan
  let payload: WingsSideHiFiSeedPayload | null = null
  try {
    const { getPayload } = await import('payload')
    const config = (await import('@payload-config')).default
    payload = (await getPayload({ config })) as WingsSideHiFiSeedPayload
    const plan = await buildWingsSideHeroMediaPlan({
      destinationRoot,
      payload,
      releaseRepairPlan,
      sourceRoot,
    })
    fs.mkdirSync(path.dirname(resolvedPlanPath), { recursive: true })
    fs.writeFileSync(resolvedPlanPath, `${JSON.stringify(plan, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    })
    console.log(
      JSON.stringify({ action: 'plan', entries: plan.entries.length, path: resolvedPlanPath }),
    )
  } finally {
    await payload?.destroy?.()
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
