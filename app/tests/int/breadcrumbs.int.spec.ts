import type { SiteSetting } from '@/payload-types'

import {
  buildPageBreadcrumbItems,
  buildPostBreadcrumbItems,
  type BreadcrumbPage,
  type BreadcrumbPost,
} from '@/utilities/breadcrumbs'
import { buildBreadcrumbListJSONLD } from '@/utilities/structuredData'
import { describe, expect, it } from 'vitest'

const settings = {
  id: 1,
  site: 1,
  siteName: 'WingsGroup',
  updatedAt: '2026-05-27T00:00:00.000Z',
  createdAt: '2026-05-27T00:00:00.000Z',
  seo: {
    canonicalDomain: 'https://wingsgroup.com',
  },
} as SiteSetting

describe('breadcrumb helpers', () => {
  it('keeps home pages breadcrumb-only visually disabled', () => {
    const page = {
      id: 1,
      title: 'Home',
      slug: 'home',
    } as BreadcrumbPage

    const items = buildPageBreadcrumbItems({ page, settings })

    expect(items).toEqual([{ label: 'WingsGroup', path: '/' }])
    expect(buildBreadcrumbListJSONLD(items.map((item) => ({ name: item.label, path: item.path })), settings)).toBeNull()
  })

  it('builds visible page hierarchy from parent pages and breadcrumb labels', () => {
    const page = {
      id: 2,
      title: 'Tour Detail',
      slug: 'tour-detail',
      meta: {
        breadcrumbLabel: 'Detail',
      },
      parentPage: {
        id: 1,
        title: 'Tours',
        slug: 'tours',
      },
    } as BreadcrumbPage

    expect(buildPageBreadcrumbItems({ page, settings })).toEqual([
      { label: 'WingsGroup', path: '/' },
      { label: 'Tours', path: '/tours' },
      { label: 'Detail', path: '/tour-detail' },
    ])
  })

  it('builds post breadcrumbs through the posts archive', () => {
    const post = {
      id: 1,
      title: 'Launch Post',
      slug: 'launch',
      meta: {
        breadcrumbLabel: 'Launch',
      },
    } as BreadcrumbPost

    expect(buildPostBreadcrumbItems({ post, settings })).toEqual([
      { label: 'WingsGroup', path: '/' },
      { label: 'Bài viết', path: '/posts' },
      { label: 'Launch', path: '/posts/launch' },
    ])
  })
})
