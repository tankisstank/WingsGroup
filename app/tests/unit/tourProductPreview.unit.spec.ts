import { TourProducts } from '@/collections/TourProducts'
import { describe, expect, it } from 'vitest'

describe('TourProduct preview readiness', () => {
  it('does not issue a public preview URL before a wrapper page exists', async () => {
    const preview = TourProducts.admin?.preview

    expect(typeof preview).toBe('function')
    expect(
      await preview?.(
        { id: 111, slug: 'draft-without-wrapper', site: 2, wrapperPage: null },
        { locale: 'vi', req: {} as never, token: null },
      ),
    ).toBeNull()
  })
})
