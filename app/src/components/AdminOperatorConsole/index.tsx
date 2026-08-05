'use client'

import Link from 'next/link'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import type {
  AdminMetricDescriptor,
  AdminMetricKey,
  RequestState,
} from '@/components/AdminMetrics/contract'
import { adminMetricDescriptors } from '@/components/AdminMetrics/contract'
import AdminThemeBootstrap from '@/components/AdminThemeBootstrap'

import './index.scss'

type Role = 'editor' | 'site-manager' | 'super-admin'

type CurrentUser = {
  role: Role
}

type RecentDoc = {
  id: number | string
  title?: null | string
  updatedAt?: null | string
}

type RecentLead = {
  createdAt?: null | string
  form?: null | { title?: null | string } | number | string
  id: number | string
}

type SiteDoc = {
  code?: null | string
  id: number | string
  name?: null | string
}

type MetricStates = Record<AdminMetricKey, RequestState<number>>

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

const baseClass = 'cms-console'
const loadingState = { state: 'loading' } as const
const taskMetricKeys: readonly AdminMetricKey[] = ['pageDrafts', 'postDrafts', 'leads']

const createMetricStates = (): MetricStates =>
  Object.fromEntries(
    adminMetricDescriptors.map((descriptor) => [descriptor.key, loadingState]),
  ) as MetricStates

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

const isRole = (value: unknown): value is Role =>
  value === 'editor' || value === 'site-manager' || value === 'super-admin'

const isRecentDoc = (value: unknown): value is RecentDoc =>
  isRecord(value) &&
  isID(value.id) &&
  isOptionalString(value.title) &&
  isOptionalDateString(value.updatedAt)

const isRecentLead = (value: unknown): value is RecentLead => {
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

const isSiteDoc = (value: unknown): value is SiteDoc =>
  isRecord(value) && isID(value.id) && isOptionalString(value.code) && isOptionalString(value.name)

const parseCurrentUser = (value: unknown): RequestState<CurrentUser> => {
  if (!isRecord(value) || !isRecord(value.user) || !isRole(value.user.role)) {
    return { state: 'unavailable' }
  }

  return { state: 'ready', value: { role: value.user.role } }
}

const parseCollection = <T,>(
  value: unknown,
  isDocument: (document: unknown) => document is T,
): RequestState<T[]> => {
  if (!isRecord(value) || !Array.isArray(value.docs) || !value.docs.every(isDocument)) {
    return { state: 'unavailable' }
  }

  if (value.docs.length === 0) {
    return { state: 'empty' }
  }

  return { state: 'ready', value: value.docs }
}

const parseMetric = (value: unknown): RequestState<number> => {
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

const roleLabel: Record<Role, string> = {
  editor: 'Biên tập viên',
  'site-manager': 'Quản lý site',
  'super-admin': 'Quản trị toàn hệ',
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
      className={`${baseClass}__request-message`}
      role={state.state === 'error' ? 'alert' : 'status'}
    >
      <p>{message}</p>
      {canRetry ? (
        <button className={`${baseClass}__retry`} onClick={onRetry} type="button">
          {retryLabel}
        </button>
      ) : null}
    </div>
  )
}

function MetricPanel({
  descriptor,
  onRetry,
  state,
}: {
  descriptor: AdminMetricDescriptor
  onRetry: () => void
  state: RequestState<number>
}) {
  return (
    <article aria-labelledby={`cms-console-metric-${descriptor.key}`}>
      <Link href={descriptor.href} id={`cms-console-metric-${descriptor.key}`}>
        {descriptor.label}
      </Link>
      {state.state === 'ready' ? (
        <strong aria-live="polite">{state.value}</strong>
      ) : (
        <>
          <strong aria-hidden="true">—</strong>
          <RequestMessage
            empty="Chưa có dữ liệu."
            error="Không thể tải dữ liệu."
            loading="Đang tải dữ liệu."
            noAccess="Không có quyền xem."
            onRetry={onRetry}
            retryLabel={`Tải lại ${descriptor.label}`}
            state={state}
            unavailable="Chưa có dữ liệu."
          />
        </>
      )}
    </article>
  )
}

export default function AdminOperatorConsole() {
  const [me, setMe] = useState<RequestState<CurrentUser>>(loadingState)
  const [metrics, setMetrics] = useState<MetricStates>(createMetricStates)
  const [recentPages, setRecentPages] = useState<RequestState<RecentDoc[]>>(loadingState)
  const [recentLeads, setRecentLeads] = useState<RequestState<RecentLead[]>>(loadingState)
  const [sites, setSites] = useState<RequestState<SiteDoc[]>>(loadingState)

  const loadMe = useCallback(async () => {
    setMe(loadingState)
    setMe(await requestJSON('/api/users/me', parseCurrentUser))
  }, [])

  const loadMetric = useCallback(async (descriptor: AdminMetricDescriptor) => {
    setMetrics((current) => ({ ...current, [descriptor.key]: loadingState }))
    const result = await requestJSON(descriptor.restQuery, parseMetric)
    setMetrics((current) => ({ ...current, [descriptor.key]: result }))
  }, [])

  const loadRecentPages = useCallback(async () => {
    setRecentPages(loadingState)
    setRecentPages(
      await requestJSON('/api/pages?depth=0&limit=5&sort=-updatedAt', (value) =>
        parseCollection(value, isRecentDoc),
      ),
    )
  }, [])

  const loadRecentLeads = useCallback(async () => {
    setRecentLeads(loadingState)
    setRecentLeads(
      await requestJSON('/api/form-submissions?depth=1&limit=5&sort=-createdAt', (value) =>
        parseCollection(value, isRecentLead),
      ),
    )
  }, [])

  const loadSites = useCallback(async () => {
    setSites(loadingState)
    setSites(
      await requestJSON('/api/sites?depth=0&limit=20&sort=name', (value) =>
        parseCollection(value, isSiteDoc),
      ),
    )
  }, [])

  useEffect(() => {
    void Promise.all([
      loadMe(),
      loadSites(),
      loadRecentPages(),
      loadRecentLeads(),
      ...adminMetricDescriptors.map(loadMetric),
    ])
  }, [loadMe, loadMetric, loadRecentLeads, loadRecentPages, loadSites])

  const role = me.state === 'ready' ? me.value.role : undefined
  const canManageSite = role === 'site-manager' || role === 'super-admin'
  const isSuperAdmin = role === 'super-admin'
  const tasks = useMemo(
    () =>
      adminMetricDescriptors
        .filter((descriptor) => taskMetricKeys.includes(descriptor.key))
        .flatMap((descriptor) => {
          const result = metrics[descriptor.key]

          return result.state === 'ready' && result.value > 0
            ? [{ href: descriptor.href, label: descriptor.label, total: result.value }]
            : []
        }),
    [metrics],
  )
  const taskStates = taskMetricKeys.map((key) => metrics[key])
  const taskSummaryLoading = taskStates.some((state) => state.state === 'loading')
  const taskSummaryIncomplete = taskStates.some(
    (state) =>
      state.state === 'error' || state.state === 'no-access' || state.state === 'unavailable',
  )

  return (
    <>
      <AdminThemeBootstrap />
      <a className={`${baseClass}__skip-link`} href="#cms-console-main">
        Bỏ qua đến nội dung Console
      </a>
      <main
        aria-labelledby="cms-console-title"
        className={baseClass}
        id="cms-console-main"
        tabIndex={-1}
      >
        <div className={`${baseClass}__shell`}>
          <header className={`${baseClass}__header`}>
            <div>
              <nav className={`${baseClass}__breadcrumbs`} aria-label="Điều hướng admin">
                <Link href="/admin">Bảng điều hành admin</Link>
                <span aria-hidden="true">/</span>
                <span>Console vận hành</span>
              </nav>
              <p>WingsGroup CMS</p>
              <h1 id="cms-console-title">Console vận hành</h1>
              <span>Tổng hợp nội dung hiện có trong phạm vi bạn được Payload cho phép xem.</span>
            </div>
            <div className={`${baseClass}__header-side`}>
              <Link className={`${baseClass}__admin-home`} href="/admin">
                ← Về admin
              </Link>
              <div className={`${baseClass}__role`}>
                <span>Vai trò</span>
                {me.state === 'ready' ? (
                  <strong aria-live="polite">{roleLabel[me.value.role]}</strong>
                ) : (
                  <RequestMessage
                    empty="Không xác định được vai trò."
                    error="Không thể tải vai trò."
                    loading="Đang tải vai trò."
                    noAccess="Không có quyền xem vai trò."
                    onRetry={() => void loadMe()}
                    retryLabel="Tải lại vai trò"
                    state={me}
                    unavailable="Dữ liệu vai trò không khả dụng."
                  />
                )}
              </div>
            </div>
          </header>

          <section className={`${baseClass}__scope`} aria-label="Phạm vi dữ liệu">
            <span>Phạm vi: Tất cả site được phân quyền</span>
            <span>Locale nội dung: Tất cả locale</span>
            <small>
              Đây là phạm vi đọc tổng hợp; quyền ghi được kiểm tra tại từng màn hình đích.
            </small>
          </section>

          <section className={`${baseClass}__quick-actions`} aria-label="Hành động chính">
            <Link className={`${baseClass}__primary-action`} href="/admin/page-wizard">
              Tạo trang nháp
            </Link>
            <Link href="/admin/site-review">Rà soát site/page</Link>
            {canManageSite ? <Link href="/admin/theme">Quản lý theme</Link> : null}
            <Link href="/admin/collections/form-submissions">Xem tổng lead</Link>
            <Link href="/admin/collections/pages?where[_status][equals]=draft">Xem trang nháp</Link>
            {canManageSite ? <Link href="/admin/collections/imports">Nhập dữ liệu</Link> : null}
            {canManageSite ? <Link href="/admin/collections/exports">Xuất dữ liệu</Link> : null}
          </section>

          <section className={`${baseClass}__today`}>
            <div>
              <h2>Tóm tắt nội dung</h2>
              <p>Chỉ hiển thị số liệu có nghĩa theo query hiện có.</p>
            </div>
            {tasks.length > 0 ? (
              <div className={`${baseClass}__tasks`}>
                {tasks.map((task) => (
                  <Link href={task.href} key={task.label}>
                    <span>{task.label}</span>
                    <strong>{task.total}</strong>
                  </Link>
                ))}
              </div>
            ) : null}
            {taskSummaryLoading ? (
              <span aria-live="polite" role="status">
                Đang tải tóm tắt nội dung.
              </span>
            ) : taskSummaryIncomplete ? (
              <span aria-live="polite" role="status">
                Một số số liệu tóm tắt chưa sẵn sàng.
              </span>
            ) : tasks.length === 0 ? (
              <span aria-live="polite" role="status">
                Không có trang nháp, bài viết nháp hoặc lead trong phạm vi hiện tại.
              </span>
            ) : null}
          </section>

          <section className={`${baseClass}__metrics`} aria-label="Số liệu CMS">
            {adminMetricDescriptors.map((descriptor) => (
              <MetricPanel
                descriptor={descriptor}
                key={descriptor.key}
                onRetry={() => void loadMetric(descriptor)}
                state={metrics[descriptor.key]}
              />
            ))}
          </section>

          <section className={`${baseClass}__workspace`}>
            <div className={`${baseClass}__panel`}>
              <h2>Nội dung</h2>
              <div className={`${baseClass}__link-list`}>
                <Link href="/admin/site-review">Rà soát site/page bằng preview</Link>
                <Link href="/admin/page-wizard">Tạo trang nháp theo wizard</Link>
                <Link href="/admin/collections/pages">Quản lý trang</Link>
                <Link href="/admin/collections/posts">Quản lý bài viết</Link>
                <Link href="/admin/collections/media">Thư viện media</Link>
              </div>
            </div>

            <div className={`${baseClass}__panel`}>
              <h2>Lead</h2>
              <p>Lead xuất hiện khi khách gửi form trên website.</p>
              <div className={`${baseClass}__link-list`}>
                <Link href="/admin/collections/form-submissions">Lead gửi về</Link>
                {canManageSite ? <Link href="/admin/collections/forms">Biểu mẫu</Link> : null}
              </div>
            </div>

            <div className={`${baseClass}__panel`}>
              <h2>Cấu hình site</h2>
              <p>Chỉ chỉnh các cấu hình thuộc site được phân quyền.</p>
              {sites.state === 'ready' ? (
                <div className={`${baseClass}__site-list`} aria-live="polite">
                  {sites.value.map((site) => (
                    <span key={site.id}>{site.name || site.code || `Site ${String(site.id)}`}</span>
                  ))}
                </div>
              ) : (
                <RequestMessage
                  empty="Chưa có site được gán."
                  error="Không thể tải danh sách site."
                  loading="Đang tải danh sách site."
                  noAccess="Không có quyền xem danh sách site."
                  onRetry={() => void loadSites()}
                  retryLabel="Tải lại danh sách site"
                  state={sites}
                  unavailable="Dữ liệu site không khả dụng."
                />
              )}
              {canManageSite ? (
                <div className={`${baseClass}__link-list`}>
                  <Link href="/admin/theme">Theme Manager</Link>
                  <Link href="/admin/collections/site-settings">Cấu hình site</Link>
                </div>
              ) : null}
            </div>

            <div className={`${baseClass}__panel`}>
              <h2>Dữ liệu</h2>
              <p>Dùng màn hình native để xem phạm vi, mapping và trạng thái tác vụ dữ liệu.</p>
              <div className={`${baseClass}__link-list`}>
                {canManageSite ? <Link href="/admin/collections/imports">Nhập dữ liệu</Link> : null}
                {canManageSite ? <Link href="/admin/collections/exports">Xuất dữ liệu</Link> : null}
                {!canManageSite && me.state === 'ready' ? (
                  <span>Editor không có lối tắt import/export.</span>
                ) : null}
              </div>
            </div>
          </section>

          <section className={`${baseClass}__recent`}>
            <div>
              <h2>Trang cập nhật gần đây</h2>
              {recentPages.state === 'ready' ? (
                <ul aria-live="polite">
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
                  empty="Chưa có trang nào được cập nhật gần đây."
                  error="Không thể tải trang cập nhật gần đây."
                  loading="Đang tải trang cập nhật gần đây."
                  noAccess="Không có quyền xem trang cập nhật gần đây."
                  onRetry={() => void loadRecentPages()}
                  retryLabel="Tải lại trang gần đây"
                  state={recentPages}
                  unavailable="Dữ liệu trang gần đây không khả dụng."
                />
              )}
            </div>
            <div>
              <h2>Lead gửi gần đây</h2>
              {recentLeads.state === 'ready' ? (
                <ul aria-live="polite">
                  {recentLeads.value.map((doc) => (
                    <li key={doc.id}>
                      <Link href={`/admin/collections/form-submissions/${doc.id}`}>
                        {typeof doc.form === 'object' && doc.form?.title
                          ? doc.form.title
                          : 'Lead gửi về'}
                      </Link>
                      <span>{formatDate(doc.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <RequestMessage
                  empty="Chưa có lead nào."
                  error="Không thể tải lead gần đây."
                  loading="Đang tải lead gần đây."
                  noAccess="Không có quyền xem lead gần đây."
                  onRetry={() => void loadRecentLeads()}
                  retryLabel="Tải lại lead gần đây"
                  state={recentLeads}
                  unavailable="Dữ liệu lead gần đây không khả dụng."
                />
              )}
            </div>
          </section>

          {isSuperAdmin ? (
            <section className={`${baseClass}__advanced`}>
              <h2>Nâng cao</h2>
              <div className={`${baseClass}__link-list`}>
                <Link href="/admin/collections/sites">Site</Link>
                <Link href="/admin/collections/users">Người dùng</Link>
                <Link href="/admin/collections/redirects">Redirects</Link>
                <Link href="/admin/collections/search">Search</Link>
                <Link href="/admin/globals/header">Header global</Link>
                <Link href="/admin/globals/footer">Footer global</Link>
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </>
  )
}
