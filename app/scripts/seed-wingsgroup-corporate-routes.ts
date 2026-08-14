import 'dotenv/config'

import path from 'node:path'
import { createLocalReq, getPayload } from 'payload'

import config from '../src/payload.config'
import { buildWingsGroupCorporateRouteSeeds, seedWingsGroupCorporateRoutes } from './lib/wingsGroupCorporateRouteSeed'

export const parseWingsGroupCorporateSeedCommand = (argv: string[]) => ({
  apply: argv.includes('--apply'),
  adminEmail: argv.find((value) => value.startsWith('--admin-email='))?.slice('--admin-email='.length),
})

const main = async () => {
  const command = parseWingsGroupCorporateSeedCommand(process.argv.slice(2))
  if (!command.apply) {
    console.log(JSON.stringify({ apply: false, englishPublicationState: 'hidden', policyPublicationState: 'pending', routes: buildWingsGroupCorporateRouteSeeds().map(({ archetype, path, policy }) => ({ archetype, path, policy })) }, null, 2))
    return
  }

  const payload = await getPayload({ config })
  try {
    const email = command.adminEmail || process.env.IMPORT_ADMIN_EMAIL || 'local-admin@wingsgroup.test'
    const users = await payload.find({ collection: 'users', depth: 0, limit: 2, overrideAccess: true, pagination: false, where: { email: { equals: email } } })
    if (users.docs.length !== 1 || users.docs[0].role !== 'super-admin') {
      throw new Error('US-065 apply requires exactly one configured super-admin operator.')
    }
    const req = await createLocalReq({ user: users.docs[0] }, payload)
    const result = await seedWingsGroupCorporateRoutes({ payload, req })
    console.log(JSON.stringify({ apply: true, ...result }, null, 2))
  } finally {
    await payload.destroy()
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
