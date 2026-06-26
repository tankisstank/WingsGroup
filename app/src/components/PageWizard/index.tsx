'use client'

import Link from 'next/link'
import React, { useEffect, useMemo, useState } from 'react'

import AdminThemeBootstrap from '@/components/AdminThemeBootstrap'
import {
  layoutPresetDefinitions,
  type LayoutPresetCategory,
  type LayoutPresetKey,
} from '@/utilities/layoutPresets'

import './index.scss'

type SiteOption = {
  code?: string
  id: number | string
  name?: string
}

const baseClass = 'page-wizard'

const categoryLabels: Record<LayoutPresetCategory, string> = {
  core: 'Trang nền tảng',
  campaign: 'Landing / campaign',
  content: 'Nội dung / editorial',
  lead: 'Lead capture',
  service: 'Dịch vụ / sản phẩm',
}

const templateIconLabels: Record<LayoutPresetCategory, string> = {
  campaign: 'C',
  content: 'B',
  core: 'C',
  lead: 'F',
  service: 'T',
}

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export default function PageWizardView() {
  const [sites, setSites] = useState<SiteOption[]>([])
  const [siteID, setSiteID] = useState('')
  const [preset, setPreset] = useState<LayoutPresetKey>('homepage-editorial')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [slug, setSlug] = useState('')
  const [isSlugTouched, setIsSlugTouched] = useState(false)
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSites = async () => {
      const response = await fetch('/api/sites?depth=0&limit=100', {
        credentials: 'include',
      })

      if (!response.ok) {
        setError('Không tải được danh sách site. Hãy thử reload lại trang.')
        return
      }

      const data = (await response.json()) as { docs?: SiteOption[] }
      const siteDocs = data.docs ?? []

      setSites(siteDocs)
      setSiteID((current) => current || String(siteDocs[0]?.id ?? ''))
    }

    void loadSites()
  }, [])

  useEffect(() => {
    if (!isSlugTouched) {
      setSlug(slugify(title))
    }
  }, [isSlugTouched, title])

  const selectedPreset = useMemo(
    () => layoutPresetDefinitions.find((item) => item.key === preset) ?? layoutPresetDefinitions[0],
    [preset],
  )
  const groupedPresets = useMemo(
    () =>
      (['core', 'service', 'campaign', 'lead', 'content'] as const).map((category) => ({
        category,
        items: layoutPresetDefinitions.filter((item) => item.category === category),
      })),
    [],
  )
  const selectedSite = sites.find((site) => String(site.id) === siteID)
  const canContinueStepOne = Boolean(siteID && preset)
  const canCreate = Boolean(siteID && preset && title.trim() && slug.trim())

  const createPage = async () => {
    if (!canCreate) {
      setError('Vui lòng nhập đủ site, loại trang, tiêu đề và đường dẫn.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/page-wizard', {
        body: JSON.stringify({
          site: siteID,
          slug,
          summary,
          preset,
          title,
        }),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      const data = (await response.json()) as { id?: number | string; message?: string }

      if (!response.ok || !data.id) {
        throw new Error(data.message || 'Không tạo được trang nháp.')
      }

      window.location.href = `/admin/collections/pages/${data.id}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được trang nháp.')
      setIsSubmitting(false)
    }
  }

  return (
    <main className={baseClass}>
      <AdminThemeBootstrap />
      <div className={`${baseClass}__shell`}>
        <header className={`${baseClass}__header`}>
          <div>
            <nav className={`${baseClass}__breadcrumbs`} aria-label="Điều hướng admin">
              <Link href="/admin">Bảng điều hành admin</Link>
              <span aria-hidden="true">/</span>
              <span>Tạo trang nhanh</span>
            </nav>
            <p>WingsGroup CMS</p>
            <h1>Tạo trang nhanh</h1>
            <span>
              Dựng trang nháp theo từng bước. Sau khi tạo, bạn sẽ được chuyển sang màn chỉnh sửa
              đầy đủ để kiểm tra nội dung và preview trước khi publish.
            </span>
          </div>
          <div className={`${baseClass}__header-actions`}>
            <Link className={`${baseClass}__admin-home`} href="/admin">
              ← Về admin
            </Link>
            <Link href="/admin/console">Quay lại console</Link>
          </div>
        </header>

        <ol className={`${baseClass}__steps`}>
          {['Chọn phạm vi', 'Nhập nội dung', 'Kiểm tra'].map((label, index) => (
            <li className={step === index + 1 ? `${baseClass}__step--active` : ''} key={label}>
              <span>{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>

        {error ? <div className={`${baseClass}__error`}>{error}</div> : null}

        {step === 1 ? (
          <section className={`${baseClass}__panel`}>
            <h2>Trang này thuộc site nào?</h2>
            <label>
              Site
              <select onChange={(event) => setSiteID(event.target.value)} value={siteID}>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name || site.code || `Site ${site.id}`}
                  </option>
                ))}
              </select>
            </label>

            <h2>Chọn loại trang</h2>
            <div className={`${baseClass}__selection-layout`}>
              <div className={`${baseClass}__template-groups`}>
                {groupedPresets.map((group) => (
                  <section key={group.category}>
                    <h3>{categoryLabels[group.category]}</h3>
                    <div className={`${baseClass}__templates`}>
                      {group.items.map((item) => (
                        <button
                          aria-pressed={preset === item.key}
                          className={preset === item.key ? `${baseClass}__template--selected` : ''}
                          key={item.key}
                          onClick={() => setPreset(item.key)}
                          type="button"
                        >
                          <span className={`${baseClass}__template-icon`} aria-hidden="true">
                            {templateIconLabels[item.category]}
                          </span>
                          <strong>{item.label}</strong>
                          <span>{item.description}</span>
                          <span
                            aria-hidden="true"
                            className={`${baseClass}__preset-preview ${baseClass}__preset-preview--${item.preview.accent}`}
                          >
                            <i />
                            <i />
                            <i />
                          </span>
                          <small>{item.preview.sections.join(' • ')}</small>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <aside className={`${baseClass}__preset-summary`}>
                <span>Đang chọn</span>
                <h3>{selectedPreset.label}</h3>
                <p>{selectedPreset.description}</p>
                <ol>
                  {selectedPreset.preview.sections.map((section) => (
                    <li key={section}>{section}</li>
                  ))}
                </ol>
              </aside>
            </div>

            <div className={`${baseClass}__actions`}>
              <button disabled={!canContinueStepOne} onClick={() => setStep(2)} type="button">
                Tiếp tục
              </button>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className={`${baseClass}__panel`}>
            <h2>Nội dung cơ bản</h2>
            <label>
              Tiêu đề trang
              <input
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ví dụ: Tour Nhật Bản mùa thu"
                value={title}
              />
            </label>
            <label>
              Đường dẫn
              <input
                onChange={(event) => {
                  setIsSlugTouched(true)
                  setSlug(slugify(event.target.value))
                }}
                placeholder="tour-nhat-ban-mua-thu"
                value={slug}
              />
            </label>
            <label>
              Mô tả ngắn
              <textarea
                onChange={(event) => setSummary(event.target.value)}
                placeholder="Viết 1-2 câu giúp người đọc hiểu trang này dùng để làm gì."
                rows={5}
                value={summary}
              />
            </label>

            <div className={`${baseClass}__actions`}>
              <button onClick={() => setStep(1)} type="button">
                Quay lại
              </button>
              <button disabled={!title.trim() || !slug.trim()} onClick={() => setStep(3)} type="button">
                Kiểm tra
              </button>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className={`${baseClass}__panel`}>
            <h2>Kiểm tra trước khi tạo</h2>
            <dl className={`${baseClass}__review`}>
              <div>
                <dt>Site</dt>
                <dd>{selectedSite?.name || selectedSite?.code || 'Chưa chọn'}</dd>
              </div>
              <div>
                <dt>Loại trang</dt>
                <dd>{selectedPreset.label}</dd>
              </div>
              <div>
                <dt>Cấu trúc gợi ý</dt>
                <dd>{selectedPreset.preview.sections.join(' • ')}</dd>
              </div>
              <div>
                <dt>Tiêu đề</dt>
                <dd>{title || 'Chưa nhập'}</dd>
              </div>
              <div>
                <dt>Đường dẫn</dt>
                <dd>/{slug || 'chua-co-duong-dan'}</dd>
              </div>
            </dl>
            <p className={`${baseClass}__note`}>
              Trang sẽ được tạo ở trạng thái nháp. Editor có thể tiếp tục chỉnh sửa, site manager
              hoặc super admin sẽ duyệt publish.
            </p>

            <div className={`${baseClass}__actions`}>
              <button disabled={isSubmitting} onClick={() => setStep(2)} type="button">
                Sửa lại
              </button>
              <button disabled={!canCreate || isSubmitting} onClick={createPage} type="button">
                {isSubmitting ? 'Đang tạo...' : 'Tạo trang nháp'}
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  )
}
