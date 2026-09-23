import { describe, expect, it } from 'vitest'

import {
  getAdminSiteContextID,
  getAdminSiteScopedCollection,
  isAdminSiteContextPath,
  withAdminSiteContext,
} from '@/utilities/adminSiteContext'

describe('admin site context', () => {
  it('reads the explicit site query before the collection where query', () => {
    expect(getAdminSiteContextID('?site=wing-side&where%5Bsite%5D%5Bequals%5D=3')).toBe('wing-side')
    expect(getAdminSiteContextID('?where%5Bsite%5D%5Bequals%5D=3')).toBe('3')
    expect(getAdminSiteContextID('')).toBe('')
  })

  it('adds site context to site-scoped admin links and preserves existing params', () => {
    const result = withAdminSiteContext('/admin/collections/pages?locale=en#content', '3')
    const url = new URL(result, 'http://wingsgroup-admin.local')

    expect(url.pathname).toBe('/admin/collections/pages')
    expect(url.searchParams.get('site')).toBe('3')
    expect(url.searchParams.get('where[site][equals]')).toBe('3')
    expect(url.searchParams.get('locale')).toBe('en')
    expect(url.hash).toBe('#content')
  })

  it('does not leak a site filter into global admin links or unknown routes', () => {
    expect(withAdminSiteContext('/admin/account', '3')).toBe('/admin/account')
    expect(withAdminSiteContext('/admin/collections/users', '3')).toBe('/admin/collections/users')
    expect(withAdminSiteContext('/admin/console', '3')).toBe('/admin/console?site=3')
  })

  it('keeps the global site context available on edit, create and custom admin routes', () => {
    expect(getAdminSiteScopedCollection('/admin/collections/pages')).toBe('pages')
    expect(getAdminSiteScopedCollection('/admin/collections/pages/create')).toBe('pages')
    expect(getAdminSiteScopedCollection('/admin/collections/pages/308')).toBe('pages')
    expect(getAdminSiteScopedCollection('/admin/collections/users/1')).toBeNull()
    expect(isAdminSiteContextPath('/admin/theme')).toBe(true)
    expect(isAdminSiteContextPath('/admin/site-review')).toBe(true)
    expect(isAdminSiteContextPath('/admin/page-wizard')).toBe(true)
    expect(isAdminSiteContextPath('/admin/account')).toBe(false)
    expect(withAdminSiteContext('/admin/site-review', '3')).toBe('/admin/site-review?site=3')
  })
})
