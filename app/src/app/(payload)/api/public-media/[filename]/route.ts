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
  parseSingleByteRange,
  publicMediaContentType,
} from '@/utilities/publicMediaDelivery'
import {
  hasValidTrustedSiteContext,
  requestHostCandidates,
} from '@/utilities/siteDomains'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAYLOAD_STANDARD_IMAGE_SIZES = [
  'thumbnail',
  'square',
  'small',
  'medium',
  'large',
  'xlarge',
  'og',
] as const

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
  const isTrustedContext = await hasValidTrustedSiteContext(request.headers)
  const siteCode = isTrustedContext ? request.headers.get('x-site-code') || null : null
  const sites = siteResult.docs
  let site = siteCode ? sites.find((s) => s.code === siteCode) : null

  if (!site) {
    const candidateHosts: string[] = []
    if (isTrustedContext) {
      candidateHosts.push(...requestHostCandidates(request.headers))
    } else {
      const untrustedHost = normalizePublicMediaHost(request.headers.get('host'))
      if (untrustedHost) candidateHosts.push(untrustedHost)
    }
    if (candidateHosts.length === 0) {
      const urlHost = normalizePublicMediaHost(new URL(request.url).host)
      if (urlHost) candidateHosts.push(urlHost)
    }

    site = sites.find((candidate) => {
      const domains = [
        candidate.primaryDomain,
        ...(candidate.additionalDomains || []).map((entry) => entry.domain),
      ].map((d) => normalizePublicMediaHost(d))
      return domains.some((domain) => candidateHosts.includes(domain))
    })

    // Local loopback host fallback (only exact 'localhost' or '127.0.0.1' without foreign domain suffixes)
    const isExactLocalLoopback = candidateHosts.some(
      (h) => h === 'localhost' || h === '127.0.0.1' || h.startsWith('localhost:') || h.startsWith('127.0.0.1:'),
    )
    if (!site && isExactLocalLoopback && process.env.NODE_ENV !== 'production') {
      const filenameConditionsForSearch = [
        { filename: { equals: filename } },
        ...PAYLOAD_STANDARD_IMAGE_SIZES.map((name) => ({
          [`sizes.${name}.filename`]: { equals: filename },
        })),
        ...WINGSGROUP_V3_DERIVATIVE_IMAGE_SIZES.map(({ name }) => ({
          [`sizes.${name}.filename`]: { equals: filename },
        })),
      ]
      const localMediaCheck = await payload.find({
        collection: 'media',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        pagination: false,
        where: { or: filenameConditionsForSearch } satisfies Where,
      })
      if (localMediaCheck.docs[0]?.site) {
        const foundSiteId = localMediaCheck.docs[0].site
        site = sites.find((s) => s.id === foundSiteId) || null
      }
    }
  }

  if (!site) {
    return json('Forbidden.', 403)
  }

  // Keep the query compatible with production Media schemas that do not carry
  // the optional WingsGroup governance field. Derivative filenames are stored
  // in the standard Payload sizes map and cover both governed and tenant media.
  const filenameConditions = [
    { filename: { equals: filename } },
    ...PAYLOAD_STANDARD_IMAGE_SIZES.map((name) => ({
      [`sizes.${name}.filename`]: { equals: filename },
    })),
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

  const governance = (media as { governance?: Record<string, unknown> }).governance
  if (governance && governance.managedBy === 'wingsgroup-v3') {
    const governanceResult = validateWingsGroupV3PublicMedia(
      governance,
      `https://${site.primaryDomain}`,
    )
    if (governanceResult !== true) return json('Forbidden.', 403)
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

    const contentType = publicMediaContentType(filename)
    // shortcut: video replacements lack strong validators; enable caching after immutable version storage is implemented.
    const cacheControl = contentType.startsWith('video/')
      ? 'no-store'
      : 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
    const method = request.method?.toUpperCase() || 'GET'
    const rangeHeader = request.headers.get('range')
    const ifRange = request.headers.get('if-range')

    // RFC 9110:
    // 1. Range is only evaluated for GET requests; non-GET requests ignore Range.
    // 2. When If-Range is present, since entity tags are not currently exposed,
    //    the Range header is ignored and the entire representation is served to prevent stale partial-file assembly.
    const shouldEvaluateRange = method === 'GET' && Boolean(rangeHeader) && !ifRange

    if (shouldEvaluateRange && rangeHeader) {
      const parsedRange = parseSingleByteRange(rangeHeader, fileStats.size)

      if (parsedRange.type === 'unsatisfiable') {
        return new Response(null, {
          status: 416,
          headers: {
            'Cache-Control': 'no-store',
            'Content-Range': `bytes */${fileStats.size}`,
          },
        })
      }

      if (parsedRange.type === 'range') {
        const { start, end } = parsedRange.range
        const chunkLength = end - start + 1
        const stream = createReadStream(filePath, { start, end })

        return new Response(Readable.toWeb(stream) as ReadableStream, {
          status: 206,
          headers: {
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-store',
            'Content-Length': String(chunkLength),
            'Content-Range': `bytes ${start}-${end}/${fileStats.size}`,
            'Content-Type': contentType,
          },
        })
      }
    }

    if (method === 'HEAD') {
      return new Response(null, {
        status: 200,
        headers: {
          'Accept-Ranges': 'bytes',
          'Cache-Control': cacheControl,
          'Content-Length': String(fileStats.size),
          'Content-Type': contentType,
        },
      })
    }

    return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Cache-Control': cacheControl,
        'Content-Length': String(fileStats.size),
        'Content-Type': contentType,
      },
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return json('Not found.', 404)
    throw error
  }
}

export async function HEAD(
  request: Request,
  context: { params: Promise<{ filename: string }> },
): Promise<Response> {
  return GET(request, context)
}
