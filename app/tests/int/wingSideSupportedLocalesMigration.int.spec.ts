import config from '@/payload.config'
import { sql } from '@payloadcms/db-postgres'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'

import * as migration from '../../src/migrations/20260724_110000_wing_side_supported_locales'

const runProof = process.env.RUN_WING_SIDE_LOCALES_MIGRATION_INT === 'true'
const proofDescribe = runProof ? describe : describe.skip

type QueryResult = { rows?: Array<Record<string, unknown>> }
type DrizzleExecutor = { execute: (query: unknown) => Promise<QueryResult> }

const assertDisposableDatabase = () => {
  const databaseURL = process.env.DATABASE_URL
  if (
    !databaseURL ||
    process.env.WING_SIDE_LOCALES_MIGRATION_INT_DISPOSABLE_DATABASE_URL !== databaseURL
  ) {
    throw new Error(
      'Set WING_SIDE_LOCALES_MIGRATION_INT_DISPOSABLE_DATABASE_URL exactly equal to DATABASE_URL to run this destructive disposable PostgreSQL proof',
    )
  }
}

proofDescribe('wing-side supported locales migration', () => {
  let payload: Payload
  let db: DrizzleExecutor

  const cleanup = async () => {
    await db.execute(sql`
      DELETE FROM "sites"
      WHERE "code" IN ('wing-side', 'wing-side-control', 'wing-side-malformed')
    `)
  }

  const insertSite = async ({
    code,
    defaultLocale = 'en',
    domain,
    locales,
    name,
  }: {
    code: string
    defaultLocale?: 'en' | 'vi'
    domain: string
    locales: Array<{ order: number; value: 'en' | 'es' | 'it' | 'pt' | 'vi' }>
    name: string
  }) => {
    const site = await db.execute(sql`
      INSERT INTO "sites" ("name", "code", "primary_domain", "default_locale", "is_active")
      VALUES (${name}, ${code}, ${domain}, ${defaultLocale}::"enum_sites_default_locale", true)
      RETURNING "id"
    `)
    const siteID = Number(site.rows?.[0]?.id)
    if (!Number.isInteger(siteID)) throw new Error(`Could not create test site ${code}`)

    for (const locale of locales) {
      await db.execute(sql`
        INSERT INTO "sites_supported_locales" ("order", "parent_id", "value")
        VALUES (${locale.order}, ${siteID}, ${locale.value}::"enum_sites_supported_locales")
      `)
    }
    return siteID
  }

  const localeSignature = async (code: string) => {
    const result = await db.execute(sql`
      SELECT sl."value"::text AS value, sl."order"::integer AS "order"
      FROM "sites_supported_locales" AS sl
      JOIN "sites" AS s ON s."id" = sl."parent_id"
      WHERE s."code" = ${code}
      ORDER BY sl."order", sl."value"::text
    `)
    return (result.rows || []).map((row) => `${row.value}@${row.order}`)
  }

  beforeAll(async () => {
    assertDisposableDatabase()
    payload = await getPayload({ config })
    expect(payload.db.packageName).toContain('db-postgres')
    const candidate = (payload.db as unknown as { drizzle?: DrizzleExecutor }).drizzle
    if (!candidate) throw new Error('PostgreSQL drizzle executor is unavailable')
    db = candidate
    await cleanup()
  }, 120_000)

  beforeEach(async () => {
    await cleanup()
  })

  afterAll(async () => {
    if (db) await cleanup()
    if (payload) await payload.destroy()
  }, 120_000)

  it('normalizes only canonical wing-side locales, is idempotent, and restores observed pre-state', async () => {
    await insertSite({
      code: 'wing-side',
      domain: 'wing-side.invalid',
      locales: [
        { order: 1, value: 'en' },
        { order: 2, value: 'vi' },
      ],
      name: 'wing-side',
    })
    await insertSite({
      code: 'wing-side-control',
      domain: 'wing-side-control.invalid',
      locales: [
        { order: 1, value: 'en' },
        { order: 2, value: 'vi' },
      ],
      name: 'control',
    })

    await migration.up({ db } as never)

    await expect(localeSignature('wing-side')).resolves.toEqual([
      'en@1',
      'vi@2',
      'it@3',
      'es@4',
      'pt@5',
    ])
    await expect(localeSignature('wing-side-control')).resolves.toEqual(['en@1', 'vi@2'])

    await migration.up({ db } as never)
    await expect(localeSignature('wing-side')).resolves.toEqual([
      'en@1',
      'vi@2',
      'it@3',
      'es@4',
      'pt@5',
    ])

    await migration.down({ db } as never)
    await expect(localeSignature('wing-side')).resolves.toEqual(['en@1', 'vi@2'])
    await expect(localeSignature('wing-side-control')).resolves.toEqual(['en@1', 'vi@2'])
  })

  it('fails closed on malformed wing-side locale state without mutation', async () => {
    await insertSite({
      code: 'wing-side',
      domain: 'wing-side-malformed.invalid',
      locales: [
        { order: 1, value: 'vi' },
        { order: 2, value: 'en' },
      ],
      name: 'wing-side malformed',
    })

    await expect(migration.up({ db } as never)).rejects.toThrow('unexpected pre-state')
    await expect(localeSignature('wing-side')).resolves.toEqual(['vi@1', 'en@2'])
  })

  it('is a no-op when the canonical tenant is absent', async () => {
    await expect(migration.up({ db } as never)).resolves.toBeUndefined()
    await expect(localeSignature('wing-side')).resolves.toEqual([])

    await expect(migration.down({ db } as never)).resolves.toBeUndefined()
    await expect(localeSignature('wing-side')).resolves.toEqual([])
  })

  it('fails closed when the canonical tenant default locale is not en', async () => {
    await insertSite({
      code: 'wing-side',
      defaultLocale: 'vi',
      domain: 'wing-side-wrong-default.invalid',
      locales: [
        { order: 1, value: 'en' },
        { order: 2, value: 'vi' },
      ],
      name: 'wing-side wrong default',
    })

    await expect(migration.up({ db } as never)).rejects.toThrow('expected default_locale=en')
    await expect(localeSignature('wing-side')).resolves.toEqual(['en@1', 'vi@2'])
  })
})
