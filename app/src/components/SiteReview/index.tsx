'use client'

import Link from 'next/link'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import AdminThemeBootstrap from '@/components/AdminThemeBootstrap'

import './index.scss'

type ReviewItem = {
  editPath: string
  id: number | string
  label: string
  path: string
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

const absoluteURL = (path: string) => {
  if (/^https?:\/\//.test(path)) return path
  return new URL(path, window.location.origin).toString()
}

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
        return current &&
          available.some(
            (item) => item.type === current.type && String(item.id) === String(current.id),
          )
          ? current
          : (available[0] ?? null)
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

  const selectedURL = selectedItem ? absoluteURL(selectedItem.path) : ''
  const totalItems = sites.reduce((total, site) => total + site.children.length, 0)

  useEffect(() => {
    if (
      selectedItem &&
      !filteredSites.some((site) =>
        site.children.some(
          (item) => item.type === selectedItem.type && String(item.id) === String(selectedItem.id),
        ),
      )
    ) {
      setSelectedItem(null)
    }
  }, [filteredSites, selectedItem])

  const copyURL = async () => {
    if (!selectedURL) return

    try {
      await navigator.clipboard.writeText(selectedURL)
      setNotice('Đã sao chép URL preview.')
    } catch {
      setNotice('Không thể sao chép URL. Hãy sao chép thủ công từ dòng địa chỉ preview.')
    }
  }

  return (
    <main className={baseClass}>
      <AdminThemeBootstrap />
      <aside className={`${baseClass}__sidebar`}>
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

        <nav className={`${baseClass}__tree`} aria-label="Cây site và nội dung">
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
                    selectedItem?.type === item.type && String(selectedItem.id) === String(item.id)
                      ? `${baseClass}__node ${baseClass}__node--active`
                      : `${baseClass}__node`
                  }
                  key={`${item.type}-${item.id}`}
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

      <section className={`${baseClass}__viewer`}>
        <div className={`${baseClass}__bar`}>
          <div>
            <p>
              {selectedItem
                ? `${typeLabel[selectedItem.type]} · ${statusLabel(selectedItem.status)}`
                : 'Chưa chọn'}
            </p>
            <h2>{selectedItem?.label || 'Chọn một trang để preview'}</h2>
            <span>{selectedURL || 'Danh sách sẽ hiện sau khi tải xong.'}</span>
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

        <div className={`${baseClass}__frame-wrap`}>
          {selectedURL ? (
            <>
              {previewState === 'loading' ? <p role="status">Đang tải preview...</p> : null}
              {previewState === 'error' ? (
                <p className={`${baseClass}__error`} role="alert">
                  Không tải được preview. Hãy thử tải lại hoặc mở ở tab mới.
                </p>
              ) : null}
              <iframe
                key={`${selectedItem?.type}-${selectedItem?.id}-${previewKey}`}
                onError={() => setPreviewState('error')}
                onLoad={() => setPreviewState('ready')}
                src={selectedURL}
                title="Xem trước trang WingsGroup đang chọn"
              />
            </>
          ) : (
            <div className={`${baseClass}__empty`}>
              Chọn một mục trong danh sách để xem preview. Khu vực này chỉ đọc và không thay đổi nội
              dung.
            </div>
          )}
        </div>

        {notice ? (
          <p className={`${baseClass}__foot`} role="status">
            {notice}
          </p>
        ) : null}

        {generatedAt ? (
          <footer className={`${baseClass}__foot`}>
            Dữ liệu tải lúc{' '}
            {new Intl.DateTimeFormat('vi-VN', {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: 'Asia/Bangkok',
            }).format(new Date(generatedAt))}
          </footer>
        ) : null}
      </section>
    </main>
  )
}
