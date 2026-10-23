import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Payload } from 'payload'
import { normalizePhoneNumber } from '../src/utilities/siteHotlines'

const oldPhone = '0912910101'
const newPhone = '0948786775'

export async function updateWingsGoHotlineInPayload(
  payload: Payload,
  { apply = false }: { apply?: boolean } = {},
) {
  const sites = await payload.find({
    collection: 'sites',
    where: { code: { equals: 'wings-go' } },
    depth: 0,
    limit: 2,
    overrideAccess: true,
  })
  if (sites.docs.length !== 1) {
    throw new Error('Expected exactly one WingsGo site.')
  }
  const settingsResult = await payload.find({
    collection: 'site-settings',
    where: { site: { equals: sites.docs[0].id } },
    depth: 0,
    limit: 2,
    overrideAccess: true,
  })
  if (settingsResult.docs.length !== 1) {
    throw new Error('Expected exactly one WingsGo settings document.')
  }
  const settings = settingsResult.docs[0]
  const previousPhone = settings.supportPhone || ''
  const normalized = normalizePhoneNumber(previousPhone)
  const result = {
    siteCode: 'wings-go',
    settingsID: settings.id,
    previousPhone,
    currentPhone: previousPhone,
  }
  if (!previousPhone.trim() || normalized === newPhone) {
    return { ...result, status: 'noop' as const }
  }
  if (normalized !== oldPhone) {
    throw new Error('Unexpected WingsGo main hotline; preserve custom CMS values.')
  }
  if (!apply) {
    return { ...result, currentPhone: newPhone, status: 'planned' as const }
  }
  await payload.update({
    collection: 'site-settings',
    id: settings.id,
    data: { supportPhone: newPhone },
    context: { seed: true },
    overrideAccess: true,
  })
  return { ...result, currentPhone: newPhone, status: 'updated' as const }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const run = async () => {
    const { getPayload } = await import('payload')
    const config = (await import('@payload-config')).default
    const payload = await getPayload({ config })
    try {
      const result = await updateWingsGoHotlineInPayload(payload, {
        apply: process.argv.includes('--apply'),
      })
      console.log(JSON.stringify(result, null, 2))
    } finally {
      await payload.destroy()
    }
  }
  run().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
