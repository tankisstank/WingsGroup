import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  hasExplicitWingsGroupLocalDraftPreviewSignal,
  hasWingsGroupLocalPreviewGrant,
  isExplicitWingsGroupLocalDraftPreviewRequest,
  LOCAL_PREVIEW_GRANT_TTL_SECONDS,
  mintWingsGroupLocalPreviewGrant,
  WINGSGROUP_LOCAL_PREVIEW_GRANT_COOKIE,
} from '@/wingsgroup/localPreview'

const previewCookie = (grant: string, draftCookie = 'next-draft-token'): string =>
  `${WINGSGROUP_LOCAL_PREVIEW_GRANT_COOKIE}=${grant}; __prerender_bypass=${draftCookie}`

const previewHeaders = ({
  cookie,
  locale = 'vi',
  siteCode = 'wings-group',
  userIP = '127.0.0.1',
}: {
  cookie: string
  locale?: string
  siteCode?: string
  userIP?: string
}) =>
  new Headers({
    cookie,
    host: 'localhost:4175',
    'x-client-ip': userIP,
    'x-locale': locale,
    'x-site-code': siteCode,
    'x-site-context-source': 'proxy',
    'x-site-host': 'localhost',
  })

describe('server-verifiable local preview grant', () => {
  beforeEach(() => {
    vi.stubEnv('LOCAL_PREVIEW_GRANT_SECRET', 'local-preview-test-secret')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('accepts a genuine grant only for its authenticated user, site, locale, and draft cookie', async () => {
    const grant = await mintWingsGroupLocalPreviewGrant({
      draftCookie: 'next-draft-token',
      locale: 'vi',
      siteCode: 'wings-group',
      userID: 77,
    })
    const headers = previewHeaders({ cookie: previewCookie(grant!) })

    expect(
      await hasExplicitWingsGroupLocalDraftPreviewSignal({
        headers,
        locale: 'vi',
        siteCode: 'wings-group',
        userID: 77,
      }),
    ).toBe(true)
    expect(
      await isExplicitWingsGroupLocalDraftPreviewRequest({
        headers,
        locale: 'vi',
        siteCode: 'wings-group',
        user: { id: 77 },
      }),
    ).toBe(true)
    expect(
      await hasWingsGroupLocalPreviewGrant({
        headers: new Headers({
          cookie: previewCookie(grant!),
          host: 'localhost:4175',
        }),
        host: 'localhost',
        locale: 'vi',
        siteCode: 'wings-group',
      }),
    ).toBe(true)
  })

  it('rejects missing, arbitrary, tampered, expired, mismatched, and replayed-across-boundary grants', async () => {
    const grant = await mintWingsGroupLocalPreviewGrant({
      draftCookie: 'next-draft-token',
      locale: 'vi',
      siteCode: 'wings-group',
      userID: 77,
    })
    const valid = previewHeaders({ cookie: previewCookie(grant!) })

    expect(
      await hasExplicitWingsGroupLocalDraftPreviewSignal({
        headers: previewHeaders({ cookie: '__prerender_bypass=next-draft-token' }),
      }),
    ).toBe(false)
    expect(
      await hasExplicitWingsGroupLocalDraftPreviewSignal({
        headers: previewHeaders({
          cookie: previewCookie(grant!.replace(/^v1\./u, 'v1.x.')),
        }),
      }),
    ).toBe(false)
    expect(
      await hasExplicitWingsGroupLocalDraftPreviewSignal({
        headers: previewHeaders({ cookie: previewCookie(grant!, 'forged-next-cookie') }),
      }),
    ).toBe(false)
    expect(
      await hasExplicitWingsGroupLocalDraftPreviewSignal({
        headers: previewHeaders({ cookie: previewCookie(grant!), siteCode: 'wings-go' }),
      }),
    ).toBe(false)
    expect(
      await hasExplicitWingsGroupLocalDraftPreviewSignal({
        headers: previewHeaders({ cookie: previewCookie(grant!), locale: 'en' }),
      }),
    ).toBe(false)
    expect(
      await isExplicitWingsGroupLocalDraftPreviewRequest({
        headers: valid,
        locale: 'vi',
        siteCode: 'wings-group',
        user: { id: 78 },
      }),
    ).toBe(false)

    vi.useFakeTimers()
    const createdAt = new Date('2026-08-21T00:00:00.000Z')
    vi.setSystemTime(createdAt)
    const expiringGrant = await mintWingsGroupLocalPreviewGrant({
      draftCookie: 'expiring-next-cookie',
      locale: 'vi',
      siteCode: 'wings-group',
      userID: 77,
    })
    vi.advanceTimersByTime((LOCAL_PREVIEW_GRANT_TTL_SECONDS + 1) * 1000)
    expect(
      await hasExplicitWingsGroupLocalDraftPreviewSignal({
        headers: previewHeaders({ cookie: previewCookie(expiringGrant!, 'expiring-next-cookie') }),
      }),
    ).toBe(false)
  })

  it('rejects forged proxy context and every preview combination in production', async () => {
    const grant = await mintWingsGroupLocalPreviewGrant({
      draftCookie: 'next-draft-token',
      locale: 'vi',
      siteCode: 'wings-group',
      userID: 77,
    })
    const forgedHeaders = previewHeaders({
      cookie: previewCookie(grant!),
      userIP: '198.51.100.10',
    })

    expect(
      await hasExplicitWingsGroupLocalDraftPreviewSignal({
        headers: forgedHeaders,
        locale: 'vi',
        siteCode: 'wings-group',
        userID: 77,
      }),
    ).toBe(false)

    vi.stubEnv('NODE_ENV', 'production')
    expect(
      await hasExplicitWingsGroupLocalDraftPreviewSignal({
        headers: previewHeaders({ cookie: previewCookie(grant!) }),
        locale: 'vi',
        siteCode: 'wings-group',
        userID: 77,
      }),
    ).toBe(false)
    expect(
      await mintWingsGroupLocalPreviewGrant({
        draftCookie: 'next-draft-token',
        locale: 'vi',
        siteCode: 'wings-group',
        userID: 77,
      }),
    ).toBeNull()
  })
})
