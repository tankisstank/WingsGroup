'use client'

import Link from 'next/link'
import React, { useEffect, useMemo, useState } from 'react'

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
  sites?: ReviewSite[]
}

const baseClass = 'site-review'

const typeLabel: Record<ReviewItem['type'], string> = {
  page: 'Page',
  post: 'Post',
}

const statusLabel = (status?: string) => {
  if (status === 'draft') return 'Nháp'
  if (status === 'published') return 'Published'
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
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadReview = async () => {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/site-review', {
        credentials: 'include',
      })
      const data = (await response.json().catch(() => null)) as ReviewResponse | null

      if (!response.ok) {
        setError(data?.message || 'Không tải được danh sách site/page.')
        setIsLoading(false)
        return
      }

      const nextSites = data?.sites ?? []
      const firstItem = nextSites.flatMap((site) => site.children)[0] ?? null

      setSites(nextSites)
      setSelectedItem((current) => current || firstItem)
      setGeneratedAt(data?.generatedAt ?? null)
      setIsLoading(false)
    }

    void loadReview()
  }, [])

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

  const copyURL = async () => {
    if (!selectedURL) return
    await navigator.clipboard.writeText(selectedURL).catch(() => undefined)
  }

  return (
    <main className={baseClass}>
      <aside className={`${baseClass}__sidebar`}>
        <header className={`${baseClass}__head`}>
          <div>
            <p>WingsGroup CMS</p>
            <h1>Site review</h1>
            <span>
              Danh sách chỉ gồm site, page và post mà tài khoản hiện tại được quyền đọc trong
              Payload.
            </span>
          </div>
          <Link href="/admin/console">Console</Link>
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

        <nav className={`${baseClass}__tree`} aria-label="Site page tree">
          {isLoading ? <p>Đang tải danh sách...</p> : null}
          {error ? <p className={`${baseClass}__error`}>{error}</p> : null}
          {!isLoading && !error && filteredSites.length === 0 ? <p>Không tìm thấy mục phù hợp.</p> : null}
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
            <p>{selectedItem ? `${typeLabel[selectedItem.type]} · ${statusLabel(selectedItem.status)}` : 'Chưa chọn'}</p>
            <h2>{selectedItem?.label || 'Chọn một trang để preview'}</h2>
            <span>{selectedURL || 'Danh sách sẽ hiện sau khi tải xong.'}</span>
          </div>
          <div className={`${baseClass}__actions`}>
            {selectedItem ? <Link href={selectedItem.editPath}>Edit</Link> : null}
            {selectedURL ? (
              <a href={selectedURL} rel="noreferrer" target="_blank">
                Mở tab mới
              </a>
            ) : null}
            <button disabled={!selectedURL} onClick={copyURL} type="button">
              Copy URL
            </button>
            {selectedItem ? (
              <button
                onClick={() => {
                  const current = selectedItem
                  setSelectedItem(null)
                  window.setTimeout(() => setSelectedItem(current), 0)
                }}
                type="button"
              >
                Reload preview
              </button>
            ) : null}
          </div>
        </div>

        <div className={`${baseClass}__frame-wrap`}>
          {selectedURL ? (
            <iframe key={`${selectedItem?.type}-${selectedItem?.id}`} src={selectedURL} title="Preview selected WingsGroup page" />
          ) : (
            <div className={`${baseClass}__empty`}>Chưa có trang để preview.</div>
          )}
        </div>

        {generatedAt ? (
          <footer className={`${baseClass}__foot`}>
            Dữ liệu tải lúc {new Intl.DateTimeFormat('vi-VN', {
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
