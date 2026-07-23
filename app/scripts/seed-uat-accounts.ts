import { createLocalReq, getPayload } from 'payload'

import config from '../src/payload.config'
import type { AppRole } from '../src/types/auth'

/**
 * Seeds a fixed set of UAT accounts used to walk the Phụ lục 01 checklist
 * (roles items 7-9) during the M1-M3 đối soát with the client.
 *
 * Idempotent: users are matched by email and updated in place, so re-running
 * against production never creates duplicates. Each account has a fixed
 * defaultPassword; an env override (UAT_<KEY>_PASSWORD) takes precedence if set.
 * Site assignments are resolved by site `code`, so the target sites must
 * already exist (they do after seed-subsites / production bootstrap).
 */

type UatAccountSeed = {
  key: string
  email: string
  name: string
  role: AppRole
  siteCodes: string[]
}

// Sites must match seed codes in scripts/seed-subsites.ts.
const uatAccountSeeds: UatAccountSeed[] = [
  {
    key: 'SUPERADMIN_PRIMARY',
    email: 'uat.superadmin@wingsgroup.vn',
    name: 'UAT Super Admin (chính)',
    role: 'super-admin',
    siteCodes: [],
  },
  {
    key: 'SUPERADMIN_SECONDARY',
    email: 'uat.superadmin2@wingsgroup.vn',
    name: 'UAT Super Admin (phụ)',
    role: 'super-admin',
    siteCodes: [],
  },
  {
    key: 'SITEMANAGER_SINGLE',
    email: 'uat.sitemanager.single@wingsgroup.vn',
    name: 'UAT Site Manager (1 site)',
    role: 'site-manager',
    siteCodes: ['wings-go'],
  },
  {
    key: 'SITEMANAGER_MULTI',
    email: 'uat.sitemanager.multi@wingsgroup.vn',
    name: 'UAT Site Manager (nhiều site)',
    role: 'site-manager',
    siteCodes: ['wings-go', 'wing-side'],
  },
  {
    key: 'EDITOR_SINGLE',
    email: 'uat.editor.single@wingsgroup.vn',
    name: 'UAT Editor (1 site)',
    role: 'editor',
    siteCodes: ['wings-care'],
  },
  {
    key: 'EDITOR_MULTI',
    email: 'uat.editor.multi@wingsgroup.vn',
    name: 'UAT Editor (nhiều site)',
    role: 'editor',
    siteCodes: ['wings-care', 'wings-pass'],
  },
]

const seedContext = {
  disableRevalidate: true,
  seed: true,
}

const resolvePassword = (account: UatAccountSeed): string => {
  const override = process.env[`UAT_${account.key}_PASSWORD`]

  if (!override || override.length < 16) {
    throw new Error(
      `Missing or weak password. Set UAT_${account.key}_PASSWORD (minimum 16 characters).`,
    )
  }

  return override
}

const payload = await getPayload({ config })
const req = await createLocalReq(
  {
    user: {
      id: 0,
      role: 'super-admin',
      sites: [],
      email: 'uat-seeder@internal.invalid',
      collection: 'users',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  payload,
)

// Resolve every referenced site code to an ID up-front so a typo fails loudly
// before we start writing users.
const referencedCodes = [...new Set(uatAccountSeeds.flatMap((account) => account.siteCodes))]

const siteIDByCode = new Map<string, number>()

if (referencedCodes.length > 0) {
  const sites = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: referencedCodes.length,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      code: {
        in: referencedCodes,
      },
    },
  })

  for (const site of sites.docs) {
    if (typeof site.code === 'string') {
      siteIDByCode.set(site.code, Number(site.id))
    }
  }

  const missing = referencedCodes.filter((code) => !siteIDByCode.has(code))

  if (missing.length > 0) {
    throw new Error(
      `Missing site records for codes: ${missing.join(', ')}. Seed the sites before UAT accounts.`,
    )
  }
}

type SeedResult = {
  action: 'created' | 'updated'
  email: string
  name: string
  role: AppRole
  sites: string
}

const results: SeedResult[] = []

for (const account of uatAccountSeeds) {
  const password = resolvePassword(account)
  const siteIDs = account.siteCodes.map((code) => siteIDByCode.get(code)!).filter(Boolean)

  const existing = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      email: {
        equals: account.email,
      },
    },
  })

  const data = {
    email: account.email,
    name: account.name,
    password,
    role: account.role,
    sites: account.role === 'super-admin' ? [] : siteIDs,
  }

  const current = existing.docs[0]

  if (current) {
    await payload.update({
      collection: 'users',
      context: seedContext,
      data,
      id: current.id,
      overrideAccess: true,
      req,
    })
  } else {
    await payload.create({
      collection: 'users',
      context: seedContext,
      data,
      overrideAccess: true,
      req,
    })
  }

  results.push({
    action: current ? 'updated' : 'created',
    email: account.email,
    name: account.name,
    role: account.role,
    sites: account.siteCodes.length > 0 ? account.siteCodes.join(', ') : '(toàn hệ)',
  })
}

console.log('\n=== UAT accounts seeded ===\n')

for (const result of results) {
  console.log(`[${result.action}] ${result.name}`)
  console.log(`  email : ${result.email}`)
  console.log(`  role  : ${result.role}`)
  console.log(`  sites : ${result.sites}`)
  console.log('')
}

console.log('Passwords were supplied through UAT_<KEY>_PASSWORD and were not printed.\n')

process.exit(0)
