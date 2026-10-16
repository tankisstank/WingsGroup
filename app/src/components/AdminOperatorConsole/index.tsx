'use client'

import Link from 'next/link'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import type {
  AdminMetricDescriptor,
  AdminMetricKey,
  RequestState,
} from '@/components/AdminMetrics/contract'
import { adminMetricDescriptors } from '@/components/AdminMetrics/contract'
import AdminStandaloneShell from '@/components/AdminStandaloneShell'
import AdminThemeBootstrap from '@/components/AdminThemeBootstrap'
import { getAdminSiteContextID, withAdminSiteContext } from '@/utilities/adminSiteContext'
import { formatAdminDate } from '@/utilities/formatAdminDate'

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

type QueueItem = {
  date?: null | string
  href: string
  id: number | string
  kind: 'lead' | 'page'
  meta: string
  title: string
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
const taskMetricKeys: readonly AdminMetricKey[] = [
  'pageDrafts',
  'postDrafts',
  'tourDrafts',
  'leads',
]

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

const roleLabel: Record<Role, string> = {
  editor: 'Biên tập viên',
  'site-manager': 'Quản lý site',
  'super-admin': 'Quản trị toàn hệ',
}

const roleContextLabel: Record<Role, string> = {
  editor: 'Đang áp dụng: biên tập viên',
  'site-manager': 'Đang áp dụng: quản lý site',
  'super-admin': 'Đang áp dụng: quản trị toàn hệ',
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
  href,
  onRetry,
  state,
}: {
  descriptor: AdminMetricDescriptor
  href: string
  onRetry: () => void
  state: RequestState<number>
}) {
  return (
    <article
      aria-labelledby={`cms-console-metric-${descriptor.key}`}
      data-od-id={`console-metric-${descriptor.key}`}
    >
      <Link href={href} id={`cms-console-metric-${descriptor.key}`}>
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
  const [reviewedQueueItems, setReviewedQueueItems] = useState<Record<string, boolean>>({})
  const siteContextID =
    typeof window === 'undefined' ? '' : getAdminSiteContextID(window.location.search)
  const scopedURL = useCallback(
    (url: string) => withAdminSiteContext(url, siteContextID),
    [siteContextID],
  )

  const loadMe = useCallback(async () => {
    setMe(loadingState)
    setMe(await requestJSON('/api/users/me', parseCurrentUser))
  }, [])

  const loadMetric = useCallback(
    async (descriptor: AdminMetricDescriptor) => {
      setMetrics((current) => ({ ...current, [descriptor.key]: loadingState }))
      const result = await requestJSON(scopedURL(descriptor.restQuery), parseMetric)
      setMetrics((current) => ({ ...current, [descriptor.key]: result }))
    },
    [scopedURL],
  )

  const loadRecentPages = useCallback(async () => {
    setRecentPages(loadingState)
    setRecentPages(
      await requestJSON(scopedURL('/api/pages?depth=0&limit=5&sort=-updatedAt'), (value) =>
        parseCollection(value, isRecentDoc),
      ),
    )
  }, [scopedURL])

  const loadRecentLeads = useCallback(async () => {
    setRecentLeads(loadingState)
    setRecentLeads(
      await requestJSON(
        scopedURL('/api/form-submissions?depth=1&limit=5&sort=-createdAt'),
        (value) => parseCollection(value, isRecentLead),
      ),
    )
  }, [scopedURL])

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
  const selectedSiteName =
    siteContextID && sites.state === 'ready'
      ? sites.value.find((site) => String(site.id) === siteContextID)?.name ||
        `Site ${siteContextID}`
      : 'Tất cả site được phân quyền'
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
  const queueItems = useMemo<QueueItem[]>(
    () =>
      [
        ...(recentPages.state === 'ready'
          ? recentPages.value.map((doc) => ({
              date: doc.updatedAt,
              href: `/admin/collections/pages/${doc.id}`,
              id: `page-${String(doc.id)}`,
              kind: 'page' as const,
              meta: `Trang · Cập nhật ${formatAdminDate(doc.updatedAt)}`,
              title: doc.title || 'Trang chưa có tiêu đề',
            }))
          : []),
        ...(recentLeads.state === 'ready'
          ? recentLeads.value.map((doc) => ({
              date: doc.createdAt,
              href: `/admin/collections/form-submissions/${doc.id}`,
              id: `lead-${String(doc.id)}`,
              kind: 'lead' as const,
              meta: `Lead · Gửi ${formatAdminDate(doc.createdAt)}`,
              title:
                typeof doc.form === 'object' && doc.form?.title ? doc.form.title : 'Lead gửi về',
            }))
          : []),
      ]
        .sort((left, right) => {
          const leftTime = left.date ? Date.parse(left.date) : 0
          const rightTime = right.date ? Date.parse(right.date) : 0

          return rightTime - leftTime
        })
        .slice(0, 6),
    [recentLeads, recentPages],
  )

  return (
    <AdminStandaloneShell>
      <>
      <AdminThemeBootstrap />
      <a className={`${baseClass}__skip-link`} href="#cms-console-main">
        Bỏ qua đến nội dung Console
      </a>
      <main
        aria-labelledby="cms-console-title"
        className={baseClass}
        data-od-id="console-main"
        id="cms-console-main"
        tabIndex={-1}
      >
        <div className={`${baseClass}__shell`}>
          <header className={`${baseClass}__header`} data-od-id="console-header">
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

          <section
            aria-label="Hành động chính"
            className={`${baseClass}__quick-actions`}
            data-od-id="console-actions"
          >
            <Link className={`${baseClass}__primary-action`} href={scopedURL('/admin/page-wizard')}>
              Tạo trang nháp
            </Link>
            <Link href={scopedURL('/admin/collections/tour-products')}>Quản lý tour</Link>
            <Link href={scopedURL('/admin/collections/tour-products?where[_status][equals]=draft')}>
              Xem tour nháp
            </Link>
            <Link href={scopedURL('/admin/site-review')}>Rà soát site/page</Link>
            {canManageSite ? <Link href={scopedURL('/admin/theme')}>Quản lý theme</Link> : null}
            <Link href={scopedURL('/admin/collections/form-submissions')}>Xem tổng lead</Link>
            <Link href={scopedURL('/admin/collections/pages?where[_status][equals]=draft')}>
              Xem trang nháp
            </Link>
            {canManageSite ? (
              <Link href={scopedURL('/admin/collections/imports')}>Nhập dữ liệu</Link>
            ) : null}
            {canManageSite ? (
              <Link href={scopedURL('/admin/collections/exports')}>Xuất dữ liệu</Link>
            ) : null}
          </section>

          <section
            aria-label="Phạm vi dữ liệu"
            className={`${baseClass}__scope`}
            data-od-id="console-scope"
          >
            <span>Phạm vi: {selectedSiteName}</span>
            <span>Locale nội dung: Tất cả locale</span>
            <small>
              Đây là phạm vi đọc tổng hợp; quyền ghi được kiểm tra tại từng màn hình đích.
            </small>
          </section>

          <section
            aria-label="Không gian vận hành"
            className={`${baseClass}__workspace`}
            data-od-id="console-workspace"
          >
            <section
              aria-label="Hàng đợi hoạt động"
              className={`${baseClass}__queue`}
              data-od-id="console-queue"
            >
              <div className={`${baseClass}__panel-head`}>
                <div>
                  <p className={`${baseClass}__eyebrow`}>Không gian vận hành</p>
                  <h2>Hàng đợi hoạt động</h2>
                  <p>Dữ liệu gần đây theo đúng site, locale và quyền đọc của phiên hiện tại.</p>
                </div>
                <span className={`${baseClass}__queue-count`}>{queueItems.length} mục</span>
              </div>
              {queueItems.length > 0 ? (
                <div aria-live="polite" className={`${baseClass}__task-list`}>
                  {queueItems.map((item) => {
                    const isReviewed = Boolean(reviewedQueueItems[String(item.id)])

                    return (
                      <article
                        className={
                          isReviewed
                            ? `${baseClass}__task ${baseClass}__task--reviewed`
                            : `${baseClass}__task`
                        }
                        data-od-id={`console-task-${String(item.id)}`}
                        key={item.id}
                      >
                        <label className={`${baseClass}__task-check`} title="Đánh dấu đã kiểm tra">
                          <input
                            aria-label={`Đánh dấu đã kiểm tra: ${item.title}`}
                            checked={isReviewed}
                            onChange={(event) => {
                              setReviewedQueueItems((current) => ({
                                ...current,
                                [String(item.id)]: event.target.checked,
                              }))
                            }}
                            type="checkbox"
                          />
                        </label>
                        <span aria-hidden="true" className={`${baseClass}__task-marker`}>
                          {item.kind === 'page' ? 'P' : 'L'}
                        </span>
                        <div>
                          <strong>
                            <Link href={scopedURL(item.href)}>{item.title}</Link>
                          </strong>
                          <span className={`${baseClass}__task-meta`}>{item.meta}</span>
                        </div>
                        <span
                          className={`${baseClass}__badge ${baseClass}__badge--${item.kind}${isReviewed ? ` ${baseClass}__badge--ready` : ''}`}
                          data-status={isReviewed ? 'ready' : 'review'}
                        >
                          {item.kind === 'page' ? 'Trang' : 'Lead'}
                        </span>
                      </article>
                    )
                  })}
                </div>
              ) : null}
              <div className={`${baseClass}__queue-states`}>
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
              </div>
            </section>

            <aside className={`${baseClass}__stack`} data-od-id="console-context">
              <section className={`${baseClass}__context`}>
                <p className={`${baseClass}__eyebrow`}>Context đang áp dụng</p>
                <h2>Site và locale</h2>
                <dl>
                  <div>
                    <dt>Quyền</dt>
                    <dd>{me.state === 'ready' ? roleContextLabel[me.value.role] : '—'}</dd>
                  </div>
                  <div>
                    <dt>Site</dt>
                    <dd>{selectedSiteName}</dd>
                  </div>
                  <div>
                    <dt>Locale</dt>
                    <dd>Tất cả locale</dd>
                  </div>
                </dl>
                <div className={`${baseClass}__context-sites`}>
                  <span>Site được phân quyền</span>
                  {sites.state === 'ready' ? (
                    <div className={`${baseClass}__site-list`} aria-live="polite">
                      {sites.value.map((site) => (
                        <span key={site.id}>
                          {site.name || site.code || `Site ${String(site.id)}`}
                        </span>
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
                </div>
                {canManageSite ? (
                  <div className={`${baseClass}__link-list`}>
                    <Link href={scopedURL('/admin/theme')}>Quản lý giao diện</Link>
                    <Link href={scopedURL('/admin/collections/site-settings')}>Cấu hình site</Link>
                  </div>
                ) : null}
              </section>
              <section className={`${baseClass}__notice`}>
                <h3>Hướng dẫn vận hành</h3>
                <p>
                  Console chỉ điều hướng tới capability thật. Khu vực rà soát site vẫn chỉ đọc;
                  editor phức tạp mở ở màn hình Payload để giữ đủ ngữ cảnh.
                </p>
              </section>
              <section className={`${baseClass}__notice`}>
                <h3>Khu vực Payload</h3>
                <p>Các màn hình Payload giữ quyền sở hữu editor, collection và tác vụ dữ liệu.</p>
                <div className={`${baseClass}__link-list`}>
                  <Link href={scopedURL('/admin/site-review')}>Rà soát site/page bằng preview</Link>
                  <Link href={scopedURL('/admin/page-wizard')}>Tạo trang nháp theo wizard</Link>
                  <Link href={scopedURL('/admin/collections/pages')}>Quản lý trang</Link>
                  <Link href={scopedURL('/admin/collections/tour-products')}>Quản lý tour</Link>
                  <Link href={scopedURL('/admin/collections/tour-curations')}>Bộ tour nổi bật</Link>
                  <Link href={scopedURL('/admin/collections/posts')}>Quản lý bài viết</Link>
                  <Link href={scopedURL('/admin/collections/media')}>Thư viện media</Link>
                  <Link href={scopedURL('/admin/collections/form-submissions')}>Lead gửi về</Link>
                  {canManageSite ? (
                    <Link href={scopedURL('/admin/collections/forms')}>Biểu mẫu</Link>
                  ) : null}
                  {canManageSite ? (
                    <Link href={scopedURL('/admin/collections/imports')}>Nhập dữ liệu</Link>
                  ) : null}
                  {canManageSite ? (
                    <Link href={scopedURL('/admin/collections/exports')}>Xuất dữ liệu</Link>
                  ) : null}
                  {!canManageSite && me.state === 'ready' ? (
                    <span>Editor không có lối tắt import/export.</span>
                  ) : null}
                </div>
              </section>
            </aside>
          </section>

          <section className={`${baseClass}__summary`} data-od-id="console-summary">
            <div>
              <p className={`${baseClass}__eyebrow`}>Tóm tắt phân loại</p>
              <h2>Tóm tắt nội dung</h2>
              <p>Chỉ hiển thị số liệu có nghĩa theo query hiện có.</p>
            </div>
            {tasks.length > 0 ? (
              <div className={`${baseClass}__tasks`}>
                {tasks.map((task) => (
                  <Link href={scopedURL(task.href)} key={task.label}>
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
                Không có trang nháp, bài viết nháp, tour nháp hoặc lead trong phạm vi hiện tại.
              </span>
            ) : null}
          </section>

          <section
            aria-label="Số liệu CMS"
            className={`${baseClass}__metrics`}
            data-od-id="console-metrics"
          >
            {adminMetricDescriptors.map((descriptor) => (
              <MetricPanel
                descriptor={descriptor}
                href={scopedURL(descriptor.href)}
                key={descriptor.key}
                onRetry={() => void loadMetric(descriptor)}
                state={metrics[descriptor.key]}
              />
            ))}
          </section>

          {isSuperAdmin ? (
            <section className={`${baseClass}__advanced`} data-od-id="console-advanced">
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
    </AdminStandaloneShell>
  )
}
