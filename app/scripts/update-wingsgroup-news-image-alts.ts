import 'dotenv/config'

import { createLocalReq, getPayload } from 'payload'

const confirmation = 'CONFIRM_WINGSGROUP_NEWS_ALT_WRITE'

const alts: Record<string, { vi: string; en: string }> = {
  'giay-phep-lu-hanh-va-cac-tin-hieu-trust-khi-chon-cong-ty-du-lich': {
    vi: 'Du khách kiểm tra đề xuất và chứng từ dịch vụ trước khi đặt chuyến đi',
    en: 'Traveller reviewing a travel proposal and service documents before booking',
  },
  'nhung-gi-khach-hang-can-kiem-tra-truoc-khi-dat-dich-vu-du-lich': {
    vi: 'Du khách đối chiếu checklist và thông tin chuyến đi trước khi đặt dịch vụ',
    en: 'Traveller checking a travel checklist and journey details before booking',
  },
  'xu-huong-du-lich-cao-cap-va-private-journey-2026': {
    vi: 'Cặp đôi trao đổi kế hoạch cho một hành trình riêng bên bờ biển',
    en: 'Couple discussing plans for a private coastal journey',
  },
  'vi-sao-viet-nam-phu-hop-cho-hanh-trinh-inbound-tailor-made': {
    vi: 'Du khách khám phá Việt Nam theo hành trình thiết kế riêng',
    en: 'Travellers discovering Vietnam on a tailor-made journey',
  },
  'cach-chon-dung-line-outbound-cho-han-nhat-trung': {
    vi: 'Du khách so sánh các lựa chọn hành trình Hàn Quốc, Nhật Bản và Trung Quốc',
    en: 'Traveller comparing journeys to Korea, Japan and China',
  },
  'travel-insurance-va-care-support-can-hieu-dung-dieu-gi': {
    vi: 'Du khách chuẩn bị giấy tờ và quyền lợi bảo hiểm trước chuyến đi',
    en: 'Traveller preparing travel documents and insurance cover before departure',
  },
  'fast-track-airport-services-khi-nao-nen-su-dung': {
    vi: 'Gia đình được hỗ trợ tại sân bay trước giờ khởi hành',
    en: 'Family receiving airport assistance before departure',
  },
  'nang-luc-to-chuc-hanh-trinh-doan-va-mice-cua-vietwings': {
    vi: 'Nhóm doanh nghiệp trao đổi kế hoạch hành trình đoàn và MICE',
    en: 'Business group discussing a group travel and MICE plan',
  },
  'nen-bat-dau-tu-site-nao-trong-he-sinh-thai-wingsgroup': {
    vi: 'Chuyên viên tư vấn cùng khách hàng xác định điểm bắt đầu cho hành trình',
    en: 'Travel specialist helping a guest choose where to begin their journey',
  },
  '5-site-trong-he-wingsgroup-khac-nhau-ra-sao': {
    vi: 'Người dùng sắp xếp các nhu cầu du lịch trên bản đồ và ghi chú',
    en: 'Traveller organising different travel needs with a map and notes',
  },
  'he-sinh-thai-wingsgroup-la-gi': {
    vi: 'Chuyên viên tư vấn cùng khách hàng chuẩn bị hành trình trên bản đồ',
    en: 'Travel specialist consulting with guests over a journey map',
  },
}

const main = async () => {
  if (!process.argv.includes('--apply') || !process.argv.includes(`--confirm=${confirmation}`))
    throw new Error(`Requires --apply --confirm=${confirmation}`)
  if (
    process.env.NODE_ENV !== 'production' ||
    process.env.PAYLOAD_DB_PUSH !== 'false' ||
    !/^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL || '')
  )
    throw new Error('Requires production PostgreSQL with PAYLOAD_DB_PUSH=false')
  const adminEmail = process.argv
    .find((value) => value.startsWith('--admin-email='))
    ?.slice('--admin-email='.length)
  if (!adminEmail) throw new Error('Requires --admin-email=<super-admin email>')
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  const admins = await payload.find({
    collection: 'users',
    limit: 2,
    pagination: false,
    overrideAccess: true,
    where: { email: { equals: adminEmail } },
  })
  if (admins.docs.length !== 1 || admins.docs[0].role !== 'super-admin')
    throw new Error('Requires one super-admin')
  const req = await createLocalReq({ user: admins.docs[0] as never }, payload)
  const site = await payload.find({
    collection: 'sites',
    limit: 2,
    pagination: false,
    overrideAccess: true,
    req,
    where: { code: { equals: 'wings-group' } },
  })
  if (site.docs.length !== 1) throw new Error('Expected one WingsGroup site')
  for (const [slug, alt] of Object.entries(alts)) {
    const post = await payload.find({
      collection: 'posts',
      depth: 1,
      limit: 2,
      pagination: false,
      overrideAccess: true,
      req,
      where: { and: [{ site: { equals: site.docs[0].id } }, { slug: { equals: slug } }] },
    })
    const hero = post.docs[0]?.heroImage
    const mediaID = typeof hero === 'object' && hero ? hero.id : hero
    if (post.docs.length !== 1 || !mediaID)
      throw new Error(`Missing post or hero image for ${slug}`)
    await payload.update({
      collection: 'media',
      id: mediaID,
      locale: 'vi',
      overrideAccess: true,
      req,
      context: { disableRevalidate: true },
      data: { alt: alt.vi } as never,
    })
    await payload.update({
      collection: 'media',
      id: mediaID,
      locale: 'en',
      overrideAccess: true,
      req,
      context: { disableRevalidate: true },
      data: { alt: alt.en } as never,
    })
  }
  console.log(JSON.stringify({ status: 'updated', media: Object.keys(alts).length }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
