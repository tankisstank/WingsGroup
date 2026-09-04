import 'dotenv/config'

import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import { createLocalReq, getPayload } from 'payload'
import sharp from 'sharp'
import { createWingsGroupV3ProductionPublishContext } from '../src/fields/wingsGroupV3'

const confirmation = 'CONFIRM_WINGSGROUP_AI_HERO_WRITE'
const mediaDirectory = '/app/public/media'
const publicationOperationID = 'aihero-20260903-001'
const sha256 = (value: Buffer) => createHash('sha256').update(value).digest('hex')
const arg = (name: string) => {
  const inline = process.argv.find((value) => value.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const main = async () => {
  if (!process.argv.includes('--apply') || arg('--confirm') !== confirmation) {
    throw new Error(`Requires --apply --confirm=${confirmation}`)
  }
  const slug = arg('--slug')
  const filename = arg('--filename')
  const sourcePath = arg('--source-path')
  if (!slug || !filename || !sourcePath || !/^[a-z0-9-]+$/.test(slug) || !/^[a-z0-9][a-z0-9.-]+\.png$/.test(filename)) {
    throw new Error('Requires safe --slug, --filename and --source-path values')
  }
  if (process.env.NODE_ENV !== 'production' || process.env.PAYLOAD_DB_PUSH !== 'false') {
    throw new Error('Requires production with PAYLOAD_DB_PUSH=false')
  }
  if (!/^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL || '')) {
    throw new Error('Requires PostgreSQL DATABASE_URL')
  }

  const source = await fs.readFile(sourcePath)
  const sourceSha = sha256(source)
  const derivatives = await Promise.all(
    [640, 960, 1440].flatMap((width) =>
      (['webp', 'avif'] as const).map(async (format) => {
        const derivativeFilename = filename.replace(/\.png$/, `-${width}.${format}`)
        const data = await sharp(source)
          .resize({ width, withoutEnlargement: true })
          [format]({ quality: format === 'webp' ? 84 : 66 })
          .toBuffer()
        const metadata = await sharp(data).metadata()
        if (!metadata.width || !metadata.height) throw new Error('Derivative dimensions are missing')
        await fs.writeFile(path.join(mediaDirectory, derivativeFilename), data)
        return {
          format,
          width: metadata.width,
          height: metadata.height,
          url: `https://wingsgroup.vn/media/${derivativeFilename}`,
          sha256: sha256(data),
        }
      }),
    ),
  )

  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  const adminEmail = arg('--admin-email')
  if (!adminEmail) throw new Error('Requires --admin-email')
  const admins = await payload.find({ collection: 'users', limit: 2, pagination: false, overrideAccess: true, where: { email: { equals: adminEmail } } })
  if (admins.docs.length !== 1 || admins.docs[0].role !== 'super-admin') throw new Error('Requires a super-admin')
  const req = await createLocalReq({ user: admins.docs[0] as never }, payload)
  const sites = await payload.find({ collection: 'sites', limit: 2, pagination: false, overrideAccess: true, req, where: { code: { equals: 'wings-group' } } })
  if (sites.docs.length !== 1) throw new Error('Expected exactly one wings-group site')
  const site = sites.docs[0]
  const existing = await payload.find({ collection: 'media', limit: 2, pagination: false, overrideAccess: true, req, where: { and: [{ site: { equals: site.id } }, { filename: { equals: filename } }] } })
  const base = {
    site: site.id,
    governance: {
      managedBy: 'wingsgroup-v3', sourceAttachmentId: `ai-imagegen-${slug}-20260903`, sourceArchiveSha256: sourceSha,
      sourceFileSha256: sourceSha, sourceFilename: filename, sourceIdentity: `ai-imagegen-${slug}-20260903:${sourceSha}`,
      provenanceReference: 'OpenAI Image Generation workflow, 2026-09-03; editorial illustration, not documentary evidence.',
      rightsState: 'approved', rightsEvidence: 'Generated under an authorized WingsGroup editorial image workflow.', usageScope: 'editorial-service',
      publicationState: 'ready', derivativeState: 'verified', responsiveDerivatives: derivatives,
    },
  }
  const media = existing.docs[0] || await payload.create({ collection: 'media', locale: 'vi', overrideAccess: true, req, context: { disableRevalidate: true, seed: true }, data: { ...base, alt: 'Chuyên viên tư vấn cùng khách hàng chuẩn bị hành trình trên bản đồ' } as never, file: { data: source, mimetype: 'image/png', name: filename, size: source.byteLength } })
  await payload.update({ collection: 'media', id: media.id, locale: 'en', overrideAccess: true, req, context: { disableRevalidate: true, seed: true }, data: { ...base, alt: 'Travel specialist consulting with guests over a journey map' } as never })
  await payload.update({ collection: 'media', id: media.id, locale: 'vi', overrideAccess: true, req, context: { disableRevalidate: true, seed: true }, data: { ...base, alt: 'Chuyên viên tư vấn cùng khách hàng chuẩn bị hành trình trên bản đồ' } as never })
  await payload.update({ collection: 'media', id: media.id, locale: 'vi', overrideAccess: true, req, context: { ...createWingsGroupV3ProductionPublishContext(publicationOperationID), disableRevalidate: true, seed: true }, data: { governance: { ...base.governance, publicationState: 'published' } } as never })
  const posts = await payload.find({ collection: 'posts', limit: 2, pagination: false, overrideAccess: true, req, where: { and: [{ site: { equals: site.id } }, { slug: { equals: slug } }] } })
  if (posts.docs.length !== 1) throw new Error('Expected exactly one target post')
  await payload.update({ collection: 'posts', id: posts.docs[0].id, overrideAccess: true, req, context: { disableRevalidate: true }, data: { heroImage: media.id, meta: { image: media.id } } as never })
  console.log(JSON.stringify({ mediaID: media.id, postID: posts.docs[0].id, status: 'published', filename }))
}

main().catch((error) => { console.error(error); process.exit(1) })
