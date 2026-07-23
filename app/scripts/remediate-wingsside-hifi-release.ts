/**
 * Exact-scope WingSide hub remediation for a local PostgreSQL rehearsal clone.
 *
 * Plan:
 *   pnpm run remediate:wingsside:hifi-release -- --db --site-code=wing-side --plan=<path>
 * Apply / rollback:
 *   WINGSSIDE_RELEASE_REMEDIATION_ALLOW=local-clone pnpm run remediate:wingsside:hifi-release -- --db --site-code=wing-side --plan=<path> --apply
 *   WINGSSIDE_RELEASE_REMEDIATION_ALLOW=local-clone pnpm run remediate:wingsside:hifi-release -- --db --site-code=wing-side --plan=<path> --rollback
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'

import {
  buildWingsSideHiFiReleasePlan,
  executeWingsSideHiFiReleasePlan,
  WINGSSIDE_HIFI_SEED_SITE_CODE,
  type WingsSideHiFiReleasePlan,
  type WingsSideHiFiSeedPayload,
} from './lib/wingssideHiFiContentSeed'
import { assertWingsSideReleaseWriteGuard } from './lib/wingsSideReleaseWriteGuard'

const parseArgs = (argv: string[]) => {
  const value = (name: string) =>
    argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
  return {
    adminEmail: value('admin-email'),
    apply: argv.includes('--apply'),
    backupPath: value('backup'),
    backupSha256: value('backup-sha256'),
    db: argv.includes('--db'),
    json: argv.includes('--json'),
    planPath: value('plan'),
    production: argv.includes('--production'),
    productionConfirm: value('confirm-production'),
    releaseSha: value('release-sha'),
    rollback: argv.includes('--rollback'),
    rollbackRelease: value('rollback-release'),
    siteCode: value('site-code'),
  }
}

const assertCommonGuards = (args: ReturnType<typeof parseArgs>) => {
  if (!args.db) throw new Error('Explicit --db is required')
  if (args.siteCode !== WINGSSIDE_HIFI_SEED_SITE_CODE) {
    throw new Error(`Explicit --site-code=${WINGSSIDE_HIFI_SEED_SITE_CODE} is required`)
  }
  if (!args.planPath) throw new Error('Explicit --plan=<durable-json-path> is required')
  if (args.apply && args.rollback) throw new Error('Choose only one of --apply or --rollback')
}

const readPlan = (planPath: string): WingsSideHiFiReleasePlan => {
  if (!fs.existsSync(planPath)) throw new Error(`Release plan not found: ${planPath}`)
  return JSON.parse(fs.readFileSync(planPath, 'utf8')) as WingsSideHiFiReleasePlan
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  assertCommonGuards(args)
  const planPath = path.resolve(args.planPath!)

  let payload: WingsSideHiFiSeedPayload | null = null
  try {
    const { getPayload } = await import('payload')
    const config = (await import('@payload-config')).default
    payload = (await getPayload({ config })) as WingsSideHiFiSeedPayload

    if (!args.apply && !args.rollback) {
      const plan = await buildWingsSideHiFiReleasePlan({
        payload,
        siteCode: args.siteCode!,
      })
      fs.mkdirSync(path.dirname(planPath), { recursive: true })
      fs.writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`, {
        encoding: 'utf8',
        flag: 'wx',
      })
      const result = {
        action: 'plan',
        entries: plan.entries.length,
        locales: plan.localeCount,
        pages: plan.pageCount,
        path: planPath,
        planFormId: plan.planForm.formId,
      }
      console.log(args.json ? JSON.stringify(result) : result)
      return
    }

    assertWingsSideReleaseWriteGuard({
      backupPath: args.backupPath,
      backupSha256: args.backupSha256,
      production: args.production,
      productionConfirm: args.productionConfirm,
      releaseSha: args.releaseSha,
      rollbackRelease: args.rollbackRelease,
    })
    const plan = readPlan(planPath)
    if (!args.adminEmail) {
      throw new Error('Apply and rollback require --admin-email for an existing super-admin')
    }
    const admins = await payload.find({
      collection: 'users',
      depth: 0,
      limit: 2,
      where: { email: { equals: args.adminEmail } },
    })
    const admin = admins.docs[0] as { role?: string } | undefined
    if (admins.docs.length !== 1 || admin?.role !== 'super-admin') {
      throw new Error('Release remediation operator must resolve to exactly one super-admin')
    }
    const { createLocalReq } = await import('payload')
    const req = await createLocalReq({ user: admin as never }, payload as never)
    req.context = { ...req.context, disableRevalidate: true, releaseRemediation: true }
    const result = await executeWingsSideHiFiReleasePlan({
      direction: args.rollback ? 'rollback' : 'apply',
      payload,
      plan,
      req,
    })
    console.log(args.json ? JSON.stringify(result) : result)
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
