import { createReadStream } from 'node:fs'
import { access, stat } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'

import config from '@payload-config'
import { getPayload, type Where } from 'payload'

import { validateWingsGroupV3PublicMedia, WINGSGROUP_V3_DERIVATIVE_IMAGE_SIZES } from '@/fields/wingsGroupV3'
import {
  isSafePublicMediaFilename,
  normalizePublicMediaHost,
  publicMediaContentType,
} from '@/utilities/publicMediaDelivery'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const json = (message: string, status: number): Response =>
  Response.json(
    { errors: [{ message }] },
    { headers: { 'Cache-Control': 'no-store' }, status },
  )

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> },
): Promise<Response> {
  const { filename } = await params
  if (!isSafePublicMediaFilename(filename)) return json('Not found.', 404)

  const payload = await getPayload({ config })
  const siteResult = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    pagination: false,
    where: { isActive: { equals: true } },
  })
  const requestHost = request.headers.get('host') || new URL(request.url).host
  const normalizedHost = normalizePublicMediaHost(requestHost)
  const site = siteResult.docs.find((candidate) => {
    const domains = [candidate.primaryDomain, ...(candidate.additionalDomains || []).map((entry) => entry.domain)]
    return domains.some((domain) => normalizePublicMediaHost(domain) === normalizedHost)
  })
  if (!site) {
    return json('Forbidden.', 403)
  }

  // Keep the query compatible with production Media schemas that do not carry
  // the optional WingsGroup governance field. Derivative filenames are stored
  // in the standard Payload sizes map and cover both governed and tenant media.
  const filenameConditions = [
    { filename: { equals: filename } },
    ...WINGSGROUP_V3_DERIVATIVE_IMAGE_SIZES.map(({ name }) => ({
      [`sizes.${name}.filename`]: { equals: filename },
    })),
  ]
  const mediaResult = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      and: [
        { site: { equals: site.id } },
        { or: filenameConditions },
      ],
    } satisfies Where,
  })
  const media = mediaResult.docs[0]
  if (!media) return json('Not found.', 404)

  if (site.code === 'wings-group') {
    const governance = (media as { governance?: unknown }).governance
    if (governance !== undefined) {
      const governanceResult = validateWingsGroupV3PublicMedia(
        governance,
        `https://${site.primaryDomain}`,
      )
      if (governanceResult !== true) return json('Forbidden.', 403)
    }
  }

  const mediaCollection = payload.config.collections.find(({ slug }) => slug === 'media')
  const staticDir = mediaCollection?.upload
    ? mediaCollection.upload.staticDir
    : undefined
  if (typeof staticDir !== 'string' || !staticDir) return json('Not found.', 404)

  const root = path.resolve(staticDir)
  const filePath = path.resolve(root, filename)
  if (!filePath.startsWith(`${root}${path.sep}`)) return json('Not found.', 404)

  try {
    await access(filePath)
    const fileStats = await stat(filePath)
    if (!fileStats.isFile()) return json('Not found.', 404)

    return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, {
      headers: {
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
        'Content-Length': String(fileStats.size),
        'Content-Type': publicMediaContentType(filename),
      },
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return json('Not found.', 404)
    throw error
  }
}
