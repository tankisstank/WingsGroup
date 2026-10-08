'use client'

import Link from 'next/link'
import React, { useEffect, useMemo, useState } from 'react'

import AdminStandaloneShell from '@/components/AdminStandaloneShell'
import AdminThemeBootstrap from '@/components/AdminThemeBootstrap'
import {
  cmsEnabledLocaleCodes,
  cmsEnabledLocaleMetadata,
  isSupportedLocale,
  type SupportedLocaleCode,
} from '@/utilities/locales'
import {
  isLayoutPresetKey,
  layoutPresetDefinitions,
  type LayoutPresetCategory,
  type LayoutPresetKey,
} from '@/utilities/layoutPresets'

import './index.scss'

type SiteOption = {
  code?: string
  id: number | string
  name?: string
  defaultLocale?: null | string
  supportedLocales?: null | string[]
}

const baseClass = 'page-wizard'

const categoryLabels: Record<LayoutPresetCategory, string> = {
  core: 'Trang nền tảng',
  campaign: 'Landing / chiến dịch',
  content: 'Nội dung / biên tập',
  lead: 'Thu thập khách hàng tiềm năng (Lead capture)',
  service: 'Dịch vụ / sản phẩm',
}

const templateIconLabels: Record<LayoutPresetCategory, string> = {
  campaign: 'C',
  content: 'B',
  core: 'C',
  lead: 'F',
  service: 'T',
}

const presetLabels: Record<LayoutPresetKey, string> = {
  'campaign-launch': 'Ra mắt chiến dịch (Campaign launch)',
  'contact-support': 'Liên hệ và hỗ trợ (Contact and support)',
  'destination-showcase': 'Giới thiệu điểm đến (Destination showcase)',
  'homepage-editorial': 'Trang chủ biên tập (Homepage editorial)',
  'homepage-service-hub': 'Trang chủ trung tâm dịch vụ (Homepage service hub)',
  'lead-capture': 'Thu thập khách hàng tiềm năng (Lead capture)',
  'long-form-guide': 'Hướng dẫn chuyên sâu (Long-form guide)',
  'magazine-content-hub': 'Trung tâm nội dung tạp chí (Magazine and content hub)',
  'pricing-package-comparison': 'So sánh giá và gói dịch vụ (Pricing and package comparison)',
  'service-detail': 'Chi tiết dịch vụ (Service detail)',
  'social-proof': 'Bằng chứng uy tín (Trust and social proof)',
  'tour-conversion': 'Chuyển đổi tour (Tour conversion)',
  'wingsside-inbound-homepage': 'Trang chủ inbound WingSide (WingSide inbound homepage)',
}

const sectionLabels: Record<string, string> = {
  'Alternating features': 'Tính năng xen kẽ',
  Benefits: 'Lợi ích',
  'Bento benefits': 'Lợi ích dạng bento',
  'Bento services': 'Dịch vụ dạng bento',
  Comparison: 'So sánh',
  'Comparison matrix': 'Ma trận so sánh',
  'Editorial split': 'Khối biên tập tách đôi',
  FAQ: 'Câu hỏi thường gặp',
  Features: 'Tính năng',
  Form: 'Biểu mẫu',
  'Hero centered': 'Hero căn giữa',
  'Hero cinematic': 'Hero điện ảnh',
  'Hero editorial': 'Hero biên tập',
  'Hero layered': 'Hero xếp lớp',
  'Hero low impact': 'Hero gọn nhẹ',
  'Hero mesh': 'Hero lưới chuyển sắc',
  'Hero split': 'Hero tách đôi',
  'Logo proof': 'Logo đối tác',
  Media: 'Media',
  'Magazine archive': 'Kho nội dung tạp chí',
  'Sample itineraries': 'Lịch trình mẫu',
  'Sidebar TOC': 'Mục lục bên cạnh',
  'Social proof': 'Bằng chứng xã hội',
  'Social wall': 'Tường phản hồi',
  Stats: 'Số liệu',
  'Sticky features': 'Tính năng ghim',
  'Support channels': 'Kênh hỗ trợ',
  Testimonials: 'Khách hàng đánh giá',
  'Tier cards': 'Thẻ hạng dịch vụ',
  'Value props': 'Giá trị nổi bật',
  'Featured quote': 'Trích dẫn nổi bật',
  Destinations: 'Điểm đến',
  Stories: 'Câu chuyện',
  CTA: 'Kêu gọi hành động',
}

import { vietnameseSlugify } from '@/utilities/slugify'

const displayPresetLabel = (presetKey: LayoutPresetKey) => presetLabels[presetKey]
const displaySections = (sections: readonly string[]) =>
  sections.map((section) => sectionLabels[section] || section)

const slugify = (value: string) => vietnameseSlugify(value)

const isCmsLocale = (value: unknown): value is SupportedLocaleCode =>
  typeof value === 'string' && isSupportedLocale(value) && cmsEnabledLocaleCodes.includes(value)

const getAvailableLocales = (site?: SiteOption): typeof cmsEnabledLocaleMetadata => {
  const supportedLocales = site?.supportedLocales?.filter(isCmsLocale) ?? []

  if (supportedLocales.length === 0) {
    return cmsEnabledLocaleMetadata
  }

  const allowedLocales = new Set(supportedLocales)

  return cmsEnabledLocaleMetadata.filter((locale) => allowedLocales.has(locale.code))
}

const getPreferredLocale = (
  site: SiteOption | undefined,
  requestedLocale: string | null,
  availableLocales: typeof cmsEnabledLocaleMetadata,
): SupportedLocaleCode => {
  if (
    isCmsLocale(requestedLocale) &&
    availableLocales.some((locale) => locale.code === requestedLocale)
  ) {
    return requestedLocale
  }

  if (
    isCmsLocale(site?.defaultLocale) &&
    availableLocales.some((locale) => locale.code === site.defaultLocale)
  ) {
    return site.defaultLocale
  }

  return availableLocales[0]?.code ?? 'vi'
}

export default function PageWizardView() {
  const [sites, setSites] = useState<SiteOption[]>([])
  const [siteID, setSiteID] = useState('')
  const [locale, setLocale] = useState<SupportedLocaleCode>('vi')
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
      const query = new URLSearchParams(window.location.search)
      const requestedSiteID = query.get('site') || ''
      const requestedPreset = query.get('preset')
      const requestedLocale = query.get('locale')
      const preferredSiteID = siteDocs.some((site) => String(site.id) === requestedSiteID)
        ? requestedSiteID
        : String(siteDocs[0]?.id ?? '')
      const preferredSite = siteDocs.find((site) => String(site.id) === preferredSiteID)
      const availableLocales = getAvailableLocales(preferredSite)

      setSites(siteDocs)
      setSiteID((current) => current || preferredSiteID)
      setLocale(getPreferredLocale(preferredSite, requestedLocale, availableLocales))
      if (isLayoutPresetKey(requestedPreset)) {
        setPreset(requestedPreset)
      }
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
  const availableLocales = useMemo(() => getAvailableLocales(selectedSite), [selectedSite])
  const canContinueStepOne = Boolean(siteID && preset && locale)
  const canCreate = Boolean(siteID && preset && locale && title.trim() && slug.trim())

  const createPage = async () => {
    if (isSubmitting) {
      return
    }

    if (!canCreate) {
      setError('Vui lòng nhập đủ site, locale, loại trang, tiêu đề và đường dẫn.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/page-wizard', {
        body: JSON.stringify({
          locale,
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

      const data = (await response.json().catch(() => null)) as {
        id?: number | string
        locale?: string
        message?: string
      } | null

      if (!response.ok || !data?.id) {
        throw new Error(data?.message || 'Không tạo được trang nháp.')
      }

      window.location.href = `/admin/collections/pages/${data.id}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được trang nháp.')
      setIsSubmitting(false)
    }
  }

  return (
    <AdminStandaloneShell>
      <main className={baseClass} data-od-id="page-wizard-main">
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
              Dựng trang nháp theo từng bước. Sau khi tạo, bạn sẽ được chuyển sang màn chỉnh sửa đầy
              đủ để kiểm tra nội dung và preview trước khi publish.
            </span>
          </div>
          <div className={`${baseClass}__header-actions`}>
            <Link className={`${baseClass}__admin-home`} href="/admin">
              ← Về admin
            </Link>
            <Link href="/admin/console">Quay lại console</Link>
          </div>
        </header>

        <ol className={`${baseClass}__steps`} data-od-id="page-wizard-steps">
          {['Chọn phạm vi', 'Nhập nội dung', 'Kiểm tra'].map((label, index) => (
            <li className={step === index + 1 ? `${baseClass}__step--active` : ''} key={label}>
              <span>{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>

        {error ? (
          <div aria-live="assertive" className={`${baseClass}__error`} role="alert">
            {error}
          </div>
        ) : null}

        {step === 1 ? (
          <section className={`${baseClass}__panel`} data-od-id="page-wizard-scope">
            <h2>Trang này thuộc site nào?</h2>
            <label>
              Site
              <select
                aria-describedby={`${baseClass}-site-help`}
                data-od-id="page-wizard-site"
                onChange={(event) => {
                  const nextSiteID = event.target.value
                  const nextSite = sites.find((site) => String(site.id) === nextSiteID)
                  setSiteID(nextSiteID)
                  setLocale(getPreferredLocale(nextSite, null, getAvailableLocales(nextSite)))
                }}
                value={siteID}
              >
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name || site.code || `Site ${site.id}`}
                  </option>
                ))}
              </select>
              <small id={`${baseClass}-site-help`}>
                Phạm vi site quyết định các locale được phép tạo và preview.
              </small>
            </label>

            <label>
              Locale nội dung
              <select
                aria-describedby={`${baseClass}-locale-help`}
                data-od-id="page-wizard-locale"
                onChange={(event) => {
                  if (isCmsLocale(event.target.value)) {
                    setLocale(event.target.value)
                  }
                }}
                value={locale}
              >
                {availableLocales.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
              <small id={`${baseClass}-locale-help`}>
                Nội dung được tạo nháp độc lập theo locale này; bản dịch khác không bị thay đổi.
              </small>
            </label>

            <h2>Chọn loại trang</h2>
            <div className={`${baseClass}__selection-layout`} data-od-id="page-wizard-templates">
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
                          <strong>{displayPresetLabel(item.key)}</strong>
                          <span>{item.description}</span>
                          <span
                            aria-hidden="true"
                            className={`${baseClass}__preset-preview ${baseClass}__preset-preview--${item.preview.accent}`}
                          >
                            <i />
                            <i />
                            <i />
                          </span>
                          <small>{displaySections(item.preview.sections).join(' • ')}</small>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <aside className={`${baseClass}__preset-summary`}>
                <span>Đang chọn</span>
                <h3>{displayPresetLabel(selectedPreset.key)}</h3>
                <p>{selectedPreset.description}</p>
                <ol>
                  {displaySections(selectedPreset.preview.sections).map((section) => (
                    <li key={section}>{section}</li>
                  ))}
                </ol>
              </aside>
            </div>

            <div className={`${baseClass}__actions`}>
              <button
                data-od-id="page-wizard-continue"
                disabled={!canContinueStepOne}
                onClick={() => setStep(2)}
                type="button"
              >
                Tiếp tục
              </button>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className={`${baseClass}__panel`} data-od-id="page-wizard-content">
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
              <button
                data-od-id="page-wizard-check"
                disabled={!title.trim() || !slug.trim()}
                onClick={() => setStep(3)}
                type="button"
              >
                Kiểm tra
              </button>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className={`${baseClass}__panel`} data-od-id="page-wizard-review">
            <h2>Kiểm tra trước khi tạo</h2>
            <dl className={`${baseClass}__review`}>
              <div>
                <dt>Site</dt>
                <dd>{selectedSite?.name || selectedSite?.code || 'Chưa chọn'}</dd>
              </div>
              <div>
                <dt>Locale</dt>
                <dd>
                  {cmsEnabledLocaleMetadata.find((item) => item.code === locale)?.label || locale}
                </dd>
              </div>
              <div>
                <dt>Loại trang</dt>
                <dd>{displayPresetLabel(selectedPreset.key)}</dd>
              </div>
              <div>
                <dt>Cấu trúc gợi ý</dt>
                <dd>{displaySections(selectedPreset.preview.sections).join(' • ')}</dd>
              </div>
              <div>
                <dt>Tiêu đề</dt>
                <dd>{title || 'Chưa nhập'}</dd>
              </div>
              <div>
                <dt>Mô tả ngắn</dt>
                <dd>{summary || 'Chưa nhập'}</dd>
              </div>
              <div>
                <dt>Đường dẫn</dt>
                <dd>/{slug || 'chua-co-duong-dan'}</dd>
              </div>
              <div>
                <dt>Phạm vi quyền</dt>
                <dd>API sẽ kiểm tra quyền tạo trong site đã chọn trước khi ghi dữ liệu.</dd>
              </div>
              <div>
                <dt>Trạng thái sau khi tạo</dt>
                <dd>Nháp (draft), chưa public và chưa thay đổi các locale khác.</dd>
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
              <button
                data-od-id="page-wizard-create-draft"
                disabled={!canCreate || isSubmitting}
                onClick={createPage}
                type="button"
              >
                {isSubmitting ? 'Đang tạo...' : 'Tạo trang nháp'}
              </button>
            </div>
          </section>
        ) : null}
        </div>
      </main>
    </AdminStandaloneShell>
  )
}
