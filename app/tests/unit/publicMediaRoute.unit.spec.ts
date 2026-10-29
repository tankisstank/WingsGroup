import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

let tempDir: string
let testMp4File: string
let testEmptyFile: string
const testPayloadBytes = Buffer.from('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+~`|}{[]:;?><,./-=1234567890abcdef') // 110 bytes

const mockGoSite = {
  id: 1,
  code: 'wings-go',
  primaryDomain: 'wingsgo.vn',
  additionalDomains: [],
  isActive: true,
}

const mockGroupSite = {
  id: 2,
  code: 'wings-group',
  primaryDomain: 'wingsgroup.vn',
  additionalDomains: [],
  isActive: true,
}

const mockGoMedia = {
  id: 101,
  filename: 'test-video.mp4',
  site: 1,
  mimeType: 'video/mp4',
  updatedAt: '2026-10-24T00:00:00.000Z',
}

const mockGoEmptyMedia = {
  id: 103,
  filename: 'empty.mp4',
  site: 1,
  mimeType: 'video/mp4',
  updatedAt: '2026-10-24T00:00:00.000Z',
}

const mockGroupPendingMedia = {
  id: 102,
  filename: 'pending.png',
  site: 2,
  governance: {
    managedBy: 'wingsgroup-v3',
    publicationState: 'pending',
  },
}

interface MockWhereClause {
  site?: { equals?: number }
  or?: Array<{ filename?: { equals?: string } }>
  [key: string]: unknown
}

interface MockWhereQuery {
  and?: MockWhereClause[]
  [key: string]: unknown
}

const mockPayloadInstance = {
  config: {
    collections: [
      {
        slug: 'media',
        upload: {
          staticDir: '', // will be set in beforeAll
        },
      },
    ],
  },
  find: vi.fn(async ({ collection, where }: { collection: string; where?: MockWhereQuery }) => {
    if (collection === 'sites') {
      return { docs: [mockGoSite, mockGroupSite] }
    }
    if (collection === 'media') {
      const siteCondition = where?.and?.find((clause: MockWhereClause) => clause.site)
      const siteId = siteCondition?.site?.equals
      const filenameConditions = where?.and?.find((clause: MockWhereClause) => clause.or)?.or || []
      const searchedFilenames = filenameConditions.map((c: { filename?: { equals?: string } }) => c.filename?.equals).filter(Boolean)

      if (searchedFilenames.includes('test-video.mp4') && siteId === 1) {
        return { docs: [mockGoMedia] }
      }
      if (searchedFilenames.includes('empty.mp4') && siteId === 1) {
        return { docs: [mockGoEmptyMedia] }
      }
      if (searchedFilenames.includes('pending.png') && siteId === 2) {
        return { docs: [mockGroupPendingMedia] }
      }
      return { docs: [] }
    }
    return { docs: [] }
  }),
}

vi.mock('@payload-config', () => ({
  default: {},
}))

vi.mock('payload', () => ({
  getPayload: vi.fn(async () => mockPayloadInstance),
}))

// Import route dynamically after mocks are set
import { GET, HEAD } from '@/app/(payload)/api/public-media/[filename]/route'

describe('public media route handler GET & HEAD (RFC 9110 & Authorization)', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'public-media-test-'))
    testMp4File = path.join(tempDir, 'test-video.mp4')
    testEmptyFile = path.join(tempDir, 'empty.mp4')
    await writeFile(testMp4File, testPayloadBytes)
    await writeFile(testEmptyFile, Buffer.alloc(0))
    mockPayloadInstance.config.collections[0].upload.staticDir = tempDir
  })

  afterAll(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('rejects unsafe filenames with 404 and no-store without leaking range', async () => {
    const request = new Request('https://wingsgo.vn/api/public-media/../secret.env', {
      headers: { host: 'wingsgo.vn' },
    })
    const response = await GET(request, { params: Promise.resolve({ filename: '../secret.env' }) })

    expect(response.status).toBe(404)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Content-Range')).toBeNull()
  })

  it('rejects unauthenticated/unmatched sites with 403 and no-store', async () => {
    const request = new Request('https://unknown-domain.invalid/api/public-media/test-video.mp4', {
      headers: { host: 'unknown-domain.invalid' },
    })
    const response = await GET(request, { params: Promise.resolve({ filename: 'test-video.mp4' }) })

    expect(response.status).toBe(403)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Content-Range')).toBeNull()
  })

  it('blocks Group pending media under governance with 403 and no-store', async () => {
    const request = new Request('https://wingsgroup.vn/api/public-media/pending.png', {
      headers: { host: 'wingsgroup.vn' },
    })
    const response = await GET(request, { params: Promise.resolve({ filename: 'pending.png' }) })

    expect(response.status).toBe(403)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Content-Range')).toBeNull()
  })

  it('serves full video with 200 OK and Accept-Ranges when no Range header is supplied', async () => {
    const request = new Request('https://wingsgo.vn/api/public-media/test-video.mp4', {
      headers: { host: 'wingsgo.vn' },
    })
    const response = await GET(request, { params: Promise.resolve({ filename: 'test-video.mp4' }) })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('video/mp4')
    expect(response.headers.get('Accept-Ranges')).toBe('bytes')
    expect(response.headers.get('Content-Length')).toBe(String(testPayloadBytes.length))
    expect(response.headers.get('Cache-Control')).toBe('no-store')

    const arrayBuffer = await response.arrayBuffer()
    expect(Buffer.from(arrayBuffer)).toEqual(testPayloadBytes)
  })

  it('handles HEAD request returning 200 OK headers with null body', async () => {
    const request = new Request('https://wingsgo.vn/api/public-media/test-video.mp4', {
      method: 'HEAD',
      headers: { host: 'wingsgo.vn' },
    })
    const response = await HEAD(request, { params: Promise.resolve({ filename: 'test-video.mp4' }) })

    expect(response.status).toBe(200)
    expect(response.headers.get('Accept-Ranges')).toBe('bytes')
    expect(response.headers.get('Content-Length')).toBe(String(testPayloadBytes.length))
    expect(response.headers.get('Content-Type')).toBe('video/mp4')
    expect(response.body).toBeNull()
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('ignores Range header and serves full 200 OK representation when If-Range is present', async () => {
    const request = new Request('https://wingsgo.vn/api/public-media/test-video.mp4', {
      headers: {
        host: 'wingsgo.vn',
        range: 'bytes=0-9',
        'if-range': '"unmatched-etag-or-date"',
      },
    })
    const response = await GET(request, { params: Promise.resolve({ filename: 'test-video.mp4' }) })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Range')).toBeNull()
    expect(response.headers.get('Content-Length')).toBe(String(testPayloadBytes.length))

    const arrayBuffer = await response.arrayBuffer()
    expect(Buffer.from(arrayBuffer)).toEqual(testPayloadBytes)
  })

  it('serves empty file with 200 OK and length 0', async () => {
    const request = new Request('https://wingsgo.vn/api/public-media/empty.mp4', {
      headers: { host: 'wingsgo.vn' },
    })
    const response = await GET(request, { params: Promise.resolve({ filename: 'empty.mp4' }) })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Length')).toBe('0')
    const arrayBuffer = await response.arrayBuffer()
    expect(Buffer.from(arrayBuffer).length).toBe(0)
  })

  it('serves partial content 206 for valid closed byte range and asserts exact body bytes', async () => {
    const request = new Request('https://wingsgo.vn/api/public-media/test-video.mp4', {
      headers: {
        host: 'wingsgo.vn',
        range: 'bytes=0-9',
      },
    })
    const response = await GET(request, { params: Promise.resolve({ filename: 'test-video.mp4' }) })

    expect(response.status).toBe(206)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Content-Range')).toBe(`bytes 0-9/${testPayloadBytes.length}`)
    expect(response.headers.get('Content-Length')).toBe('10')
    expect(response.headers.get('Content-Type')).toBe('video/mp4')

    const arrayBuffer = await response.arrayBuffer()
    const sliceBuffer = Buffer.from(arrayBuffer)
    expect(sliceBuffer).toEqual(testPayloadBytes.subarray(0, 10))
    expect(sliceBuffer.length).toBe(10)
  })

  it('serves partial content 206 for open-ended byte range', async () => {
    const request = new Request('https://wingsgo.vn/api/public-media/test-video.mp4', {
      headers: {
        host: 'wingsgo.vn',
        range: 'bytes=50-',
      },
    })
    const response = await GET(request, { params: Promise.resolve({ filename: 'test-video.mp4' }) })

    expect(response.status).toBe(206)
    const expectedLength = testPayloadBytes.length - 50
    expect(response.headers.get('Content-Range')).toBe(`bytes 50-${testPayloadBytes.length - 1}/${testPayloadBytes.length}`)
    expect(response.headers.get('Content-Length')).toBe(String(expectedLength))

    const arrayBuffer = await response.arrayBuffer()
    expect(Buffer.from(arrayBuffer)).toEqual(testPayloadBytes.subarray(50))
  })

  it('serves partial content 206 for suffix byte range', async () => {
    const request = new Request('https://wingsgo.vn/api/public-media/test-video.mp4', {
      headers: {
        host: 'wingsgo.vn',
        range: 'bytes=-20',
      },
    })
    const response = await GET(request, { params: Promise.resolve({ filename: 'test-video.mp4' }) })

    expect(response.status).toBe(206)
    const start = testPayloadBytes.length - 20
    expect(response.headers.get('Content-Range')).toBe(`bytes ${start}-${testPayloadBytes.length - 1}/${testPayloadBytes.length}`)
    expect(response.headers.get('Content-Length')).toBe('20')

    const arrayBuffer = await response.arrayBuffer()
    expect(Buffer.from(arrayBuffer)).toEqual(testPayloadBytes.subarray(start))
  })

  it('returns 416 Range Not Satisfiable when start is out of bounds', async () => {
    const request = new Request('https://wingsgo.vn/api/public-media/test-video.mp4', {
      headers: {
        host: 'wingsgo.vn',
        range: 'bytes=500-600',
      },
    })
    const response = await GET(request, { params: Promise.resolve({ filename: 'test-video.mp4' }) })

    expect(response.status).toBe(416)
    expect(response.headers.get('Content-Range')).toBe(`bytes */${testPayloadBytes.length}`)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('ignores multipart range headers and serves 200 OK full file', async () => {
    const request = new Request('https://wingsgo.vn/api/public-media/test-video.mp4', {
      headers: {
        host: 'wingsgo.vn',
        range: 'bytes=0-10, 20-30',
      },
    })
    const response = await GET(request, { params: Promise.resolve({ filename: 'test-video.mp4' }) })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Length')).toBe(String(testPayloadBytes.length))
  })
})
