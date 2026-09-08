import { redirects } from '../../redirects'
import { describe, expect, it } from 'vitest'

describe('public compatibility redirects', () => {
  it('limits default-Vietnamese and WingsGroup editorial redirects to their canonical hosts', async () => {
    const configured = await redirects()
    const viRedirect = configured.find((entry) => entry.source === '/vi')
    const postsRedirect = configured.find((entry) => entry.source === '/posts')

    expect(viRedirect?.has).toEqual([
      {
        type: 'host',
        value:
          '(?:www\\.)?(?:wingsgroup\\.vn|wingsgo\\.vn|wingsplus\\.vn|wingspass\\.wingsgroup\\.vn|wingscare\\.wingsgroup\\.vn)',
      },
    ])
    expect(postsRedirect?.has).toEqual([
      {
        type: 'host',
        value: '(?:www\\.)?wingsgroup\\.vn',
      },
    ])
  })
})
