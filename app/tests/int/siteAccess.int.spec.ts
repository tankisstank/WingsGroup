import type { AccessArgs } from 'payload'

import {
  contentCreateAccess,
  contentDeleteAccess,
  contentPublishAccess,
  preventEditorPublish,
  usersReadAccess,
} from '@/access/roles'
import {
  enforceSiteAccess,
  siteManagerScopedAccess,
  siteScopedAccess,
  siteScopedOrAnyone,
  siteScopedOrPublished,
} from '@/access/siteScope'
import { enforceTourProductPublishSite } from '@/collections/Tours/hooks/enforceTourProductPublishSite'
import type { AppUser } from '@/types/auth'
import { describe, expect, it } from 'vitest'

const superAdmin: AppUser = {
  id: 1,
  role: 'super-admin',
  sites: [],
}

const siteManager: AppUser = {
  id: 2,
  role: 'site-manager',
  sites: [10],
}

const editor: AppUser = {
  id: 3,
  role: 'editor',
  sites: [10],
}

const accessArgs = (user?: AppUser, headers?: Headers): AccessArgs =>
  ({
    req: {
      headers,
      user,
    },
  }) as AccessArgs

describe('site-scoped editorial access', () => {
  it('allows editorial create for assigned content roles but delete only for managers', () => {
    expect(contentCreateAccess(accessArgs(editor))).toBe(true)
    expect(contentCreateAccess(accessArgs(siteManager))).toBe(true)
    expect(contentCreateAccess(accessArgs(superAdmin))).toBe(true)

    expect(contentDeleteAccess(accessArgs(editor))).toBe(false)
    expect(contentDeleteAccess(accessArgs(siteManager))).toBe(true)
    expect(contentDeleteAccess(accessArgs(superAdmin))).toBe(true)

    expect(contentPublishAccess(accessArgs(editor))).toBe(false)
    expect(contentPublishAccess(accessArgs(siteManager))).toBe(true)
    expect(contentPublishAccess(accessArgs(superAdmin))).toBe(true)
  })

  it('allows editors to save drafts but blocks direct publishing', () => {
    expect(
      preventEditorPublish({
        data: {
          _status: 'draft',
        },
        operation: 'create',
        req: {
          user: editor,
        },
      } as never),
    ).toEqual({
      _status: 'draft',
    })

    expect(() =>
      preventEditorPublish({
        data: {
          _status: 'published',
        },
        operation: 'update',
        req: {
          user: editor,
        },
      } as never),
    ).toThrow('Editors can save drafts but cannot publish content.')
  })

  it('scopes non-super-admin reads to assigned sites', () => {
    expect(siteScopedAccess()(accessArgs(superAdmin))).toBe(true)
    expect(siteScopedAccess()(accessArgs(editor))).toEqual({
      site: {
        in: [10],
      },
    })
  })

  it('fails closed for anonymous published reads when the site relation is missing', () => {
    expect(siteScopedOrPublished()(accessArgs())).toEqual({
      and: [{ _status: { equals: 'published' } }, { site: { exists: true } }],
    })
  })

  it('blocks anonymous HTTP collection reads while preserving local server queries', () => {
    const externalHeaders = new Headers({ host: 'wingsgroup.example' })

    expect(siteScopedOrAnyone()(accessArgs(undefined, externalHeaders))).toBe(false)
    expect(siteScopedOrPublished()(accessArgs(undefined, externalHeaders))).toBe(false)
    expect(siteScopedOrAnyone()(accessArgs())).toBe(true)
    expect(siteScopedOrPublished()(accessArgs())).toEqual({
      and: [{ _status: { equals: 'published' } }, { site: { exists: true } }],
    })
  })

  it('blocks every Tour Product publish path without a site', () => {
    expect(() =>
      enforceTourProductPublishSite({
        data: { _status: 'published' },
        originalDoc: { _status: 'draft' },
      } as never),
    ).toThrow('Không thể xuất bản tour khi chưa gán site.')

    expect(
      enforceTourProductPublishSite({
        data: { _status: 'published', site: 10 },
        originalDoc: { _status: 'draft' },
      } as never),
    ).toEqual({ _status: 'published', site: 10 })
  })

  it('restricts shared site settings to managers within assigned sites', () => {
    expect(siteManagerScopedAccess()(accessArgs(editor))).toBe(false)
    expect(siteManagerScopedAccess()(accessArgs(siteManager))).toEqual({
      site: {
        in: [10],
      },
    })
  })

  it('enforces site assignment before writes', () => {
    expect(
      enforceSiteAccess({
        data: {
          id: 1,
          site: 10,
        },
        operation: 'create',
        req: {
          user: editor,
        },
      } as never),
    ).toEqual({
      id: 1,
      site: 10,
    })

    expect(() =>
      enforceSiteAccess({
        data: {
          id: 1,
          site: 20,
        },
        operation: 'create',
        req: {
          user: editor,
        },
      } as never),
    ).toThrow('You do not have access to the selected site.')
  })

  it('limits user visibility by role and assigned sites', () => {
    expect(usersReadAccess(accessArgs(superAdmin))).toBe(true)
    expect(usersReadAccess(accessArgs(editor))).toEqual({
      id: {
        equals: editor.id,
      },
    })
    expect(usersReadAccess(accessArgs(siteManager))).toEqual({
      or: [
        {
          id: {
            equals: siteManager.id,
          },
        },
        {
          sites: {
            in: [10],
          },
        },
      ],
    })
  })
})
