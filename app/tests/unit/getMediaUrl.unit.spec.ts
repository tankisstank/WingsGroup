import { describe, expect, it } from 'vitest'

import { getMediaUrl, normalizePublicMediaURL } from '@/utilities/getMediaUrl'

describe('public media URL normalization', () => {
  it('rewrites Payload internal file URLs to the site-context-aware public route', () => {
    expect(normalizePublicMediaURL('/api/media/file/hero.jpg')).toBe('/media/hero.jpg')
    expect(normalizePublicMediaURL('/api/media/file/hero.jpg?cache=123#gallery')).toBe(
      '/media/hero.jpg?cache=123#gallery',
    )
  })

  it('preserves static and external URLs unchanged', () => {
    expect(normalizePublicMediaURL('/brand/wingside/logo.png')).toBe('/brand/wingside/logo.png')
    expect(normalizePublicMediaURL('https://cdn.example.test/hero.jpg?version=1')).toBe(
      'https://cdn.example.test/hero.jpg?version=1',
    )
  })

  it('rewrites absolute Payload file URLs without losing the origin or query', () => {
    expect(
      normalizePublicMediaURL('https://wingsgroup.vn/api/media/file/hero.jpg?cache=123#og'),
    ).toBe('https://wingsgroup.vn/media/hero.jpg?cache=123#og')
  })

  it('retains existing query strings, hashes, and cache tags', () => {
    expect(getMediaUrl('/api/media/file/hero.jpg?version=1#gallery', 'updated-at')).toBe(
      '/media/hero.jpg?version=1&updated-at#gallery',
    )
  })
})
