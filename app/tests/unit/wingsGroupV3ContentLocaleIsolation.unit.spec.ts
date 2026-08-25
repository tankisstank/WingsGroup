import { describe, expect, it } from 'vitest'

import {
  applyWingsGroupV3Content,
  buildWingsGroupV3ContentContract,
} from '../../scripts/import-wingsgroup-v3-content'

const collectMediaNames = (value: unknown, result = new Set<string>()): Set<string> => {
  if (Array.isArray(value)) value.forEach((item) => collectMediaNames(item, result))
  else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectMediaNames(item, result))
  } else if (typeof value === 'string' && value.endsWith('.png')) {
    result.add(value)
  }
  return result
}

describe('WingsGroup content locale request isolation', () => {
  it('writes each route locale with an isolated request and exact locale value', async () => {
    const contract = buildWingsGroupV3ContentContract()
    for (const pathname of ['/he-sinh-thai', '/lien-he']) {
      const route = contract.pages.find((candidate) => candidate.path === pathname)
      if (route) (route.locales.en as unknown as Record<string, unknown>).hero = undefined
    }
    const mediaIDs = new Map(
      [...collectMediaNames(contract)].map((name, index) => [name, index + 100]),
    )
    const pageWrites: Array<Record<string, unknown>> = []
    const settingsWrites: Array<Record<string, unknown>> = []
    const payload = {
      create: async (args: Record<string, unknown>) => {
        if (args.collection === 'pages') pageWrites.push(args)
        return { ...(args.data as Record<string, unknown>), id: 77 }
      },
      update: async (args: Record<string, unknown>) => {
        if (args.collection === 'pages') pageWrites.push(args)
        if (args.collection === 'site-settings') settingsWrites.push(args)
        return { ...(args.data as Record<string, unknown>), id: args.id }
      },
    }

    await applyWingsGroupV3Content({
      contract,
      inventory: {
        form: undefined,
        mediaIDs,
        pages: { en: new Map(), vi: new Map() },
        settings: { ...contract.settings, id: 11 },
        site: { code: 'wings-group', id: 1 },
      },
      payload: payload as never,
      req: { payload, locale: 'vi', payloadDataLoader: { stale: true } } as never,
    })

    expect(pageWrites).toHaveLength(20)
    expect(pageWrites.slice(0, 2).map((write) => write.locale)).toEqual(['vi', 'en'])
    expect(
      pageWrites.every(
        (write) =>
          (write.req as Record<string, unknown>).locale === write.locale &&
          (write.req as Record<string, unknown>).fallbackLocale === false &&
          (write.req as Record<string, unknown>).payloadDataLoader === undefined,
      ),
    ).toBe(true)
    expect(pageWrites[0].data).toMatchObject({ pathname: '/', _status: 'published' })
    expect(pageWrites[1].data).toMatchObject({ pathname: '/', _status: 'published' })
    expect(
      pageWrites.find(
        (write) =>
          write.locale === 'en' &&
          (write.data as Record<string, unknown>).pathname === '/he-sinh-thai',
      )?.data,
    ).toMatchObject({
      hero: {
        behaviorOverrides: {
          autoplay: null,
          intervalMs: null,
          loop: null,
          pauseOnHover: null,
          showArrows: null,
          showDots: null,
          transition: null,
          transitionMs: null,
        },
        links: [],
        media: null,
        presentation: null,
        presentationMode: null,
        presentationPreset: null,
        richText: null,
        slides: [],
        supportingMedia: [],
        type: 'none',
        variant: null,
        video: { desktopVideo: null, mobileVideo: null, poster: null },
      },
    })
    expect(
      pageWrites.find(
        (write) => (write.data as Record<string, unknown>).pathname === '/ve-wingsgroup',
      )?.data,
    ).toMatchObject({
      meta: { breadcrumbLabel: null, description: null, image: null, title: null },
    })
    expect(settingsWrites).toHaveLength(2)
    expect(settingsWrites.map((write) => write.locale)).toEqual(['vi', 'en'])
    expect(
      settingsWrites.every(
        (write) => (write.req as Record<string, unknown>).locale === write.locale,
      ),
    ).toBe(true)
    expect(
      settingsWrites.every(
        (write) => (write.req as Record<string, unknown>).payloadDataLoader === undefined,
      ),
    ).toBe(true)
  })
})
