'use client'

import Link from 'next/link'
import React, { useCallback, useMemo, useState } from 'react'

import type {
  AdminMetricDescriptor,
  AdminMetricKey,
  RequestState,
} from '@/components/AdminMetrics/contract'

export type DashboardRecentDoc = {
  id: number | string
  title?: null | string
  updatedAt?: null | string
}

export type DashboardSiteDoc = {
  id: number | string
  name?: null | string
}

export type DashboardSubmissionDoc = {
  createdAt?: null | string
  form?: null | { title?: null | string } | number | string
  id: number | string
}

export type DashboardMetricResult = AdminMetricDescriptor & {
  result: RequestState<number>
}

export type DashboardInitialState = {
  counts: DashboardMetricResult[]
  recentPages: RequestState<DashboardRecentDoc[]>
  recentPosts: RequestState<DashboardRecentDoc[]>
  recentSubmissions: RequestState<DashboardSubmissionDoc[]>
  sites: RequestState<DashboardSiteDoc[]>
}

type RequestMessageProps = {
  empty: string
  error: string
  loading: string
  noAccess: string
  onRetry: () => void
  retryLabel: string
  state: RequestState<unknown>
  unavailable: string
}

const baseClass = 'wings-dashboard'
const loadingState = { state: 'loading' } as const
const summaryMetricKeys: readonly AdminMetricKey[] = ['pageDrafts', 'postDrafts', 'leads']

const recentEndpoints = {
  pages: '/api/pages?depth=0&limit=4&sort=-updatedAt',
  posts: '/api/posts?depth=0&limit=4&sort=-updatedAt',
  submissions: '/api/form-submissions?depth=1&limit=4&sort=-createdAt',
  sites: '/api/sites?depth=0&limit=20&sort=name',
} as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isID = (value: unknown): value is number | string =>
  (typeof value === 'number' && Number.isFinite(value)) ||
  (typeof value === 'string' && value.length > 0)

const isOptionalString = (value: unknown): value is null | string | undefined =>
  value === null || value === undefined || typeof value === 'string'

const isOptionalDateString = (value: unknown): value is null | string | undefined =>
  value === null ||
  value === undefined ||
  (typeof value === 'string' && Number.isFinite(Date.parse(value)))

const isRecentDoc = (value: unknown): value is DashboardRecentDoc =>
  isRecord(value) &&
  isID(value.id) &&
  isOptionalString(value.title) &&
  isOptionalDateString(value.updatedAt)

const isSiteDoc = (value: unknown): value is DashboardSiteDoc =>
  isRecord(value) && isID(value.id) && isOptionalString(value.name)

const isSubmissionDoc = (value: unknown): value is DashboardSubmissionDoc => {
  if (!isRecord(value) || !isID(value.id) || !isOptionalDateString(value.createdAt)) {
    return false
  }

  const { form } = value

  return (
    form === null ||
    form === undefined ||
    isID(form) ||
    (isRecord(form) && isOptionalString(form.title))
  )
}

const parseCollection = <T,>(
  value: unknown,
  isDocument: (document: unknown) => document is T,
): RequestState<T[]> => {
  if (!isRecord(value) || !Array.isArray(value.docs) || !value.docs.every(isDocument)) {
    return { state: 'unavailable' }
  }

  return value.docs.length === 0 ? { state: 'empty' } : { state: 'ready', value: value.docs }
}

const parseCount = (value: unknown): RequestState<number> => {
  if (
    !isRecord(value) ||
    typeof value.totalDocs !== 'number' ||
    !Number.isInteger(value.totalDocs) ||
    value.totalDocs < 0
  ) {
    return { state: 'unavailable' }
  }

  return { state: 'ready', value: value.totalDocs }
}

const requestJSON = async <T,>(
  url: string,
  parse: (value: unknown) => RequestState<T>,
): Promise<RequestState<T>> => {
  let response: Response

  try {
    response = await fetch(url, { credentials: 'include' })
  } catch {
    return { state: 'error' }
  }

  if (response.status === 401 || response.status === 403) {
    return { state: 'no-access' }
  }

  if (!response.ok) {
    return { state: 'error' }
  }

  try {
    return parse(await response.json())
  } catch {
    return { state: 'unavailable' }
  }
}

const formatDate = (value?: null | string): string => {
  if (!value) {
    return 'Chưa có ngày'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value))
}

const relationTitle = (value: DashboardSubmissionDoc['form']): string => {
  if (value && typeof value === 'object' && value.title) {
    return value.title
  }

  return 'Lead gửi về'
}

const roleLabel: Record<string, string> = {
  editor: 'Biên tập viên',
  'site-manager': 'Quản lý site',
  'super-admin': 'Quản trị toàn hệ',
}

const stateMessage = (state: RequestState<unknown>): string => {
  switch (state.state) {
    case 'empty':
      return 'Chưa có dữ liệu'
    case 'error':
      return 'Không thể tải dữ liệu'
    case 'loading':
      return 'Đang tải dữ liệu'
    case 'no-access':
      return 'Không có quyền xem'
    case 'unavailable':
      return 'Chưa có dữ liệu'
    case 'ready':
      return ''
  }
}

function RequestMessage({
  empty,
  error,
  loading,
  noAccess,
  onRetry,
  retryLabel,
  state,
  unavailable,
}: RequestMessageProps) {
  if (state.state === 'ready') {
    return null
  }

  const message = {
    empty,
    error,
    loading,
    'no-access': noAccess,
    unavailable,
  }[state.state]
  const canRetry = state.state === 'error' || state.state === 'unavailable'

  return (
    <div
      aria-live={state.state === 'error' ? undefined : 'polite'}
      className={`${baseClass}__state`}
      role={state.state === 'error' ? 'alert' : 'status'}
    >
      <p>{message}</p>
      {canRetry ? (
        <button onClick={onRetry} type="button">
          {retryLabel}
        </button>
      ) : null}
    </div>
  )
}

export function WingsGroupMetricsClient({
  initialState,
  role,
}: {
  initialState: DashboardInitialState
  role?: string
}) {
  const [counts, setCounts] = useState(initialState.counts)
  const [recentPages, setRecentPages] = useState(initialState.recentPages)
  const [recentPosts, setRecentPosts] = useState(initialState.recentPosts)
  const [recentSubmissions, setRecentSubmissions] = useState(initialState.recentSubmissions)
  const [sites, setSites] = useState(initialState.sites)

  const retryMetric = useCallback(async (descriptor: AdminMetricDescriptor) => {
    setCounts((current) =>
      current.map((item) =>
        item.key === descriptor.key ? { ...item, result: loadingState } : item,
      ),
    )
    const result = await requestJSON(descriptor.restQuery, parseCount)
    setCounts((current) =>
      current.map((item) => (item.key === descriptor.key ? { ...item, result } : item)),
    )
  }, [])

  const retrySites = useCallback(async () => {
    setSites(loadingState)
    setSites(await requestJSON(recentEndpoints.sites, (value) => parseCollection(value, isSiteDoc)))
  }, [])

  const retryRecentPages = useCallback(async () => {
    setRecentPages(loadingState)
    setRecentPages(
      await requestJSON(recentEndpoints.pages, (value) => parseCollection(value, isRecentDoc)),
    )
  }, [])

  const retryRecentPosts = useCallback(async () => {
    setRecentPosts(loadingState)
    setRecentPosts(
      await requestJSON(recentEndpoints.posts, (value) => parseCollection(value, isRecentDoc)),
    )
  }, [])

  const retryRecentSubmissions = useCallback(async () => {
    setRecentSubmissions(loadingState)
    setRecentSubmissions(
      await requestJSON(recentEndpoints.submissions, (value) =>
        parseCollection(value, isSubmissionDoc),
      ),
    )
  }, [])

  const summaryCounts = counts.filter((item) => summaryMetricKeys.includes(item.key))
  const summaryIncomplete = summaryCounts.some((item) => item.result.state !== 'ready')
  const contentSummaries = useMemo(
    () =>
      summaryCounts.flatMap((item) =>
        item.result.state === 'ready' && item.result.value > 0
          ? [{ href: item.href, label: item.label, total: item.result.value }]
          : [],
      ),
    [summaryCounts],
  )

  return (
    <section className={baseClass}>
      <div className={`${baseClass}__header`}>
        <div>
          <p className={`${baseClass}__eyebrow`}>WingsGroup CMS</p>
          <h2>Bảng điều hành CMS</h2>
          <p>Dashboard chỉ hiển thị dữ liệu mà phiên hiện tại được phép đọc.</p>
        </div>
        <div className={`${baseClass}__role`}>
          <span>Vai trò</span>
          <strong>{roleLabel[role ?? ''] ?? 'Chưa xác định'}</strong>
        </div>
      </div>

      <div className={`${baseClass}__scope`} aria-label="Phạm vi số liệu" role="group">
        <span>Tất cả site được phân quyền</span>
        <span>Tất cả locale</span>
      </div>

      <div className={`${baseClass}__operations`}>
        <div className={`${baseClass}__section`}>
          <h3>Site được phân quyền</h3>
          {sites.state === 'ready' ? (
            <div className={`${baseClass}__site-list`}>
              {sites.value.map((site) => (
                <span key={site.id}>{site.name || `Site ${String(site.id)}`}</span>
              ))}
            </div>
          ) : (
            <RequestMessage
              empty="Chưa có site được gán"
              error="Không thể tải danh sách site"
              loading="Đang tải danh sách site"
              noAccess="Không có quyền xem danh sách site"
              onRetry={() => void retrySites()}
              retryLabel="Tải lại danh sách site"
              state={sites}
              unavailable="Dữ liệu site không khả dụng"
            />
          )}
        </div>
        <div className={`${baseClass}__section`}>
          <h3>Tóm tắt nội dung</h3>
          {contentSummaries.length > 0 ? (
            <div className={`${baseClass}__task-list`}>
              {contentSummaries.map((task) => (
                <Link href={task.href} key={task.label}>
                  <span>{task.label}</span>
                  <strong>{task.total}</strong>
                </Link>
              ))}
            </div>
          ) : null}
          {summaryIncomplete ? (
            <p className={`${baseClass}__state`} role="status">
              Một số số liệu tóm tắt chưa sẵn sàng
            </p>
          ) : contentSummaries.length === 0 ? (
            <p className={`${baseClass}__state`} role="status">
              Chưa có số liệu cần lưu ý
            </p>
          ) : null}
        </div>
      </div>

      <div aria-label="Số liệu CMS" className={`${baseClass}__metrics`} role="region">
        {counts.map((item) => (
          <article key={item.key}>
            <Link href={item.href}>
              <span>{item.label}</span>
              {item.result.state === 'ready' ? (
                <strong>{item.result.value}</strong>
              ) : (
                <>
                  <strong aria-hidden="true">—</strong>
                  <small
                    aria-live={item.result.state === 'error' ? undefined : 'polite'}
                    role={item.result.state === 'error' ? 'alert' : 'status'}
                  >
                    {stateMessage(item.result)}
                  </small>
                </>
              )}
            </Link>
            {item.result.state === 'error' || item.result.state === 'unavailable' ? (
              <button onClick={() => void retryMetric(item)} type="button">
                Tải lại {item.label}
              </button>
            ) : null}
          </article>
        ))}
      </div>

      <div className={`${baseClass}__columns`}>
        <div>
          <h3>Trang cập nhật gần đây</h3>
          {recentPages.state === 'ready' ? (
            <ul>
              {recentPages.value.map((doc) => (
                <li key={doc.id}>
                  <Link href={`/admin/collections/pages/${doc.id}`}>
                    {doc.title || 'Trang chưa có tiêu đề'}
                  </Link>
                  <span>{formatDate(doc.updatedAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <RequestMessage
              empty="Chưa có trang nào được cập nhật gần đây"
              error="Không thể tải trang cập nhật gần đây"
              loading="Đang tải trang cập nhật gần đây"
              noAccess="Không có quyền xem trang cập nhật gần đây"
              onRetry={() => void retryRecentPages()}
              retryLabel="Tải lại trang cập nhật gần đây"
              state={recentPages}
              unavailable="Dữ liệu trang gần đây không khả dụng"
            />
          )}
        </div>
        <div>
          <h3>Bài viết cập nhật gần đây</h3>
          {recentPosts.state === 'ready' ? (
            <ul>
              {recentPosts.value.map((doc) => (
                <li key={doc.id}>
                  <Link href={`/admin/collections/posts/${doc.id}`}>
                    {doc.title || 'Bài viết chưa có tiêu đề'}
                  </Link>
                  <span>{formatDate(doc.updatedAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <RequestMessage
              empty="Chưa có bài viết nào được cập nhật gần đây"
              error="Không thể tải bài viết cập nhật gần đây"
              loading="Đang tải bài viết cập nhật gần đây"
              noAccess="Không có quyền xem bài viết cập nhật gần đây"
              onRetry={() => void retryRecentPosts()}
              retryLabel="Tải lại bài viết cập nhật gần đây"
              state={recentPosts}
              unavailable="Dữ liệu bài viết gần đây không khả dụng"
            />
          )}
        </div>
        <div>
          <h3>Lead gần đây</h3>
          {recentSubmissions.state === 'ready' ? (
            <ul>
              {recentSubmissions.value.map((doc) => (
                <li key={doc.id}>
                  <Link href={`/admin/collections/form-submissions/${doc.id}`}>
                    {relationTitle(doc.form)}
                  </Link>
                  <span>{formatDate(doc.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <RequestMessage
              empty="Chưa có lead nào"
              error="Không thể tải lead gần đây"
              loading="Đang tải lead gần đây"
              noAccess="Không có quyền xem lead gần đây"
              onRetry={() => void retryRecentSubmissions()}
              retryLabel="Tải lại lead gần đây"
              state={recentSubmissions}
              unavailable="Dữ liệu lead gần đây không khả dụng"
            />
          )}
        </div>
      </div>

      <div className={`${baseClass}__actions`}>
        <Link href="/admin/console">Console vận hành</Link>
        <Link href="/admin/page-wizard">Tạo trang nháp</Link>
        <Link href="/admin/collections/pages/create">Tạo trang</Link>
        <Link href="/admin/collections/posts/create">Tạo bài viết</Link>
        <Link href="/admin/collections/media">Thư viện media</Link>
        <Link href="/admin/collections/form-submissions">Lead gửi về</Link>
      </div>
    </section>
  )
}
