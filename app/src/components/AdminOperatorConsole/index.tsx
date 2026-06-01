'use client'

import Link from 'next/link'
import React, { useEffect, useMemo, useState } from 'react'

import './index.scss'

type Role = 'editor' | 'site-manager' | 'super-admin'

type CurrentUser = {
  role?: Role
}

type CountItem = {
  href: string
  key: string
  label: string
  query: string
}

type RecentDoc = {
  id: number | string
  title?: string
  updatedAt?: string
}

type RecentLead = {
  createdAt?: string
  form?: { title?: string } | number | string
  id: number | string
}

type SiteDoc = {
  code?: string
  id: number | string
  name?: string
}

const baseClass = 'cms-console'

const countItems: CountItem[] = [
  {
    href: '/admin/collections/pages',
    key: 'pages',
    label: 'Trang',
    query: '/api/pages?depth=0&limit=0',
  },
  {
    href: '/admin/collections/pages?where[_status][equals]=draft',
    key: 'pageDrafts',
    label: 'Trang nháp',
    query: '/api/pages?depth=0&limit=0&where[_status][equals]=draft',
  },
  {
    href: '/admin/collections/posts',
    key: 'posts',
    label: 'Bài viết',
    query: '/api/posts?depth=0&limit=0',
  },
  {
    href: '/admin/collections/posts?where[_status][equals]=draft',
    key: 'postDrafts',
    label: 'Bài viết nháp',
    query: '/api/posts?depth=0&limit=0&where[_status][equals]=draft',
  },
  {
    href: '/admin/collections/media',
    key: 'media',
    label: 'Media',
    query: '/api/media?depth=0&limit=0',
  },
  {
    href: '/admin/collections/form-submissions',
    key: 'leads',
    label: 'Lead',
    query: '/api/form-submissions?depth=0&limit=0',
  },
]

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

const roleLabel: Record<Role, string> = {
  editor: 'Biên tập viên',
  'site-manager': 'Quản lý site',
  'super-admin': 'Quản trị toàn hệ',
}

const getRole = (user?: CurrentUser): Role => user?.role ?? 'editor'

const fetchJSON = async <T,>(url: string): Promise<T | null> => {
  const response = await fetch(url, {
    credentials: 'include',
  })

  if (!response.ok) {
    return null
  }

  return (await response.json()) as T
}

export default function AdminOperatorConsole() {
  const [user, setUser] = useState<CurrentUser>()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [recentPages, setRecentPages] = useState<RecentDoc[]>([])
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([])
  const [sites, setSites] = useState<SiteDoc[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadConsole = async () => {
      setIsLoading(true)

      const [me, countResults, pages, leads, siteResult] = await Promise.all([
        fetchJSON<{ user?: CurrentUser }>('/api/users/me'),
        Promise.all(
          countItems.map(async (item) => {
            const data = await fetchJSON<{ totalDocs?: number }>(item.query)
            return [item.key, data?.totalDocs ?? 0] as const
          }),
        ),
        fetchJSON<{ docs?: RecentDoc[] }>('/api/pages?depth=0&limit=5&sort=-updatedAt'),
        fetchJSON<{ docs?: RecentLead[] }>('/api/form-submissions?depth=1&limit=5&sort=-createdAt'),
        fetchJSON<{ docs?: SiteDoc[] }>('/api/sites?depth=0&limit=20&sort=name'),
      ])

      setUser(me?.user)
      setCounts(Object.fromEntries(countResults))
      setRecentPages(pages?.docs ?? [])
      setRecentLeads(leads?.docs ?? [])
      setSites(siteResult?.docs ?? [])
      setIsLoading(false)
    }

    void loadConsole()
  }, [])

  const role = getRole(user)
  const canPublish = role === 'site-manager' || role === 'super-admin'
  const isSuperAdmin = role === 'super-admin'
  const tasks = useMemo(
    () =>
      [
        {
          href: '/admin/collections/pages?where[_status][equals]=draft',
          label: 'Trang chờ duyệt',
          total: counts.pageDrafts ?? 0,
        },
        {
          href: '/admin/collections/posts?where[_status][equals]=draft',
          label: 'Bài viết chờ duyệt',
          total: counts.postDrafts ?? 0,
        },
        {
          href: '/admin/collections/form-submissions',
          label: 'Lead mới',
          total: counts.leads ?? 0,
        },
      ].filter((task) => task.total > 0),
    [counts],
  )

  return (
    <main className={baseClass}>
      <div className={`${baseClass}__shell`}>
        <header className={`${baseClass}__header`}>
          <div>
            <p>WingsTravel CMS</p>
            <h1>Console vận hành</h1>
            <span>
              Một nơi để tạo nội dung, xem lead, duyệt bản nháp và xử lý dữ liệu theo quyền
              được phân công.
            </span>
          </div>
          <div className={`${baseClass}__role`}>
            <span>Vai trò</span>
            <strong>{roleLabel[role]}</strong>
          </div>
        </header>

        <section className={`${baseClass}__quick-actions`} aria-label="Hành động chính">
          <Link className={`${baseClass}__primary-action`} href="/admin/page-wizard">
            Tạo trang nhanh
          </Link>
          <Link href="/admin/collections/form-submissions">Xem lead mới</Link>
          <Link href="/admin/collections/pages?where[_status][equals]=draft">
            Duyệt bản nháp
          </Link>
          {canPublish ? <Link href="/admin/collections/imports">Nhập dữ liệu</Link> : null}
          {canPublish ? <Link href="/admin/collections/exports">Xuất dữ liệu</Link> : null}
        </section>

        <section className={`${baseClass}__today`}>
          <div>
            <h2>Việc cần làm hôm nay</h2>
            <p>Chỉ hiển thị những mục đang có dữ liệu cần xử lý.</p>
          </div>
          {isLoading ? (
            <span>Đang tải số liệu...</span>
          ) : tasks.length > 0 ? (
            <div className={`${baseClass}__tasks`}>
              {tasks.map((task) => (
                <Link href={task.href} key={task.label}>
                  <span>{task.label}</span>
                  <strong>{task.total}</strong>
                </Link>
              ))}
            </div>
          ) : (
            <span>Không có việc khẩn cấp.</span>
          )}
        </section>

        <section className={`${baseClass}__metrics`} aria-label="Số liệu CMS">
          {countItems.map((item) => (
            <Link href={item.href} key={item.key}>
              <span>{item.label}</span>
              <strong>{counts[item.key] ?? 0}</strong>
            </Link>
          ))}
        </section>

        <section className={`${baseClass}__workspace`}>
          <div className={`${baseClass}__panel`}>
            <h2>Nội dung</h2>
            <div className={`${baseClass}__link-list`}>
              <Link href="/admin/page-wizard">Tạo trang theo wizard</Link>
              <Link href="/admin/collections/pages">Quản lý trang</Link>
              <Link href="/admin/collections/posts">Quản lý bài viết</Link>
              <Link href="/admin/collections/media">Thư viện media</Link>
            </div>
          </div>

          <div className={`${baseClass}__panel`}>
            <h2>Lead</h2>
            <p>Lead tự xuất hiện khi khách gửi form trên website.</p>
            <div className={`${baseClass}__link-list`}>
              <Link href="/admin/collections/form-submissions">Lead gửi về</Link>
              {canPublish ? <Link href="/admin/collections/forms">Biểu mẫu</Link> : null}
            </div>
          </div>

          <div className={`${baseClass}__panel`}>
            <h2>Cấu hình site</h2>
            <p>Chỉ chỉnh các cấu hình thuộc site được phân quyền.</p>
            <div className={`${baseClass}__site-list`}>
              {sites.length > 0 ? (
                sites.map((site) => <span key={site.id}>{site.name || site.code}</span>)
              ) : (
                <span>Chưa có site được gán</span>
              )}
            </div>
            {canPublish ? (
              <div className={`${baseClass}__link-list`}>
                <Link href="/admin/collections/site-settings">Cấu hình site</Link>
              </div>
            ) : null}
          </div>

          <div className={`${baseClass}__panel`}>
            <h2>Dữ liệu</h2>
            <p>Import luôn tạo bản nháp để kiểm tra trước khi publish.</p>
            <div className={`${baseClass}__link-list`}>
              {canPublish ? <Link href="/admin/collections/imports">Nhập dữ liệu</Link> : null}
              {canPublish ? <Link href="/admin/collections/exports">Xuất dữ liệu</Link> : null}
              {!canPublish ? <span>Editor không có quyền import/export.</span> : null}
            </div>
          </div>
        </section>

        <section className={`${baseClass}__recent`}>
          <div>
            <h2>Trang cập nhật gần đây</h2>
            <ul>
              {recentPages.map((doc) => (
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
            <h2>Lead mới nhất</h2>
            <ul>
              {recentLeads.map((doc) => (
                <li key={doc.id}>
                  <Link href={`/admin/collections/form-submissions/${doc.id}`}>
                    {typeof doc.form === 'object' && doc.form?.title ? doc.form.title : 'Lead gửi về'}
                  </Link>
                  <span>{formatDate(doc.createdAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {isSuperAdmin ? (
          <section className={`${baseClass}__advanced`}>
            <h2>Nâng cao</h2>
            <div className={`${baseClass}__link-list`}>
              <Link href="/admin/collections/sites">Site</Link>
              <Link href="/admin/collections/users">Người dùng</Link>
              <Link href="/admin/collections/redirects">Redirects</Link>
              <Link href="/admin/collections/search-results">Search Results</Link>
              <Link href="/admin/globals/header">Header global</Link>
              <Link href="/admin/globals/footer">Footer global</Link>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  )
}
