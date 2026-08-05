import type { WidgetServerProps } from 'payload'
import Link from 'next/link'
import React from 'react'

import type {
  AdminMetricDescriptor,
  AdminMetricKey,
  RequestState,
} from '@/components/AdminMetrics/contract'
import { adminMetricDescriptors } from '@/components/AdminMetrics/contract'
import type { AppUser } from '@/types/auth'
import { getUserSiteIDs, isSuperAdmin } from '@/access/roles'

import './index.scss'

type RecentDoc = {
  id: number | string
  title?: string | null
  updatedAt?: string | null
}

type SiteDoc = {
  id: number | string
  name?: string | null
}

type SubmissionDoc = {
  id: number | string
  createdAt?: string | null
  form?:
    | number
    | string
    | {
        title?: string | null
      }
    | null
}

type MetricResult = AdminMetricDescriptor & {
  result: RequestState<number>
}

const baseClass = 'wings-dashboard'
const summaryMetricKeys: readonly AdminMetricKey[] = ['pageDrafts', 'postDrafts', 'leads']

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

const isRecentDoc = (value: unknown): value is RecentDoc =>
  isRecord(value) &&
  isID(value.id) &&
  isOptionalString(value.title) &&
  isOptionalDateString(value.updatedAt)

const isSiteDoc = (value: unknown): value is SiteDoc =>
  isRecord(value) && isID(value.id) && isOptionalString(value.name)

const isSubmissionDoc = (value: unknown): value is SubmissionDoc => {
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

  if (value.docs.length === 0) {
    return { state: 'empty' }
  }

  return { state: 'ready', value: value.docs }
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

const errorStatus = (error: unknown): number | undefined => {
  if (!isRecord(error)) {
    return undefined
  }

  if (typeof error.status === 'number') {
    return error.status
  }

  if (typeof error.statusCode === 'number') {
    return error.statusCode
  }

  if (isRecord(error.response) && typeof error.response.status === 'number') {
    return error.response.status
  }

  return undefined
}

const safeResult = async <T,>(
  request: () => Promise<unknown>,
  parse: (value: unknown) => RequestState<T>,
): Promise<RequestState<T>> => {
  try {
    return parse(await request())
  } catch (error) {
    const status = errorStatus(error)

    return status === 401 || status === 403 ? { state: 'no-access' } : { state: 'error' }
  }
}

const formatDate = (value?: string | null): string => {
  if (!value) {
    return 'Chưa có ngày'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value))
}

const relationTitle = (value: SubmissionDoc['form']): string => {
  if (value && typeof value === 'object' && 'title' in value && value.title) {
    return value.title
  }

  return 'Lead gửi về'
}

const getSitesWhere = (user: AppUser) => {
  if (isSuperAdmin(user)) {
    return undefined
  }

  const siteIDs = getUserSiteIDs(user)

  return {
    id: {
      in: siteIDs,
    },
  }
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

export async function WingsGroupMetrics({ req }: WidgetServerProps) {
  const user = req.user as AppUser | undefined

  if (!user) {
    return null
  }

  const siteResultPromise = safeResult(
    () =>
      req.payload.find({
        collection: 'sites',
        depth: 0,
        limit: 20,
        overrideAccess: false,
        req,
        sort: 'name',
        where: getSitesWhere(user),
      }),
    (value) => parseCollection(value, isSiteDoc),
  )

  const metricResultPromises = adminMetricDescriptors.map(
    async (descriptor): Promise<MetricResult> => ({
      ...descriptor,
      result: await safeResult(
        () =>
          req.payload.count({
            collection: descriptor.payloadCollection,
            overrideAccess: false,
            req,
            where: descriptor.payloadFilter,
          }),
        parseCount,
      ),
    }),
  )

  const recentPagesPromise = safeResult(
    () =>
      req.payload.find({
        collection: 'pages',
        depth: 0,
        limit: 4,
        overrideAccess: false,
        req,
        sort: '-updatedAt',
      }),
    (value) => parseCollection(value, isRecentDoc),
  )
  const recentPostsPromise = safeResult(
    () =>
      req.payload.find({
        collection: 'posts',
        depth: 0,
        limit: 4,
        overrideAccess: false,
        req,
        sort: '-updatedAt',
      }),
    (value) => parseCollection(value, isRecentDoc),
  )
  const recentSubmissionsPromise = safeResult(
    () =>
      req.payload.find({
        collection: 'form-submissions',
        depth: 1,
        limit: 4,
        overrideAccess: false,
        req,
        sort: '-createdAt',
      }),
    (value) => parseCollection(value, isSubmissionDoc),
  )

  const [sites, counts, recentPages, recentPosts, recentSubmissions] = await Promise.all([
    siteResultPromise,
    Promise.all(metricResultPromises),
    recentPagesPromise,
    recentPostsPromise,
    recentSubmissionsPromise,
  ])

  const summaryCounts = counts.filter((item) => summaryMetricKeys.includes(item.key))
  const summaryIncomplete = summaryCounts.some((item) => item.result.state !== 'ready')
  const contentSummaries = summaryCounts.flatMap((item) =>
    item.result.state === 'ready' && item.result.value > 0
      ? [{ href: item.href, label: item.label, total: item.result.value }]
      : [],
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
          <strong>{roleLabel[user.role ?? ''] ?? 'Chưa xác định'}</strong>
        </div>
      </div>

      <div className={`${baseClass}__scope`} aria-label="Phạm vi số liệu">
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
            <p
              className={`${baseClass}__state`}
              role={sites.state === 'error' ? 'alert' : 'status'}
            >
              {sites.state === 'empty'
                ? 'Chưa có site được gán'
                : sites.state === 'no-access'
                  ? 'Không có quyền xem danh sách site'
                  : sites.state === 'error'
                    ? 'Không thể tải danh sách site'
                    : 'Dữ liệu site không khả dụng'}
            </p>
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
          <Link href={item.href} key={item.key}>
            <span>{item.label}</span>
            {item.result.state === 'ready' ? (
              <strong>{item.result.value}</strong>
            ) : (
              <>
                <strong aria-hidden="true">—</strong>
                <small>{stateMessage(item.result)}</small>
              </>
            )}
          </Link>
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
            <p
              className={`${baseClass}__state`}
              role={recentPages.state === 'error' ? 'alert' : 'status'}
            >
              {recentPages.state === 'empty'
                ? 'Chưa có trang nào được cập nhật gần đây'
                : recentPages.state === 'no-access'
                  ? 'Không có quyền xem trang cập nhật gần đây'
                  : recentPages.state === 'error'
                    ? 'Không thể tải trang cập nhật gần đây'
                    : 'Dữ liệu trang gần đây không khả dụng'}
            </p>
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
            <p
              className={`${baseClass}__state`}
              role={recentPosts.state === 'error' ? 'alert' : 'status'}
            >
              {recentPosts.state === 'empty'
                ? 'Chưa có bài viết nào được cập nhật gần đây'
                : recentPosts.state === 'no-access'
                  ? 'Không có quyền xem bài viết cập nhật gần đây'
                  : recentPosts.state === 'error'
                    ? 'Không thể tải bài viết cập nhật gần đây'
                    : 'Dữ liệu bài viết gần đây không khả dụng'}
            </p>
          )}
        </div>
        <div>
          <h3>Lead mới nhất</h3>
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
            <p
              className={`${baseClass}__state`}
              role={recentSubmissions.state === 'error' ? 'alert' : 'status'}
            >
              {recentSubmissions.state === 'empty'
                ? 'Chưa có lead nào'
                : recentSubmissions.state === 'no-access'
                  ? 'Không có quyền xem lead gần đây'
                  : recentSubmissions.state === 'error'
                    ? 'Không thể tải lead gần đây'
                    : 'Dữ liệu lead gần đây không khả dụng'}
            </p>
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
