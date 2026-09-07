import path from 'node:path'
import { rm } from 'node:fs/promises'

import config from '@/payload.config'
import { wingsGroupMediaReadAccess } from '@/access/siteScope'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createLocalReq, getPayload, type File, type Payload, type PayloadRequest } from 'payload'

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

describe('Payload Media access tenant isolation', () => {
  let payload: Payload
  let adminReq: PayloadRequest
  let managerReq: PayloadRequest
  let siteAID: number
  let siteBID: number
  let managerID: number
  let mediaAID: number
  let mediaBID: number
  const uploadFiles = new Set<string>()
  const suffix = `${process.pid}-${Date.now()}`

  beforeAll(async () => {
    payload = await getPayload({ config })
    adminReq = await createLocalReq(
      {
        user: {
          id: 0,
          role: 'super-admin',
          sites: [],
        } as never,
      },
      payload,
    )

    const createSite = (code: string, name: string) =>
      payload.create({
        collection: 'sites',
        context: { disableRevalidate: true, seed: true },
        data: {
          code,
          defaultLocale: 'vi',
          isActive: false,
          name,
          primaryDomain: `${code}.invalid`,
          supportedLocales: ['vi'],
        },
        overrideAccess: true,
        req: adminReq,
      })

    const siteA = await createSite(`e09-media-site-a-${suffix}`, `E09 Media Site A ${suffix}`)
    const siteB = await createSite(`e09-media-site-b-${suffix}`, `E09 Media Site B ${suffix}`)
    siteAID = siteA.id
    siteBID = siteB.id

    const createMedia = async (site: number, filename: string) => {
      const file: File = {
        data: png,
        mimetype: 'image/png',
        name: filename,
        size: png.byteLength,
      }
      const media = await payload.create({
        collection: 'media',
        context: { disableRevalidate: true, seed: true },
        data: {
          alt: `E09 tenant isolation ${filename}`,
          site,
        },
        file,
        overrideAccess: true,
        req: adminReq,
      })
      if (typeof media.filename === 'string') uploadFiles.add(media.filename)
      if (media.sizes && typeof media.sizes === 'object') {
        for (const size of Object.values(media.sizes)) {
          if (size && typeof size.filename === 'string') uploadFiles.add(size.filename)
        }
      }
      return media
    }

    const mediaA = await createMedia(siteAID, `e09-media-site-a-${suffix}.png`)
    const mediaB = await createMedia(siteBID, `e09-media-site-b-${suffix}.png`)
    mediaAID = mediaA.id
    mediaBID = mediaB.id

    const manager = await payload.create({
      collection: 'users',
      context: { seed: true },
      data: {
        email: `e09-media-manager-${suffix}@example.invalid`,
        name: `E09 Media Manager ${suffix}`,
        password: 'test',
        role: 'site-manager',
        sites: [siteAID],
      },
      overrideAccess: true,
      req: adminReq,
    })
    managerID = manager.id
    managerReq = await createLocalReq(
      { user: { ...manager, collection: 'users' } as never },
      payload,
    )
  }, 60_000)

  afterAll(async () => {
    if (!payload) return

    try {
      if (mediaAID !== undefined) {
        await payload.delete({
          collection: 'media',
          id: mediaAID,
          overrideAccess: true,
          req: adminReq,
        })
      }
      if (mediaBID !== undefined) {
        await payload.delete({
          collection: 'media',
          id: mediaBID,
          overrideAccess: true,
          req: adminReq,
        })
      }
      if (managerID !== undefined) {
        await payload.delete({
          collection: 'users',
          id: managerID,
          overrideAccess: true,
          req: adminReq,
        })
      }
      if (siteAID !== undefined) {
        await payload.delete({
          collection: 'sites',
          id: siteAID,
          overrideAccess: true,
          req: adminReq,
        })
      }
      if (siteBID !== undefined) {
        await payload.delete({
          collection: 'sites',
          id: siteBID,
          overrideAccess: true,
          req: adminReq,
        })
      }
    } finally {
      for (const filename of uploadFiles) {
        await rm(path.resolve(process.cwd(), 'public', 'media', filename), { force: true })
      }
      await payload.destroy()
    }
  })

  it('excludes the other tenant row from a real authenticated Media query', async () => {
    expect(managerReq.user).toMatchObject({ role: 'site-manager', collection: 'users' })
    expect(await wingsGroupMediaReadAccess({ req: managerReq } as never)).toEqual({
      site: { in: [siteAID] },
    })

    const result = await payload.find({
      collection: 'media',
      depth: 0,
      limit: 10,
      overrideAccess: false,
      pagination: false,
      req: managerReq,
      where: {
        id: {
          in: [mediaAID, mediaBID],
        },
      },
    })

    expect(result.docs.map((media) => media.id)).toEqual([mediaAID])
    expect(result.docs).toHaveLength(1)
    expect(result.docs[0]?.site).toBe(siteAID)
    expect(result.docs.some((media) => media.id === mediaBID)).toBe(false)
  })
})
