import { describe, expect, it, vi } from 'vitest'

import {
  normalizeWingsGroupEditorialPreflightOrigin,
  parseWingsGroupEditorialPageMedia,
  runWingsGroupEditorialMediaPreflight,
  WINGSGROUP_EDITORIAL_PREFLIGHT_ROUTES,
} from '../../scripts/lib/wingsGroupEditorialMediaPreflight'
import {
  parseWingsGroupTrustUpdateArgs,
  runWingsGroupTrustArticleUpdate,
  WINGSGROUP_TRUST_UPDATE_CONFIRMATION,
  type WingsGroupTrustUpdaterPayload,
} from '../../scripts/lib/wingsGroupTrustArticleUpdater'
import { getWingsGroupTrustArticleLocalizedUpdate } from '@/utilities/wingsGroupEditorial'

const unsafeContent = {
  root: {
    children: [{ children: [{ text: 'Legacy root-site note' }], type: 'paragraph' }],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
}

const updaterPayload = ({ alreadyCurrent = false } = {}) => {
  const update = vi.fn(async () => ({}))
  const find = vi.fn(async (args: unknown) => {
    const query = args as { collection: string; locale?: 'en' | 'vi' }
    if (query.collection === 'sites') {
      return { docs: [{ code: 'wings-group', id: 9, isActive: true }] }
    }
    const locale = query.locale || 'vi'
    const approved = getWingsGroupTrustArticleLocalizedUpdate(locale)
    return {
      docs: [
        {
          _status: 'published',
          content: alreadyCurrent ? approved.content : unsafeContent,
          id: 41,
          meta: alreadyCurrent
            ? { image: 44, ...approved.meta }
            : { description: 'Legacy description', image: 44 },
          site: 9,
          slug: 'giay-phep-lu-hanh-va-cac-tin-hieu-trust-khi-chon-cong-ty-du-lich',
          title: alreadyCurrent ? approved.title : 'Legacy title',
        },
      ],
    }
  })
  return { find, update } satisfies WingsGroupTrustUpdaterPayload
}

describe('WingsGroup trust article operational updater', () => {
  it('defaults to dry-run and requires the exact confirmation before apply', () => {
    expect(parseWingsGroupTrustUpdateArgs([])).toEqual({ confirm: undefined, mode: 'dry-run' })
    expect(() => parseWingsGroupTrustUpdateArgs(['--apply'])).toThrow(/Apply requires --confirm/)
    expect(
      parseWingsGroupTrustUpdateArgs([
        '--apply',
        '--confirm',
        WINGSGROUP_TRUST_UPDATE_CONFIRMATION,
      ]),
    ).toEqual({ confirm: WINGSGROUP_TRUST_UPDATE_CONFIRMATION, mode: 'apply' })
  })

  it('plans only the published WingsGroup trust post in VI/EN and performs no dry-run writes', async () => {
    const payload = updaterPayload()
    const report = await runWingsGroupTrustArticleUpdate({
      args: { mode: 'dry-run' },
      payload,
    })

    expect(report.plan).toEqual([
      expect.objectContaining({ action: 'update', id: 41, locale: 'vi' }),
      expect.objectContaining({ action: 'update', id: 41, locale: 'en' }),
    ])
    expect(payload.update).not.toHaveBeenCalled()
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'posts',
        locale: 'vi',
        where: {
          and: expect.arrayContaining([
            { site: { equals: 9 } },
            { _status: { equals: 'published' } },
          ]),
        },
      }),
    )
  })

  it('is idempotent and preserves unrelated SEO media when apply is needed', async () => {
    const currentPayload = updaterPayload({ alreadyCurrent: true })
    const current = await runWingsGroupTrustArticleUpdate({
      args: { confirm: WINGSGROUP_TRUST_UPDATE_CONFIRMATION, mode: 'apply' },
      payload: currentPayload,
    })
    expect(current.plan.every(({ action }) => action === 'noop')).toBe(true)
    expect(currentPayload.update).not.toHaveBeenCalled()

    const payload = updaterPayload()
    await runWingsGroupTrustArticleUpdate({
      args: { confirm: WINGSGROUP_TRUST_UPDATE_CONFIRMATION, mode: 'apply' },
      payload,
    })
    expect(payload.update).toHaveBeenCalledTimes(2)
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'posts',
        data: expect.objectContaining({ meta: expect.objectContaining({ image: 44 }) }),
        id: 41,
        locale: 'vi',
      }),
    )
  })
})

describe('WingsGroup editorial anonymous media preflight', () => {
  const html = `<!doctype html><html><head>
    <meta content="/media/editorial-og.webp" property="og:image">
    </head><body><section data-governed-editorial="true">
    <div data-wingsgroup-editorial-media="true"><picture>
      <source srcset="/media/editorial-640.webp 640w, /media/editorial-1200.webp 1200w" type="image/webp">
      <img alt="Editorial" src="/_next/image?url=%2Fmedia%2Feditorial.png&amp;w=1200&amp;q=80">
    </picture></div></section></body></html>`

  it('accepts only a credential-free origin and extracts OG plus rendered editorial candidates', () => {
    expect(WINGSGROUP_EDITORIAL_PREFLIGHT_ROUTES.map(({ path }) => path)).toEqual([
      '/tin-tuc',
      '/en/tin-tuc',
      '/tin-tuc/giay-phep-lu-hanh-va-cac-tin-hieu-trust-khi-chon-cong-ty-du-lich',
      '/en/tin-tuc/giay-phep-lu-hanh-va-cac-tin-hieu-trust-khi-chon-cong-ty-du-lich',
    ])
    expect(normalizeWingsGroupEditorialPreflightOrigin('https://preview.example:8443/')).toBe(
      'https://preview.example:8443',
    )
    expect(() =>
      normalizeWingsGroupEditorialPreflightOrigin('https://user:pass@example.test'),
    ).toThrow(/only scheme, host/)
    expect(parseWingsGroupEditorialPageMedia({ html, origin: 'https://preview.example' })).toEqual({
      editorialImages: [
        'https://preview.example/media/editorial-640.webp',
        'https://preview.example/media/editorial-1200.webp',
        'https://preview.example/_next/image?url=%2Fmedia%2Feditorial.png&w=1200&q=80',
      ],
      ogImages: ['https://preview.example/media/editorial-og.webp'],
    })
  })

  it('anonymously requires HTTP 200 and image content type for every selected URL', async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      expect(init?.headers).toEqual(
        expect.not.objectContaining({ authorization: expect.anything() }),
      )
      expect(init?.headers).toEqual(expect.not.objectContaining({ cookie: expect.anything() }))
      expect(init?.redirect).toBe('manual')
      return url === 'https://preview.example/tin-tuc'
        ? new Response(html, {
            headers: { 'content-type': 'text/html; charset=utf-8' },
            status: 200,
          })
        : new Response('image', { headers: { 'content-type': 'image/webp' }, status: 200 })
    }) as typeof fetch

    const report = await runWingsGroupEditorialMediaPreflight({
      fetchImpl,
      origin: 'https://preview.example',
      routes: [{ kind: 'archive', locale: 'vi', path: '/tin-tuc' }],
    })
    expect(report.routes).toHaveLength(1)
    expect(report.checkedAssets).toHaveLength(4)
    expect(fetchImpl).toHaveBeenCalledTimes(5)
  })

  it('fails closed on a 403 or a non-image asset response', async () => {
    const forbiddenFetch = vi.fn(async (input: string | URL | Request) =>
      String(input).endsWith('/tin-tuc')
        ? new Response(html, { headers: { 'content-type': 'text/html' }, status: 200 })
        : new Response('forbidden', { headers: { 'content-type': 'text/plain' }, status: 403 }),
    ) as typeof fetch
    await expect(
      runWingsGroupEditorialMediaPreflight({
        fetchImpl: forbiddenFetch,
        origin: 'https://preview.example',
        routes: [{ kind: 'archive', locale: 'vi', path: '/tin-tuc' }],
      }),
    ).rejects.toThrow(/expected HTTP 200, got 403/)
  })
})
