import 'dotenv/config'

import path from 'node:path'

import {
  assertUs055CatalogLifecycleTarget,
  loadUs055CatalogArtifact,
  readUs055LifecyclePlan,
} from './lib/wingsSideUs055CatalogLifecycle'

const argumentValue = (name: string) => {
  const inline = process.argv.find((argument) => argument.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const required = (name: string) => {
  const value = String(argumentValue(name) || '').trim()
  if (!value) throw new Error(`US-055 lifecycle preflight requires ${name}`)
  return value
}

const main = async () => {
  const target = assertUs055CatalogLifecycleTarget({
    databaseURL: String(process.env.DATABASE_URL || ''),
  })
  const catalog = await loadUs055CatalogArtifact({
    catalogPath: required('--catalog'),
    expectedRawSha256: required('--catalog-sha256'),
  })
  const planPath = argumentValue('--plan')
  const plan =
    planPath === undefined
      ? null
      : await readUs055LifecyclePlan({
          expectedCanonicalSha256: required('--plan-canonical-sha256'),
          expectedRawSha256: required('--plan-raw-sha256'),
          planPath,
        })
  console.log(
    JSON.stringify({
      catalogPath: catalog.catalogPath,
      catalogRawSha256: catalog.catalogRawSha256,
      mode: 'rehearsal-preflight',
      planPath: planPath ? path.resolve(planPath) : null,
      planValidated: Boolean(plan),
      target,
    }),
  )
}

await main()
