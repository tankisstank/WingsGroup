import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createLocalReq, getPayload } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import config from '@/payload.config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const payload = await getPayload({ config })
const locales = ['vi', 'en'] as const

const BRAND_UPDATES = {
  wingsgo: {
    description: {
      vi: 'Hành trình nước ngoài chọn lọc, lịch khởi hành định kỳ và dịch vụ tư vấn visa, thủ tục trọn gói trước chuyến đi.',
      en: 'Curated outbound retail tours, regular departure schedules and comprehensive visa support.',
    },
    path: '/gioi-thieu-wingsgo',
  },
  'wing-side': {
    description: {
      vi: 'Hành trình Việt Nam được thiết kế theo nhịp đi riêng, trải nghiệm bản địa sâu sắc và kỳ nghỉ riêng tư cho gia đình.',
      en: 'Tailor-made Vietnam journeys shaped around local culture, private family groups and immersive experiences.',
    },
    path: '/gioi-thieu-wingside',
  },
  wingspass: {
    description: {
      vi: 'Dịch vụ đón tiễn tại sân bay, hỗ trợ thủ tục hàng không nhanh chóng và Fast Track tiện lợi.',
      en: 'Airport touchpoints, arrival support, VIP reception and Fast Track clearance upon request.',
    },
    path: '/gioi-thieu-wingspass',
  },
  wingsplus: {
    description: {
      vi: 'Hành trình riêng, Company Trip, MICE và các chương trình thiết kế theo yêu cầu.',
      en: 'Private journeys, Company Trips, MICE and programmes designed around your needs.',
    },
    path: '/gioi-thieu-wingsplus',
  },
  wingscare: {
    description: {
      vi: 'Tư vấn bảo hiểm du lịch, hỗ trợ khẩn cấp 24/7 và chăm sóc khách hàng toàn diện suốt chuyến đi.',
      en: 'Travel care, insurance guidance and responsive 24/7 assistance across every stage of travel.',
    },
    path: '/gioi-thieu-wingscare',
  },
} as const

const updateEcosystemBlock = (layout: any[], locale: 'vi' | 'en') => {
  return layout.map((block) => {
    if (block.blockType !== 'wingsGroupEcosystem') return block
    const updatedProfiles = (block.profiles || []).map((profile: any) => {
      const update = BRAND_UPDATES[profile.brandKey as keyof typeof BRAND_UPDATES]
      if (!update) return profile
      return {
        ...profile,
        description: update.description[locale],
        cta: {
          ...profile.cta,
          state: 'approved-deep-link',
          label: locale === 'vi' ? 'Xem giới thiệu' : 'View introduction',
          url: `https://wingsgroup.vn${locale === 'vi' ? '' : '/en'}${update.path}`,
        },
      }
    })
    return {
      ...block,
      profiles: updatedProfiles,
    }
  })
}

let transactionID: string | number | undefined
let committed = false

try {
  const admin = (
    await payload.find({
      collection: 'users',
      depth: 0,
      limit: 1,
      where: { role: { equals: 'super-admin' } },
    })
  ).docs[0]
  assert(admin, 'Super admin user required')

  const req = await createLocalReq({ user: admin }, payload)

  // 1. Snapshot both pages before modification
  const targetPageIDs = [191, 181] as const
  const snapshot: any[] = []

  for (const id of targetPageIDs) {
    const published = await payload.findByID({
      collection: 'pages',
      id,
      depth: 0,
      locale: 'all',
      fallbackLocale: false,
      req,
    })
    assert(published, `Page ${id} not found`)
    assert.equal(published.site, 1, `Page ${id} must belong to site 1`)
    snapshot.push(published)
  }

  writeFileSync(
    path.join(__dirname, '..', 'ecosystem-pages-before.json'),
    JSON.stringify(snapshot, null, 2),
  )

  // 2. Start serializable transaction with locks
  transactionID = await payload.db.beginTransaction({ isolationLevel: 'serializable' })
  assert(transactionID)
  req.transactionID = transactionID
  const transaction = (payload.db as any).sessions[transactionID].db

  await transaction.execute(sql`SET LOCAL lock_timeout = '5s'`)
  await transaction.execute(sql`LOCK TABLE _pages_v IN SHARE ROW EXCLUSIVE MODE`)
  await transaction.execute(sql`SELECT id FROM pages WHERE id IN (181, 191) FOR UPDATE`)

  for (const page of snapshot) {
    for (const locale of locales) {
      const currentLayout = page.layout[locale]
      assert(Array.isArray(currentLayout), `Page ${page.id} ${locale} layout missing`)
      const newLayout = updateEcosystemBlock(currentLayout, locale)

      await payload.update({
        collection: 'pages',
        id: page.id,
        locale,
        req,
        draft: false,
        overrideAccess: false,
        data: {
          _status: 'published',
          layout: newLayout,
        },
      })
    }
  }

  await payload.db.commitTransaction(transactionID)
  committed = true

  // 3. Verify updated pages
  const verified = []
  for (const id of targetPageIDs) {
    const doc = await payload.findByID({
      collection: 'pages',
      id,
      depth: 0,
      locale: 'all',
      fallbackLocale: false,
      req,
    })
    for (const locale of locales) {
      const eco = doc.layout[locale].find((b: any) => b.blockType === 'wingsGroupEcosystem')
      assert(eco, `Page ${id} ${locale} must have ecosystem block`)
      for (const brand of Object.keys(BRAND_UPDATES)) {
        const p = eco.profiles.find((item: any) => item.brandKey === brand)
        assert(p, `Page ${id} ${locale} missing profile ${brand}`)
        assert.equal(p.cta.state, 'approved-deep-link')
        assert.equal(
          p.cta.url,
          `https://wingsgroup.vn${locale === 'vi' ? '' : '/en'}${BRAND_UPDATES[brand as keyof typeof BRAND_UPDATES].path}`,
        )
      }
    }
    verified.push({ id: doc.id, pathname: doc.pathname, updatedAt: doc.updatedAt })
  }

  writeFileSync(
    path.join(__dirname, '..', 'ecosystem-pages-after.json'),
    JSON.stringify(verified, null, 2),
  )
  console.log('Successfully synchronized ecosystem blocks for both pages:', verified)
} catch (error) {
  if (transactionID && !committed) {
    console.error('Error during ecosystem update, rolling back transaction...')
    await payload.db.rollbackTransaction(transactionID)
  }
  throw error
} finally {
  await payload.destroy()
}
