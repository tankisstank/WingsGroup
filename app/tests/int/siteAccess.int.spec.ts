import type { AccessArgs } from 'payload'

import {
  contentCreateAccess,
  contentDeleteAccess,
  contentPublishAccess,
  preventEditorPublish,
  usersReadAccess,
} from '@/access/roles'
import { enforceSiteAccess, siteManagerScopedAccess, siteScopedAccess } from '@/access/siteScope'
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

const accessArgs = (user?: AppUser): AccessArgs =>
  ({
    req: {
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
