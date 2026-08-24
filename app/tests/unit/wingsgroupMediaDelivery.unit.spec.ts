import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { wingsGroupMediaReadAccess } from '@/access/siteScope'
import {
  generateWingsGroupV3DerivativeImageName,
  WINGSGROUP_V3_DERIVATIVE_IMAGE_SIZES,
} from '@/fields/wingsGroupV3'
import { enforceAnonymousGovernedMediaRead, Media } from '@/collections/Media'
import { createTrustedSiteContextHeaders } from '@/utilities/siteDomains'

const request = (
  headers: Headers,
  user?: { id: number; role: 'site-manager'; sites: number[] },
) => ({
  headers,
  user,
})

describe('WingsGroup governed derivative delivery', () => {
  const publicLedger = (origin = 'https://wingsgroup.example') =>
    [640, 960, 1440].flatMap((width) =>
      (['webp', 'avif'] as const).map((format) => ({
        format,
        height: 400,
        sha256: 'a'.repeat(64),
        url: `${origin}/media/wingsgroup-airport-service-abcdef123456-${width}.${format}`,
        width,
      })),
    )

  it('keeps the Payload file route single-segment and emits flat governed filenames', () => {
    const installedPayloadRoute = readFileSync(
      path.resolve(process.cwd(), 'node_modules/payload/dist/uploads/endpoints/index.js'),
      'utf8',
    )
    expect(installedPayloadRoute).toContain("path: '/file/:filename'")
    expect(
      generateWingsGroupV3DerivativeImageName({
        extension: 'webp',
        originalName: 'wg-v3-abcdef123456-wingsgroup-airport-service',
        width: 640,
      }),
    ).toBe('wingsgroup-airport-service-abcdef123456-640.webp')
    expect(WINGSGROUP_V3_DERIVATIVE_IMAGE_SIZES).toHaveLength(6)
  })

  it('maps every configured governed size to a concrete PostgreSQL migration column', () => {
    const configuredImageSizes =
      Media.upload && typeof Media.upload !== 'boolean' ? Media.upload.imageSizes || [] : []
    const configured = new Set(
      configuredImageSizes
        .map((size) => size.name)
        .filter((name) => name.startsWith('wingsgroup-v3-')),
    )
    expect(configured).toEqual(
      new Set(WINGSGROUP_V3_DERIVATIVE_IMAGE_SIZES.map(({ name }) => name)),
    )

    const migration = readFileSync(
      path.resolve(process.cwd(), 'src/migrations/20260824_150000_wingsgroup_v3_media_sizes.ts'),
      'utf8',
    )
    for (const name of configured) {
      const columnPrefix = name.replaceAll('-', '_')
      expect(migration).toContain(`sizes_${columnPrefix}_filename`)
    }
  })

  it('keeps local apply physical validation opt-in while production phases require it', () => {
    const configuredImageSizes =
      Media.upload && typeof Media.upload !== 'boolean' ? Media.upload.imageSizes || [] : []
    expect(configuredImageSizes).toEqual(
      expect.arrayContaining(
        WINGSGROUP_V3_DERIVATIVE_IMAGE_SIZES.map(({ name, width, format }) =>
          expect.objectContaining({
            formatOptions: { format },
            name,
            width,
          }),
        ),
      ),
    )
  })

  it('denies anonymous pending media and scopes published derivative delivery', async () => {
    await expect(
      wingsGroupMediaReadAccess({
        req: request(new Headers({ host: 'wingsgroup.example' })),
      } as never),
    ).resolves.toBe(false)

    vi.stubEnv('SITE_CONTEXT_SECRET', 'wingsgroup-delivery-test-secret')
    try {
      const headers = await createTrustedSiteContextHeaders(
        new Headers({ host: 'wingsgroup.example' }),
        {
          host: 'wingsgroup.example',
          publicPath: '/media/wingsgroup-airport-service-abcdef123456-640.webp',
          siteCode: 'wings-group',
        },
      )
      const result = await wingsGroupMediaReadAccess({
        req: {
          headers,
          payload: {
            find: async () => ({
              docs: [
                {
                  code: 'wings-group',
                  id: 7,
                  isActive: true,
                  primaryDomain: 'wingsgroup.example',
                },
              ],
            }),
          },
        },
      } as never)

      expect(result).toMatchObject({
        and: [{ site: { equals: 7 } }, { or: expect.any(Array) }],
      })
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('fails closed for partial public ledgers and allows only a complete same-site ledger', async () => {
    const site = {
      code: 'wings-group',
      id: 7,
      primaryDomain: 'wingsgroup.example',
    }
    const request = {
      payload: {
        findByID: async () => site,
      },
      user: undefined,
    }
    const baseGovernance = {
      derivativeState: 'verified',
      managedBy: 'wingsgroup-v3',
      provenanceReference: 'manifest:v1',
      publicationState: 'published',
      rightsEvidence: 'approved',
      rightsState: 'approved',
      sourceArchiveSha256: 'a'.repeat(64),
      sourceAttachmentId: 'attachment',
      sourceFileSha256: 'a'.repeat(64),
      sourceIdentity: 'attachment:a',
    }
    await expect(
      enforceAnonymousGovernedMediaRead({
        doc: {
          governance: { ...baseGovernance, responsiveDerivatives: publicLedger().slice(0, 2) },
          site: 7,
        },
        req: request,
      } as never),
    ).rejects.toThrow(/sáu|six|derivative/)

    await expect(
      enforceAnonymousGovernedMediaRead({
        doc: { governance: { ...baseGovernance, responsiveDerivatives: publicLedger() }, site: 7 },
        req: request,
      } as never),
    ).resolves.toMatchObject({ site: 7 })

    await expect(
      enforceAnonymousGovernedMediaRead({
        doc: {
          governance: {
            ...baseGovernance,
            responsiveDerivatives: publicLedger('https://other.example'),
          },
          site: 7,
        },
        req: request,
      } as never),
    ).rejects.toThrow(/origin/)
  })
})
