import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createLocalReq, getPayload } from 'payload'
import config from '@/payload.config'
import { WINGSGROUP_CONTENT_VALIDATION_MARKER } from '@/wingsgroup/corporateRoutes'

const payload = await getPayload({ config })
try {
  const site = await payload.findByID({ collection: 'sites', id: 1, depth: 0 })
  assert.equal(site.code, 'wings-group')

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

  const items = [
    { key: 'wingsgo', file: 'page-wingsgo.json' },
    { key: 'wingside', file: 'page-wingside.json' },
    { key: 'wingspass', file: 'page-wingspass.json' },
    { key: 'wingscare', file: 'page-wingscare.json' },
  ]

  const results = []

  for (const item of items) {
    const raw = JSON.parse(
      readFileSync(
        path.join(__dirname, '..', 'content', item.file),
        'utf8',
      ),
    )
    const { slug, media: mediaID, vi, en } = raw
    const media = await payload.findByID({ collection: 'media', id: mediaID, depth: 0 })
    assert.equal(media.site, site.id, `Media ${mediaID} must belong to WingsGroup`)

    const existing = await payload.find({
      collection: 'pages',
      depth: 0,
      limit: 1,
      where: {
        and: [{ site: { equals: site.id } }, { pathname: { equals: `/${slug}` } }],
      },
    })

    let docID: number
    if (existing.totalDocs > 0) {
      docID = existing.docs[0].id as number
      console.log(`Page /${slug} already exists (id ${docID}), updating locales...`)
      await payload.update({
        collection: 'pages',
        id: docID,
        data: vi,
        req,
        locale: 'vi',
        overrideAccess: false,
        context: { disableRevalidate: true },
      })
      await payload.update({
        collection: 'pages',
        id: docID,
        data: en,
        req,
        locale: 'en',
        overrideAccess: false,
        context: { disableRevalidate: true },
      })
    } else {
      console.log(`Creating page /${slug}...`)
      const created = await payload.create({
        collection: 'pages',
        data: vi,
        req,
        locale: 'vi',
        draft: false,
        overrideAccess: false,
        depth: 0,
        context: { disableRevalidate: true },
      })
      docID = created.id as number
      await payload.update({
        collection: 'pages',
        id: docID,
        data: en,
        req,
        locale: 'en',
        draft: false,
        overrideAccess: false,
        context: { disableRevalidate: true },
      })
    }

    // Verify both locales have publication approved and contentApproval marker
    const verified = await payload.findByID({
      collection: 'pages',
      id: docID,
      depth: 0,
      locale: 'all',
      fallbackLocale: false,
      req,
    })

    assert.equal(verified.site, site.id)
    assert.equal(verified.pathname, `/${slug}`)
    for (const locale of ['vi', 'en'] as const) {
      assert.equal(verified.wingsGroupRoute?.publication?.[locale], 'approved')
      assert.equal(
        verified.wingsGroupRoute?.contentApproval?.[locale],
        WINGSGROUP_CONTENT_VALIDATION_MARKER,
      )
    }

    results.push({ key: item.key, id: docID, pathname: `/${slug}`, status: verified._status })
  }

  writeFileSync(
    path.join(__dirname, '..', 'created-pages.json'),
    JSON.stringify({ at: new Date().toISOString(), results }, null, 2),
  )
  console.log('Successfully created/verified 4 introduction pages:', results)
} finally {
  await payload.destroy()
}
