import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { SupportedLocaleCode } from '@/utilities/locales'

type InventorySite = {
  additionalDomains?: string[]
  canonicalDomain: null | string
  defaultLocale: SupportedLocaleCode
  formRouteSample: null | string
  hosts: string[]
  id?: number
  localDevelopmentHosts?: string[]
  localAlias: string
  name: string
  nestedRouteSamples: Partial<Record<SupportedLocaleCode, string>>
  postRouteSample: null | string
  primaryDomain: string
  publicLocales: SupportedLocaleCode[]
  supportedLocales: SupportedLocaleCode[]
  themeKey?: null | string
}

type InventoryDocument = {
  generatedAt: string
  migrationHead?: null | string
  sites: InventorySite[]
}

let cachedInventory: InventoryDocument | null = null

export const loadMultisiteAuditInventory = (): InventoryDocument => {
  if (cachedInventory) {
    return cachedInventory
  }

  const file = join(
    process.cwd(),
    '..',
    'artifacts',
    'audits',
    'multisite-remediation-2026-07-13',
    'site-inventory.json',
  )

  cachedInventory = JSON.parse(readFileSync(file, 'utf8')) as InventoryDocument

  return cachedInventory
}
