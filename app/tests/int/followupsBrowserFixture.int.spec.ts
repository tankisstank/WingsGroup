import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import configPromise from '@payload-config'
import { createLocalReq, getPayload, type RequiredDataFromCollectionSlug } from 'payload'
import type { SiteSetting } from '@/payload-types'
import { buildWingsGroupSettingsGovernance } from '../../scripts/lib/wingsGroupCorporateRouteSeed'
import { it } from 'vitest'
import { richText, richTextFromSections } from '../../scripts/lib/payloadSeedBuilders'

const context = { seed: true, disableRevalidate: true }
const root = path.resolve('../..')

it.skipIf(process.env.FOLLOWUPS_BROWSER_SEED !== '1')('creates browser fixtures only in the disposable PostgreSQL', async () => {
  assert.equal(process.env.DATABASE_URL, 'postgres://followups:followups-local-only@127.0.0.1:55488/followups')
  const config = await configPromise
  config.typescript.autoGenerate = false
  const payload = await getPayload({ config })
  const req = await createLocalReq({ context, user: { collection: 'users', id: 0, email: 'local-proof@invalid.test', role: 'super-admin', sites: [], createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString() } }, payload)
  try {
    const createPage = async (data: RequiredDataFromCollectionSlug<'pages'>) => {
      const found = await payload.find({ collection: 'pages', overrideAccess: true, where: { and: [{ slug: { equals: data.slug } }, { site: { equals: data.site } }] }, limit: 1 })
      return found.docs[0]
        ? payload.update({ collection: 'pages', id: found.docs[0].id, locale: 'vi', req, context, overrideAccess: true, data })
        : payload.create({ collection: 'pages', locale: 'vi', req, context, overrideAccess: true, data })
    }
    const site = async (code: string) => {
      const existing = await payload.find({ collection: 'sites', overrideAccess: true, where: { code: { equals: code } } })
      const primaryDomain = code === 'wings-go' ? 'wingsgo.vn' : 'wingsgroup.vn'
      if (existing.docs[0]) return payload.update({ collection: 'sites', id: existing.docs[0].id, req, context, overrideAccess: true, data: { primaryDomain } })
      return payload.create({
        collection: 'sites', context, overrideAccess: true,
        data: { code, name: code, primaryDomain, supportedLocales: ['vi', 'en'], defaultLocale: 'vi' },
      })
    }
    const go = await site('wings-go')
    const group = await site('wings-group')
    const groupSettings = await payload.find({ collection: 'site-settings', overrideAccess: true, where: { site: { equals: group.id } } })
    if (!groupSettings.docs.length) await payload.create({ collection: 'site-settings', req, context, overrideAccess: true, data: {
      site: group.id, siteName: 'WingsGroup', branding: { themeKey: 'wings-group' }, wingsGroupV3: buildWingsGroupSettingsGovernance() as SiteSetting['wingsGroupV3'],
    } })
    const settings = await payload.find({ collection: 'site-settings', overrideAccess: true, where: { site: { equals: go.id } } })
    if (!settings.docs.length) await payload.create({
      collection: 'site-settings', context, overrideAccess: true,
      data: { site: go.id, siteName: 'WingsGo local proof', branding: { themeKey: 'wings-go' }, supportPhone: '0948 786 775', additionalHotlines: [{ phoneNumber: '0915 250 101' }, { phoneNumber: '0915 260 101' }] },
    })
    const media = await payload.create({
      collection: 'media', context, overrideAccess: true,
      filePath: path.join(root, 'fixture-video.mp4'),
      data: { site: go.id, alt: 'Local campaign video', caption: richText('Tour outbound WingsGo theo mùa', 'Hình đại diện các tour Hàn, Nhật, Trung với giá và lịch khởi hành rõ.') },
    })
    const cta = {
      blockType: 'cta' as const,
      richText: richText('Tư vấn', 'Gọi 0912 910 101; hotline phụ 0915 250 101 / 0915 260 101.'),
      links: [{ link: { type: 'custom' as const, label: 'Gọi 0912910101', url: 'tel:0912910101' } }],
    }
    const campaign = await createPage({
        site: go.id, title: 'Campaign local proof', slug: 'campaign', _status: 'published',
        hero: {
          type: 'mediumImpact', media: media.id,
          richText: richTextFromSections([{ kind: 'heading', tag: 'h1', text: 'Tour theo mùa: Khám phá vẻ đẹp bốn mùa châu Á' }]),
          links: [{ link: { type: 'custom', label: 'Yêu cầu tư vấn', url: '/lien-he#contact-form', appearance: 'default' } }],
        }, layout: [cta],
    })
    await payload.update({
      collection: 'pages', id: campaign.id, locale: 'en', context, overrideAccess: true,
      data: { title: 'Seasonal tours', hero: { richText: richTextFromSections([{ kind: 'heading', tag: 'h1', text: 'Seasonal tours: discover Asia' }]) } },
    })
    const control = await createPage({
      site: go.id, title: 'Caption control', slug: 'caption-control', _status: 'published', hero: { type: 'mediumImpact', media: media.id, richText: richTextFromSections([{ kind: 'heading', tag: 'h1', text: 'Caption control' }]) }, layout: [cta],
    })
    await createPage({
      site: go.id, title: 'Liên hệ', slug: 'lien-he', _status: 'published', hero: { type: 'lowImpact', richText: richTextFromSections([{ kind: 'heading', tag: 'h1', text: 'Liên hệ' }]) }, layout: [cta],
    })
    const fixture = JSON.parse(await fs.readFile(path.join(root, 'wingsplus-fixture.json'), 'utf8')) as { items: { title: string; description: string }[] }
    const pages: number[] = []
    for (const presentation of ['icon-grid', 'accordion', 'tabs'] as const) {
      const document = await createPage({
        site: group.id, title: 'WingsPlus ' + presentation, slug: presentation === 'icon-grid' ? 'gioi-thieu-wingsplus' : presentation === 'accordion' ? 've-wingsgroup' : 'nang-luc-dich-vu', _status: 'published', wingsGroupRoute: { managedBy: 'wingsgroup-v3', archetype: presentation === 'tabs' ? 'capability' : 'corporate', publication: { vi: 'approved', en: 'hidden' } }, hero: { type: 'none' }, layout: [{ blockType: 'featureGrid', title: 'Bốn nhóm dịch vụ WingsPlus', columns: '2', presentation, items: fixture.items }],
      })
      pages.push(document.id)
    }
    await fs.writeFile(path.join(root, 'browser-fixture-ids.json'), JSON.stringify({ createdAt: new Date().toISOString(), campaign: campaign.id, control: control.id, media: media.id, featurePages: pages }, null, 2))
  } finally {
    await payload.destroy()
  }
}, 60_000)
