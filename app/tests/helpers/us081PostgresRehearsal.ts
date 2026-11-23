import assert from 'node:assert/strict'
import { postgresAdapter, sql } from '@payloadcms/db-postgres'
import { createLocalReq, getPayload } from 'payload'

const databaseURL = process.env.DATABASE_URL || ''
const target = new URL(databaseURL)
assert.equal(target.hostname, '127.0.0.1')
assert.equal(target.port, '15481')
assert.equal(target.pathname, '/wings_us081_test')
assert.equal(process.env.US081_DISPOSABLE_REHEARSAL, 'true')

const migration = await import('../../src/migrations/20261019_100000_site_settings_hotlines')
const adapter = postgresAdapter({ pool: { connectionString: databaseURL }, push: false }).init({
  payload: { logger: { error: console.error, info: () => undefined, warn: console.warn } },
} as never)
await adapter.connect!()
try {
  // Only this explicitly named disposable database is allowed to reset the new table.
  await adapter.drizzle.execute(sql`DROP TABLE IF EXISTS site_settings_additional_hotlines`)
  await adapter.drizzle.execute(sql`
    INSERT INTO sites (name, code, primary_domain, default_locale, is_active)
    VALUES ('WingsGo', 'wings-go', 'wingsgo.vn', 'vi', true),
           ('WingSide', 'wing-side', 'wingside.vn', 'en', true),
           ('WingsGroup', 'wings-group', 'wingsgroup.vn', 'vi', true)
    ON CONFLICT (code) DO UPDATE SET primary_domain = excluded.primary_domain
  `)
  await adapter.drizzle.execute(sql`
    INSERT INTO site_settings (site_id, site_name, support_phone)
    SELECT id, name, CASE WHEN code = 'wings-go' THEN '0919000000' ELSE '+33123456789' END
    FROM sites WHERE code IN ('wings-go', 'wing-side', 'wings-group')
      AND NOT EXISTS (SELECT 1 FROM site_settings settings WHERE settings.site_id = sites.id)
  `)
  await adapter.drizzle.execute(sql`
    UPDATE site_settings SET support_phone = '0919000000'
    WHERE site_id = (SELECT id FROM sites WHERE code = 'wings-go')
  `)
  await migration.up({ db: adapter.drizzle } as never)
  const numbers = async () => (await adapter.drizzle.execute(sql`
    SELECT hotlines.phone_number, settings.support_phone, sites.code
    FROM site_settings_additional_hotlines hotlines
    JOIN site_settings settings ON settings.id = hotlines._parent_id
    JOIN sites ON sites.id = settings.site_id ORDER BY hotlines._order
  `)).rows
  const initial = await numbers()
  assert.deepEqual(initial.map((row) => row.phone_number), ['0915250101', '0915260101'])
  assert(initial.every((row) => row.code === 'wings-go' && row.support_phone === '0919000000'))
  await adapter.drizzle.execute(sql`
    DELETE FROM site_settings_additional_hotlines WHERE phone_number = '0915250101'
  `)
  await migration.up({ db: adapter.drizzle } as never)
  assert.deepEqual((await numbers()).map((row) => row.phone_number), ['0915260101'])
  await adapter.drizzle.execute(sql`DELETE FROM site_settings_additional_hotlines`)
  await migration.up({ db: adapter.drizzle } as never)
  assert.equal((await numbers()).length, 0)
  console.log('[US081] PASS legacy upgrade, tenant isolation, custom main, repeated migration and deletion preservation')
} finally {
  await adapter.destroy!()
}

const { default: config } = await import('../../src/payload.config')
const { contentBlock } = await import('../../scripts/lib/payloadSeedBuilders')
const { resolveSiteHotlines } = await import('../../src/utilities/siteHotlines')
const { getSharedCachedValue } = await import('../../src/infrastructure/cache/sharedCache')
const payload = await getPayload({ config })
const context = { seed: true, disableRevalidate: true }
try {
  const { ensureLocalAdminUser } = await import('../../src/utilities/adminSeed')
  const admin = await ensureLocalAdminUser(payload, undefined, { allowDisposablePostgres: true })
  const req = await createLocalReq({ user: admin }, payload)
  for (const code of ['wing-side']) {
    const tenant = (await payload.find({ collection: 'sites', where: { code: { equals: code } }, limit: 1 })).docs[0]
    const homepage = await payload.find({ collection: 'pages', where: { site: { equals: tenant.id } }, limit: 1 })
    if (!homepage.docs.length) {
      await payload.create({ collection: 'pages', context, req, data: {
        title: `${tenant.name} isolation rehearsal`, site: tenant.id, slug: `${code}-us081-home`, pathname: '/',
        hero: { type: 'none' },
        layout: [contentBlock([{ title: tenant.name, paragraph: 'US-081 tenant isolation.', size: 'full' }])],
        _status: 'published',
      } })
    }
  }
  const site = (await payload.find({ collection: 'sites', where: { code: { equals: 'wings-go' } }, depth: 0 })).docs[0]
  const settings = (await payload.find({ collection: 'site-settings', where: { site: { equals: site.id } }, depth: 0 })).docs[0]
  const read = () => payload.findByID({ collection: 'site-settings', id: settings.id, depth: 0 })
  const cached = () => getSharedCachedValue({ namespace: 'site-settings', tenant: site.id, variant: 'vi', load: read })
  assert.equal((await cached()).supportPhone, '0919000000')
  await payload.update({ collection: 'site-settings', id: settings.id, context, data: {
    supportPhone: '0912910101', additionalHotlines: [{ phoneNumber: '+84 915 250 101', label: 'Tư vấn 2' }, { phoneNumber: '0915260101' }],
    branding: { themeKey: 'wings-go', logoText: 'WingsGo' },
  } })
  assert.equal((await cached()).supportPhone, '0912910101')
  assert.deepEqual(resolveSiteHotlines(await read(), 'wings-go').map((row) => row.href),
    ['tel:0912910101', 'tel:0915250101', 'tel:0915260101'])
  await payload.update({ collection: 'site-settings', id: settings.id, context, data: { additionalHotlines: [] } })
  assert.equal(resolveSiteHotlines(await cached(), 'wings-go').length, 1)
  await assert.rejects(() => payload.update({ collection: 'site-settings', id: settings.id, context,
    data: { additionalHotlines: [{ phoneNumber: 'javascript:0915250101' }] } }), /phone|điện thoại|hotline|invalid|không hợp lệ/i)
  await assert.rejects(() => payload.update({ collection: 'site-settings', id: settings.id, context,
    data: { additionalHotlines: Array.from({ length: 6 }, (_, index) => ({ phoneNumber: `091900000${index}` })) } }))
  await payload.update({ collection: 'site-settings', id: settings.id, context, data: {
    additionalHotlines: [{ phoneNumber: '0915250101' }, { phoneNumber: '0915260101' }],
  } })
  const existing = await payload.find({ collection: 'pages', where: { site: { equals: site.id } }, limit: 1 })
  if (!existing.docs.length) {
    await payload.create({ collection: 'pages', context, req, data: {
      title: 'Kiểm tra hotline WingsGo', site: site.id, slug: 'home', pathname: '/',
      hero: { type: 'none' },
      layout: [contentBlock([{ title: 'Kiểm tra hotline', paragraph: 'US-081 local rehearsal.', size: 'full' }])],
      _status: 'published',
    } })
  }
  const tours = await payload.find({ collection: 'tour-products', where: { site: { equals: site.id } }, limit: 1 })
  if (!tours.docs.length) {
    await payload.create({ collection: 'tour-products', context, req, draft: false, data: {
      title: 'Tour kiểm tra hotline US081', site: site.id, slug: 'us081-hotline-rehearsal', market: 'korea', _status: 'published',
      durationDays: 2,
      durationNights: 1,
      summary: 'Tour dữ liệu thử để kiểm tra hotline và modal tư vấn.',
      primaryCTA: { mode: 'inquiry' },
      bcfg: { template: 'dense-retail-default', ctaStyle: 'inquiry' },
      itineraryDays: [{ dayNumber: 1, title: 'Seoul', summary: 'Lịch trình dữ liệu thử US-081.' }],
    } })
  }
  const tour = (await payload.find({ collection: 'tour-products', where: {
    and: [{ site: { equals: site.id } }, { slug: { equals: 'us081-hotline-rehearsal' } }],
  }, limit: 1 })).docs[0]
  const departures = await payload.find({ collection: 'tour-departures', where: {
    tourProduct: { equals: tour.id },
  }, limit: 1 })
  if (!departures.docs.length) {
    await payload.create({ collection: 'tour-departures', context, req, data: {
      site: site.id,
      tourProduct: tour.id,
      departureDate: '2026-11-20T00:00:00.000Z',
      departureCity: 'Hà Nội',
      priceFrom: 12000000,
      currency: 'VND',
      priceBasis: 'per-person',
      verifiedAt: '2026-10-18T00:00:00.000Z',
      expiresAt: '2026-11-19T00:00:00.000Z',
      availabilityStatus: 'open',
      _status: 'published',
    } })
  }
  for (const pathname of ['/tour/us081-hotline-rehearsal', '/lich-khoi-hanh']) {
    const wrapper = await payload.find({ collection: 'pages', where: {
      and: [{ site: { equals: site.id } }, { pathname: { equals: pathname } }],
    }, limit: 1 })
    if (!wrapper.docs.length) {
      await payload.create({ collection: 'pages', context, req, data: {
        title: pathname.includes('us081') ? 'Tour kiểm tra hotline US081' : 'Lịch khởi hành',
        site: site.id,
        slug: pathname.split('/').at(-1)!,
        pathname,
        hero: { type: 'none' },
        layout: [contentBlock([{ title: 'Kiểm tra hotline', paragraph: 'US-081 local rehearsal.', size: 'full' }])],
        _status: 'published',
      } })
    }
  }
  console.log('[US081] PASS Payload CRUD, CMS invalid input, same-process settings cache invalidation; browser fixtures ready')
} finally {
  await payload.destroy()
}

process.exit(0)
