'use client'

import Link from 'next/link'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import AdminStandaloneShell from '@/components/AdminStandaloneShell'
import AdminThemeBootstrap from '@/components/AdminThemeBootstrap'
import { formatAdminDate } from '@/utilities/formatAdminDate'

import './index.scss'

type ReviewItem = {
  canonicalPath: string
  editPath: string
  id: number | string
  label: string
  locale: string
  path: string
  previewOrigin?: string
  previewPath?: string | null
  publicPath?: string
  siteCode: string
  status?: string
  type: 'page' | 'post'
  updatedAt?: string
}

type ReviewSite = {
  children: ReviewItem[]
  code?: string
  id: number | string
  label: string
  pathPrefix: string
}

type ReviewResponse = {
  generatedAt?: string
  message?: string
  sourceErrors?: Array<'pages' | 'posts'>
  sites?: ReviewSite[]
}

type ReviewCheckKey = 'content' | 'preview' | 'scope' | 'seo'

type ReviewCheckState = Partial<Record<ReviewCheckKey, boolean>>

const baseClass = 'site-review'

const typeLabel: Record<ReviewItem['type'], string> = {
  page: 'Trang',
  post: 'Bài viết',
}

const statusLabel = (status?: string) => {
  if (status === 'draft') return 'Nháp'
  if (status === 'published') return 'Đã xuất bản'
  return 'Không rõ'
}

const itemKey = (item: Pick<ReviewItem, 'id' | 'siteCode' | 'type'>) =>
  `${item.siteCode}:${item.type}:${String(item.id)}`

const securePreviewURL = (path?: null | string): string => {
  if (typeof window === 'undefined' || !path || !path.startsWith('/') || path.startsWith('//')) {
    return ''
  }

  try {
    const url = new URL(path, window.location.origin)
    const collection = url.searchParams.get('collection')
    if (
      url.origin !== window.location.origin ||
      url.pathname !== '/next/preview' ||
      (collection !== 'pages' && collection !== 'posts') ||
      !url.searchParams.get('id') ||
      !url.searchParams.get('path') ||
      !url.searchParams.get('locale') ||
      url.searchParams.has('handoff')
    ) {
      return ''
    }

    return url.toString()
  } catch {
    return ''
  }
}

type PreviewReadyMessage = {
  collection: 'pages' | 'posts'
  documentID: string
  locale: string
  mode: 'draft' | 'published'
  path: string
  siteCode: string
  type: 'wingstravel:preview-ready'
}

const parsePreviewReadyMessage = (value: unknown): PreviewReadyMessage | null => {
  if (!value || typeof value !== 'object') return null

  const message = value as Record<string, unknown>
  if (
    message.type !== 'wingstravel:preview-ready' ||
    (message.collection !== 'pages' && message.collection !== 'posts') ||
    typeof message.documentID !== 'string' ||
    typeof message.locale !== 'string' ||
    (message.mode !== 'draft' && message.mode !== 'published') ||
    typeof message.path !== 'string' ||
    typeof message.siteCode !== 'string'
  ) {
    return null
  }

  return message as PreviewReadyMessage
}

const previewHandshakeTimeout = 15_000

export default function SiteReviewView() {
  const [sites, setSites] = useState<ReviewSite[]>([])
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null)
  const [filter, setFilter] = useState('')
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sourceErrors, setSourceErrors] = useState<Array<'pages' | 'posts'>>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [previewState, setPreviewState] = useState<'error' | 'loading' | 'ready'>('ready')
  const [previewKey, setPreviewKey] = useState(0)
  const [checklistByItem, setChecklistByItem] = useState<Record<string, ReviewCheckState>>({})

  const loadReview = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setNotice(null)

    try {
      const response = await fetch('/api/site-review', { credentials: 'include' })
      const data = (await response.json().catch(() => null)) as ReviewResponse | null

      if (!response.ok) {
        setError(
          response.status === 401 || response.status === 403
            ? 'Bạn không có quyền xem Site Review.'
            : data?.message || 'Không tải được danh sách site/page.',
        )
        return
      }

      const nextSites = data?.sites ?? []
      setSites(nextSites)
      setSelectedItem((current) => {
        const available = nextSites.flatMap((site) => site.children)
        const retained = current
          ? available.find((item) => itemKey(item) === itemKey(current))
          : undefined
        return retained ?? available[0] ?? null
      })
      setGeneratedAt(data?.generatedAt ?? null)
      setSourceErrors(data?.sourceErrors ?? [])
    } catch {
      setError('Không tải được Site Review do lỗi kết nối. Hãy thử lại.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadReview()
  }, [loadReview])

  const query = filter.trim().toLowerCase()
  const filteredSites = useMemo(
    () =>
      sites
        .map((site) => {
          const siteMatches = [site.label, site.code, site.pathPrefix]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(query)
          const children = site.children.filter((item) => {
            if (!query || siteMatches) return true
            return [item.label, item.path, item.type, item.status]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(query)
          })

          return { ...site, children }
        })
        .filter((site) => site.children.length > 0 || !query),
    [query, sites],
  )

  // The browser only receives a same-origin initializer. That endpoint resolves
  // the document, locale, site and allowlisted tenant destination on the server
  // before POSTing the short-lived handoff to the child origin.
  const selectedURL = securePreviewURL(selectedItem?.previewPath)
  const selectedDisplayURL = selectedItem
    ? selectedItem.previewOrigin
      ? `${selectedItem.previewOrigin}${selectedItem.publicPath || selectedItem.canonicalPath}`
      : selectedItem.path
    : ''
  const selectedPreviewKey = selectedItem
    ? JSON.stringify({
        canonicalPath: selectedItem.canonicalPath,
        id: String(selectedItem.id),
        locale: selectedItem.locale,
        path: selectedItem.previewPath,
        siteCode: selectedItem.siteCode,
        type: selectedItem.type,
      })
    : null
  const activePreviewKeyRef = useRef<string | null>(null)
  activePreviewKeyRef.current = selectedPreviewKey
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const totalItems = sites.reduce((total, site) => total + site.children.length, 0)
  const selectedChecklist = selectedItem ? checklistByItem[itemKey(selectedItem)] || {} : {}
  const checklistItems: Array<{
    checked: boolean
    description: string
    disabled: boolean
    key: ReviewCheckKey
    label: string
  }> = selectedItem
    ? [
        {
          checked: Boolean(
            selectedItem.siteCode && selectedItem.locale && selectedItem.canonicalPath,
          ),
          description: 'Site và locale đã được API xác định trong phạm vi tài khoản.',
          disabled: true,
          key: 'scope',
          label: 'Đúng site & locale',
        },
        {
          checked: Boolean(selectedURL && previewState === 'ready'),
          description: 'Iframe đã xác nhận đúng tài liệu, locale, site và chế độ preview.',
          disabled: true,
          key: 'preview',
          label: 'Preview hoạt động',
        },
        {
          checked: Boolean(selectedChecklist.content),
          description: 'Người rà soát kiểm tra nội dung, liên kết và CTA trên bản preview.',
          disabled: false,
          key: 'content',
          label: 'Nội dung đã kiểm tra',
        },
        {
          checked: Boolean(selectedChecklist.seo),
          description: 'Người rà soát kiểm tra tiêu đề, mô tả, URL và metadata cần thiết.',
          disabled: false,
          key: 'seo',
          label: 'SEO đã kiểm tra',
        },
      ]
    : []
  const checklistCompleted = checklistItems.filter((item) => item.checked).length

  const setManualChecklist = (key: ReviewCheckKey, checked: boolean) => {
    if (!selectedItem) return

    const keyForItem = itemKey(selectedItem)
    setChecklistByItem((current) => ({
      ...current,
      [keyForItem]: {
        ...(current[keyForItem] || {}),
        [key]: checked,
      },
    }))
  }

  useEffect(() => {
    if (
      selectedItem &&
      !filteredSites.some((site) =>
        site.children.some((item) => itemKey(item) === itemKey(selectedItem)),
      )
    ) {
      setSelectedItem(null)
    }
  }, [filteredSites, selectedItem])

  useEffect(() => {
    if (!selectedItem || !selectedURL || !selectedPreviewKey) {
      setPreviewState(selectedItem ? 'error' : 'ready')
      return
    }

    let active = true
    setPreviewState('loading')
    const expectedOrigin = selectedItem.previewOrigin || window.location.origin
    const postPreviewPing = () => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'wingstravel:preview-ping' },
        expectedOrigin,
      )
    }
    const pingID = window.setInterval(postPreviewPing, 500)
    // Also ping as soon as the iframe has a document. This covers the case
    // where the child posts its first ready message before this effect has
    // attached the parent's message listener.
    postPreviewPing()

    const timeoutID = window.setTimeout(() => {
      if (active && activePreviewKeyRef.current === selectedPreviewKey) {
        setPreviewState('error')
      }
    }, previewHandshakeTimeout)

    const onMessage = (event: MessageEvent<unknown>) => {
      if (
        !active ||
        activePreviewKeyRef.current !== selectedPreviewKey ||
        event.source !== iframeRef.current?.contentWindow
      ) {
        return
      }

      const message = parsePreviewReadyMessage(event.data)
      const expectedCollection = selectedItem.type === 'page' ? 'pages' : 'posts'
      const expectedMode = selectedItem.status === 'draft' ? 'draft' : 'published'

      if (
        !message ||
        event.origin !== expectedOrigin ||
        message.collection !== expectedCollection ||
        message.documentID !== String(selectedItem.id) ||
        message.locale !== selectedItem.locale ||
        message.mode !== expectedMode ||
        message.path !== selectedItem.canonicalPath ||
        message.siteCode !== selectedItem.siteCode
      ) {
        return
      }

      window.clearTimeout(timeoutID)
      window.clearInterval(pingID)
      setPreviewState('ready')
    }

    window.addEventListener('message', onMessage)

    return () => {
      active = false
      window.clearTimeout(timeoutID)
      window.clearInterval(pingID)
      window.removeEventListener('message', onMessage)
    }
  }, [selectedItem, selectedPreviewKey, selectedURL, previewKey])

  const copyURL = async () => {
    if (!selectedURL) return

    try {
      await navigator.clipboard.writeText(selectedURL)
      setNotice('Đã sao chép URL handoff preview (không chứa token).')
    } catch {
      setNotice('Không thể sao chép URL. Hãy sao chép thủ công từ dòng địa chỉ preview.')
    }
  }

  return (
    <AdminStandaloneShell>
      <main className={baseClass} data-od-id="site-review-main">
        <AdminThemeBootstrap />
        <aside className={`${baseClass}__sidebar`} data-od-id="site-review-sidebar">
        <header className={`${baseClass}__head`}>
          <div>
            <nav className={`${baseClass}__breadcrumbs`} aria-label="Điều hướng admin">
              <Link href="/admin">Bảng điều hành admin</Link>
              <span aria-hidden="true">/</span>
              <span>Rà soát site</span>
            </nav>
            <p>WingsGroup CMS</p>
            <h1>Rà soát site</h1>
            <span>
              Danh sách chỉ gồm site, page và post mà tài khoản hiện tại được quyền đọc trong
              Payload.
            </span>
          </div>
          <div className={`${baseClass}__head-actions`}>
            <Link className={`${baseClass}__admin-home`} href="/admin">
              ← Về admin
            </Link>
            <Link href="/admin/console">Console</Link>
          </div>
        </header>

        <div className={`${baseClass}__tools`}>
          <input
            aria-label="Tìm trong Site Review"
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Tìm site, page, post hoặc URL..."
            type="search"
            value={filter}
          />
          <div>
            <strong>{totalItems}</strong>
            <span>mục có thể rà soát</span>
          </div>
        </div>

        <nav
          aria-label="Cây site và nội dung"
          className={`${baseClass}__tree`}
          data-od-id="site-review-tree"
        >
          {isLoading ? <p>Đang tải danh sách...</p> : null}
          {error ? (
            <div className={`${baseClass}__error`} role="alert">
              <p>{error}</p>
              <button onClick={() => void loadReview()} type="button">
                Thử lại
              </button>
            </div>
          ) : null}
          {sourceErrors.length > 0 ? (
            <p className={`${baseClass}__error`} role="status">
              Không tải được{' '}
              {sourceErrors
                .map((source) => typeLabel[source === 'pages' ? 'page' : 'post'])
                .join(' và ')}
              . Các dữ liệu còn lại vẫn có thể rà soát.
            </p>
          ) : null}
          {!isLoading && !error && sites.length === 0 ? (
            <p>Chưa có site nào trong phạm vi được phân quyền.</p>
          ) : null}
          {!isLoading && !error && sites.length > 0 && totalItems === 0 ? (
            <p>Các site được phân quyền chưa có page hoặc bài viết để rà soát.</p>
          ) : null}
          {!isLoading &&
          !error &&
          sites.length > 0 &&
          totalItems > 0 &&
          filteredSites.length === 0 ? (
            <p>Không tìm thấy mục phù hợp với bộ lọc hiện tại.</p>
          ) : null}
          {filteredSites.map((site) => (
            <details key={site.id} open>
              <summary>
                <span>{site.label}</span>
                <small>{site.children.length}</small>
              </summary>
              {site.children.map((item) => (
                <button
                  className={
                    selectedItem && itemKey(selectedItem) === itemKey(item)
                      ? `${baseClass}__node ${baseClass}__node--active`
                      : `${baseClass}__node`
                  }
                  key={`${item.siteCode}-${item.type}-${item.id}`}
                  onClick={() => setSelectedItem(item)}
                  type="button"
                >
                  <span>{item.label}</span>
                  <strong>{typeLabel[item.type]}</strong>
                  <small>{item.path}</small>
                </button>
              ))}
            </details>
          ))}
        </nav>
        </aside>

        <section className={`${baseClass}__viewer`} data-od-id="site-review-viewer">
        <div className={`${baseClass}__bar`}>
          <div>
            <p>
              {selectedItem
                ? `${typeLabel[selectedItem.type]} · ${statusLabel(selectedItem.status)} · Locale ${selectedItem.locale}`
                : 'Chưa chọn'}
            </p>
            <h2>{selectedItem?.label || 'Chọn một trang để preview'}</h2>
            <span>{selectedDisplayURL || 'Danh sách sẽ hiện sau khi tải xong.'}</span>
          </div>
          <div className={`${baseClass}__actions`}>
            {selectedItem ? <Link href={selectedItem.editPath}>Mở trong Payload</Link> : null}
            {selectedURL ? (
              <a href={selectedURL} rel="noreferrer" target="_blank">
                Mở tab mới
              </a>
            ) : null}
            <button disabled={!selectedURL} onClick={copyURL} type="button">
              Sao chép URL
            </button>
            {selectedItem ? (
              <button
                onClick={() => {
                  setPreviewState('loading')
                  setPreviewKey((current) => current + 1)
                }}
                type="button"
              >
                Tải lại preview
              </button>
            ) : null}
          </div>
        </div>

        <div className={`${baseClass}__workspace`} data-od-id="site-review-workspace">
          <div className={`${baseClass}__frame-wrap`} data-od-id="site-review-frame">
            {selectedURL ? (
              <>
                {previewState === 'loading' ? <p role="status">Đang tải preview...</p> : null}
                {previewState === 'error' ? (
                  <div className={`${baseClass}__error`} role="alert">
                    <p>
                      Không nhận được xác nhận preview trong thời gian chờ. Handoff có thể đã hết
                      hạn hoặc trình duyệt đang chặn iframe cross-origin.
                    </p>
                    <p>Hãy bấm “Tải lại preview” để cấp grant mới hoặc “Mở tab mới” để tiếp tục.</p>
                  </div>
                ) : null}
                <iframe
                  key={`${selectedPreviewKey}-${previewKey}`}
                  onError={(event) => {
                    if (
                      event.currentTarget === iframeRef.current &&
                      activePreviewKeyRef.current === selectedPreviewKey
                    ) {
                      setPreviewState('error')
                    }
                  }}
                  onLoad={() => {
                    iframeRef.current?.contentWindow?.postMessage(
                      { type: 'wingstravel:preview-ping' },
                      selectedItem?.previewOrigin || window.location.origin,
                    )
                  }}
                  ref={iframeRef}
                  src={selectedURL}
                  title="Xem trước trang WingsGroup đang chọn"
                />
              </>
            ) : selectedItem ? (
              <div className={`${baseClass}__empty`} role="alert">
                Site này chưa có locale public hợp lệ để tạo preview. Hãy tải lại danh sách hoặc mở
                tài liệu trong Payload.
              </div>
            ) : (
              <div className={`${baseClass}__empty`}>
                Chọn một mục trong danh sách để xem preview. Khu vực này chỉ đọc và không thay đổi
                nội dung.
              </div>
            )}
          </div>

          <aside
            aria-label="Checklist xuất bản"
            className={`${baseClass}__checklist`}
            data-od-id="site-review-checklist"
          >
            <div className={`${baseClass}__checklist-head`}>
              <div>
                <p>Kiểm tra trước publish</p>
                <h3>Checklist rà soát</h3>
              </div>
              <strong aria-live="polite">
                {checklistCompleted}/{checklistItems.length || 4}
              </strong>
            </div>
            {selectedItem ? (
              <ol>
                {checklistItems.map((item) => (
                  <li
                    className={item.checked ? `${baseClass}__check--complete` : ''}
                    key={item.key}
                  >
                    <label>
                      <input
                        aria-label={`${item.label}: ${item.checked ? 'Đã hoàn tất' : 'Chưa hoàn tất'}`}
                        checked={item.checked}
                        disabled={item.disabled}
                        onChange={(event) => setManualChecklist(item.key, event.target.checked)}
                        type="checkbox"
                      />
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.description}</small>
                      </span>
                    </label>
                    <em>
                      {item.checked ? 'Đã kiểm tra' : item.disabled ? 'Đang chờ' : 'Cần kiểm tra'}
                    </em>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={`${baseClass}__empty`}>Chọn một mục để bắt đầu checklist.</p>
            )}
            <p className={`${baseClass}__checklist-note`}>
              Checklist này hỗ trợ rà soát trong phiên hiện tại; trạng thái publish vẫn do Payload
              và quyền của người duyệt quyết định.
            </p>
          </aside>
        </div>

        {notice ? (
          <p className={`${baseClass}__foot`} role="status">
            {notice}
          </p>
        ) : null}

        {generatedAt ? (
          <footer className={`${baseClass}__foot`}>
            Dữ liệu tải lúc {formatAdminDate(generatedAt)}
          </footer>
        ) : null}
        </section>
      </main>
    </AdminStandaloneShell>
  )
}
