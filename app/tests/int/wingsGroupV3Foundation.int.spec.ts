import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { Media } from '@/collections/Media'
import { Pages } from '@/collections/Pages'
import { SiteSettings } from '@/collections/SiteSettings'

const namedField = (fields: NonNullable<typeof SiteSettings.fields>, name: string) =>
  fields.find((field) => 'name' in field && field.name === name)

describe('WingsGroup v3 Payload foundation', () => {
  it('registers optional settings/media fields and governed Page blocks', () => {
    expect(namedField(SiteSettings.fields, 'wingsGroupV3')).toBeTruthy()
    expect(namedField(Media.fields, 'governance')).toBeTruthy()

    const tabs = Pages.fields.find((field) => field.type === 'tabs')
    const contentTab =
      tabs && 'tabs' in tabs ? tabs.tabs.find((tab) => tab.label === 'Nội dung') : undefined
    const layout = contentTab?.fields.find((field) => 'name' in field && field.name === 'layout')
    const blockSlugs =
      layout && layout.type === 'blocks' ? layout.blocks.map((block) => block.slug) : []
    expect(blockSlugs).toEqual(
      expect.arrayContaining(['wingsGroupEcosystem', 'wingsGroupProofArchive']),
    )
  })

  it('keeps the PostgreSQL migration focused on E09 additive tables', () => {
    const migration = fs.readFileSync(
      path.resolve(
        process.cwd(),
        'src/migrations/20260813_193226_wingsgroup_v3_data_foundation.ts',
      ),
      'utf8',
    )
    expect(migration).toContain('CREATE TABLE "wg_ecosystem"')
    expect(migration).toContain('CREATE TABLE "wg_proof"')
    expect(migration).toContain('CREATE TABLE "media_governance_responsive_derivatives"')
    expect(migration).not.toContain('tour_products')
    expect(migration).not.toContain('form_submissions')
  })
})
