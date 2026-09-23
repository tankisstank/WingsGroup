import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchAllPages, getUsageSummary } from '@/components/ThemeManager'

describe('Theme Manager impact calculation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads every page before reporting theme impact', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const page = Number(new URL(String(input), 'http://admin.local').searchParams.get('page'))
      const docs = Array.from({ length: page === 1 ? 100 : 1 }, (_, index) => ({
        id: page === 1 ? index + 1 : 101,
      }))

      return new Response(
        JSON.stringify({
          docs,
          hasNextPage: page === 1,
          nextPage: page === 1 ? 2 : null,
        }),
        { status: 200 },
      )
    })

    const result = await fetchAllPages<{ id: number }>('/api/pages?where[site][equals]=1')

    expect(result).toEqual({
      data: expect.arrayContaining([expect.objectContaining({ id: 101 })]),
      state: 'ready',
    })
    expect(result.state === 'ready' ? result.data : []).toHaveLength(101)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not turn a later-page failure into a false zero-impact result', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const page = Number(new URL(String(input), 'http://admin.local').searchParams.get('page'))
      return page === 1
        ? new Response(JSON.stringify({ docs: [{ id: 1 }], hasNextPage: true, nextPage: 2 }), {
            status: 200,
          })
        : new Response('unavailable', { status: 503 })
    })

    const result = await fetchAllPages<{ id: number }>('/api/pages?where[site][equals]=1')

    expect(result.state).toBe('error')
    expect(result).toMatchObject({
      message: 'Không tải được dữ liệu (HTTP 503).',
    })
  })

  it('separates all-page theme scope from the high-impact hero subset', () => {
    const pages = Array.from({ length: 101 }, (_, index) => ({
      id: index + 1,
      pathname: `/page-${index + 1}`,
      title: `Page ${index + 1}`,
      hero:
        index < 6
          ? { presentationMode: index < 4 ? ('inherit' as const) : ('override' as const), type: 'highImpact' }
          : null,
    }))

    const summary = getUsageSummary(pages)

    expect(summary.totalPages).toBe(101)
    expect(summary.themeAffectedPages).toHaveLength(5)
    expect(summary.totalHighImpactPages).toBe(6)
    expect(summary.inheritCount).toBe(4)
    expect(summary.overrideCount).toBe(2)
    expect(summary.affectedPages).toHaveLength(4)
  })
})
