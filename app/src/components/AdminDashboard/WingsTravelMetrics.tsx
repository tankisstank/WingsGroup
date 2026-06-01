import type { CollectionSlug, PaginatedDocs, Where, WidgetServerProps } from 'payload'
import Link from 'next/link'
import React from 'react'

import type { AppUser, RelationID } from '@/types/auth'
import { getUserSiteIDs, isSuperAdmin, normalizeRelationID } from '@/access/roles'

import './index.scss'

type CountTarget = {
  href: string
  key: string
  label: string
  slug: CollectionSlug
  where?: Where
}

type RecentDoc = {
  id: number | string
  slug?: string | null
  title?: string | null
  updatedAt?: string
}

type SubmissionDoc = {
  id: number | string
  createdAt?: string
  form?:
    | number
    | string
    | {
        title?: string | null
      }
}

const baseClass = 'wings-dashboard'

const formatDate = (value?: string): string => {
  if (!value) {
    return 'Chưa có ngày'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date(value))
}

const relationTitle = (value: SubmissionDoc['form']): string => {
  if (value && typeof value === 'object' && 'title' in value && value.title) {
    return value.title
  }

  return 'Lead gửi về'
}

const getSitesWhere = (user: AppUser): Where | undefined => {
  if (isSuperAdmin(user)) {
    return undefined
  }

  const siteIDs = getUserSiteIDs(user)

  if (siteIDs.length === 0) {
    return {
      id: {
        in: [],
      },
    }
  }

  return {
    id: {
      in: siteIDs,
    },
  }
}

const getSiteName = (site: unknown): string => {
  if (site && typeof site === 'object' && 'name' in site && typeof site.name === 'string') {
    return site.name
  }

  return `Site ${String(normalizeRelationID(site as RelationID) ?? '')}`
}

const roleLabel: Record<string, string> = {
  editor: 'Biên tập viên',
  'site-manager': 'Quản lý site',
  'super-admin': 'Quản trị toàn hệ',
}

export async function WingsTravelMetrics({ req }: WidgetServerProps) {
  const user = req.user as AppUser | undefined

  if (!user) {
    return null
  }

  const countTargets: CountTarget[] = [
    {
      href: '/admin/collections/sites',
      key: 'sites',
      label: 'Site',
      slug: 'sites',
    },
    {
      href: '/admin/collections/site-settings',
      key: 'siteSettings',
      label: 'Cấu hình site',
      slug: 'site-settings',
    },
    {
      href: '/admin/collections/pages',
      key: 'pages',
      label: 'Trang',
      slug: 'pages',
    },
    {
      href: '/admin/collections/pages?where[_status][equals]=draft',
      key: 'pageDrafts',
      label: 'Nháp trang',
      slug: 'pages',
      where: {
        _status: {
          equals: 'draft',
        },
      },
    },
    {
      href: '/admin/collections/posts',
      key: 'posts',
      label: 'Bài viết',
      slug: 'posts',
    },
    {
      href: '/admin/collections/posts?where[_status][equals]=draft',
      key: 'postDrafts',
      label: 'Nháp bài viết',
      slug: 'posts',
      where: {
        _status: {
          equals: 'draft',
        },
      },
    },
    {
      href: '/admin/collections/media',
      key: 'media',
      label: 'Media',
      slug: 'media',
    },
    {
      href: '/admin/collections/forms',
      key: 'forms',
      label: 'Biểu mẫu',
      slug: 'forms',
    },
    {
      href: '/admin/collections/form-submissions',
      key: 'leads',
      label: 'Lead',
      slug: 'form-submissions',
    },
  ]

  const [sites, counts, recentPages, recentPosts, recentSubmissions] = await Promise.all([
    req.payload.find({
      collection: 'sites',
      depth: 0,
      limit: 20,
      overrideAccess: false,
      req,
      sort: 'name',
      where: getSitesWhere(user),
    }),
    Promise.all(
      countTargets.map(async (target) => {
        try {
          const result = await req.payload.count({
            collection: target.slug,
            overrideAccess: false,
            req,
            where: target.where,
          })

          return {
            ...target,
            total: result.totalDocs,
          }
        } catch {
          return {
            ...target,
            total: 0,
          }
        }
      }),
    ),
    req.payload.find({
      collection: 'pages',
      depth: 0,
      limit: 4,
      overrideAccess: false,
      req,
      sort: '-updatedAt',
    }) as Promise<PaginatedDocs<RecentDoc>>,
    req.payload.find({
      collection: 'posts',
      depth: 0,
      limit: 4,
      overrideAccess: false,
      req,
      sort: '-updatedAt',
    }) as Promise<PaginatedDocs<RecentDoc>>,
    req.payload.find({
      collection: 'form-submissions',
      depth: 1,
      limit: 4,
      overrideAccess: false,
      req,
      sort: '-createdAt',
    }) as Promise<PaginatedDocs<SubmissionDoc>>,
  ])

  const canPublish = user.role === 'super-admin' || user.role === 'site-manager'
  const countByKey = Object.fromEntries(counts.map((item) => [item.key, item.total]))
  const reviewTasks = [
    {
      href: '/admin/collections/pages?where[_status][equals]=draft',
      label: 'Trang chờ duyệt',
      total: countByKey.pageDrafts ?? 0,
    },
    {
      href: '/admin/collections/posts?where[_status][equals]=draft',
      label: 'Bài viết chờ duyệt',
      total: countByKey.postDrafts ?? 0,
    },
    {
      href: '/admin/collections/form-submissions',
      label: 'Lead cần xử lý',
      total: countByKey.leads ?? 0,
    },
  ].filter((task) => task.total > 0)

  return (
    <section className={baseClass}>
      <div className={`${baseClass}__header`}>
        <div>
          <p className={`${baseClass}__eyebrow`}>WingsTravel CMS</p>
          <h2>Bảng điều hành CMS</h2>
          <p>
            {canPublish
              ? 'Bạn có thể quản lý nội dung, lead, cấu hình site, publish và import/export trong phạm vi được phân quyền.'
              : 'Bạn có thể tạo và sửa bản nháp trong các site được giao. Việc publish do site manager hoặc super admin duyệt.'}
          </p>
        </div>
        <div className={`${baseClass}__role`}>
          <span>Vai trò</span>
          <strong>{roleLabel[user.role ?? ''] ?? 'Chưa xác định'}</strong>
        </div>
      </div>

      <div className={`${baseClass}__operations`}>
        <div className={`${baseClass}__section`}>
          <h3>Site được phân quyền</h3>
          <div className={`${baseClass}__site-list`}>
            {sites.docs.length > 0 ? (
              sites.docs.map((site) => <span key={site.id}>{getSiteName(site)}</span>)
            ) : (
              <span>Chưa có site được gán</span>
            )}
          </div>
        </div>
        <div className={`${baseClass}__section`}>
          <h3>Việc cần xử lý</h3>
          <div className={`${baseClass}__task-list`}>
            {reviewTasks.length > 0 ? (
              reviewTasks.map((task) => (
                <Link href={task.href} key={task.label}>
                  <span>{task.label}</span>
                  <strong>{task.total}</strong>
                </Link>
              ))
            ) : (
              <span>Không có việc khẩn cấp</span>
            )}
          </div>
        </div>
      </div>

      <div className={`${baseClass}__metrics`}>
        {counts.map((item) => (
          <Link href={item.href} key={item.key}>
            <span>{item.label}</span>
            <strong>{item.total}</strong>
          </Link>
        ))}
      </div>

      <div className={`${baseClass}__columns`}>
        <div>
          <h3>Trang cập nhật gần đây</h3>
          <ul>
            {recentPages.docs.map((doc) => (
              <li key={doc.id}>
                <Link href={`/admin/collections/pages/${doc.id}`}>
                  {doc.title || 'Trang chưa có tiêu đề'}
                </Link>
                <span>{formatDate(doc.updatedAt)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Bài viết cập nhật gần đây</h3>
          <ul>
            {recentPosts.docs.map((doc) => (
              <li key={doc.id}>
                <Link href={`/admin/collections/posts/${doc.id}`}>
                  {doc.title || 'Bài viết chưa có tiêu đề'}
                </Link>
                <span>{formatDate(doc.updatedAt)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Lead mới nhất</h3>
          <ul>
            {recentSubmissions.docs.map((doc) => (
              <li key={doc.id}>
                <Link href={`/admin/collections/form-submissions/${doc.id}`}>
                  {relationTitle(doc.form)}
                </Link>
                <span>{formatDate(doc.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={`${baseClass}__actions`}>
        <Link href="/admin/console">Console vận hành</Link>
        <Link href="/admin/page-wizard">Tạo trang nhanh</Link>
        <Link href="/admin/collections/pages/create">Tạo trang</Link>
        <Link href="/admin/collections/posts/create">Tạo bài viết</Link>
        <Link href="/admin/collections/media">Thư viện media</Link>
        <Link href="/admin/collections/form-submissions">Lead gửi về</Link>
        {canPublish ? <Link href="/admin/collections/imports">Import dữ liệu</Link> : null}
        {canPublish ? <Link href="/admin/collections/exports">Export dữ liệu</Link> : null}
      </div>
    </section>
  )
}
