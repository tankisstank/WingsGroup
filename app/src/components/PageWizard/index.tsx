'use client'

import Link from 'next/link'
import React, { useEffect, useMemo, useState } from 'react'

import './index.scss'

type SiteOption = {
  code?: string
  id: number | string
  name?: string
}

type WizardTemplate = {
  category: 'core' | 'landing' | 'service' | 'lead'
  description: string
  id:
    | 'about'
    | 'basic'
    | 'campaign'
    | 'contact'
    | 'destination'
    | 'home'
    | 'insurance'
    | 'leadMagnet'
    | 'service'
    | 'tour'
  label: string
  sections: string
}

const baseClass = 'page-wizard'

const templates: WizardTemplate[] = [
  {
    category: 'core',
    description: 'Trang chủ cho một site con với hero, điểm mạnh, nội dung nổi bật và CTA.',
    id: 'home',
    label: 'Trang chủ site',
    sections: 'Hero, điểm mạnh, dịch vụ nổi bật, CTA',
  },
  {
    category: 'core',
    description: 'Trang giới thiệu thương hiệu, đội ngũ, năng lực và lý do khách hàng nên tin tưởng.',
    id: 'about',
    label: 'Trang giới thiệu',
    sections: 'Câu chuyện, năng lực, cam kết, CTA',
  },
  {
    category: 'core',
    description: 'Trang nội dung chuẩn như giới thiệu, chính sách, thông tin dịch vụ.',
    id: 'basic',
    label: 'Trang nội dung',
    sections: 'Hero, nội dung chính',
  },
  {
    category: 'landing',
    description: 'Trang chuyển đổi cho chiến dịch, có hero, nội dung thuyết phục và CTA.',
    id: 'campaign',
    label: 'Landing page chiến dịch',
    sections: 'Vấn đề, lợi ích, bằng chứng, CTA',
  },
  {
    category: 'service',
    description: 'Trang giới thiệu một dịch vụ với lợi ích, nội dung chính và lời kêu gọi hành động.',
    id: 'service',
    label: 'Trang dịch vụ',
    sections: 'Tổng quan, lợi ích, quy trình, CTA',
  },
  {
    category: 'service',
    description: 'Trang bán tour hoặc gói du lịch, phù hợp WingsTravel và WingsGo.',
    id: 'tour',
    label: 'Trang tour / gói du lịch',
    sections: 'Lịch trình, điểm nổi bật, phù hợp với ai, CTA',
  },
  {
    category: 'service',
    description: 'Trang điểm đến để SEO theo thị trường, quốc gia hoặc thành phố.',
    id: 'destination',
    label: 'Trang điểm đến',
    sections: 'Tổng quan điểm đến, trải nghiệm, lưu ý, CTA',
  },
  {
    category: 'service',
    description: 'Trang bảo hiểm, chăm sóc hoặc dịch vụ hỗ trợ trước/sau chuyến đi.',
    id: 'insurance',
    label: 'Trang bảo hiểm / chăm sóc',
    sections: 'Đối tượng, quyền lợi, quy trình hỗ trợ, CTA',
  },
  {
    category: 'lead',
    description: 'Trang tải brochure, nhận tư vấn hoặc thu lead cho chiến dịch marketing.',
    id: 'leadMagnet',
    label: 'Trang thu lead',
    sections: 'Offer, lợi ích, form nếu có, CTA',
  },
  {
    category: 'lead',
    description: 'Trang tiếp nhận yêu cầu, ưu tiên thông tin liên hệ và form lead.',
    id: 'contact',
    label: 'Trang liên hệ',
    sections: 'Thông tin liên hệ, form nếu có, CTA',
  },
]

const categoryLabels: Record<WizardTemplate['category'], string> = {
  core: 'Trang nền tảng',
  landing: 'Landing / campaign',
  lead: 'Lead capture',
  service: 'Dịch vụ / sản phẩm',
}

const templateIconLabels: Record<WizardTemplate['category'], string> = {
  core: 'C',
  landing: 'L',
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
  const [template, setTemplate] = useState<WizardTemplate['id']>('basic')
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

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === template) ?? templates[0],
    [template],
  )
  const groupedTemplates = useMemo(
    () =>
      (['core', 'service', 'landing', 'lead'] as const).map((category) => ({
        category,
        items: templates.filter((item) => item.category === category),
      })),
    [],
  )
  const selectedSite = sites.find((site) => String(site.id) === siteID)
  const canContinueStepOne = Boolean(siteID && template)
  const canCreate = Boolean(siteID && template && title.trim() && slug.trim())

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
          template,
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
      <div className={`${baseClass}__shell`}>
        <header className={`${baseClass}__header`}>
          <div>
            <p>WingsTravel CMS</p>
            <h1>Tạo trang nhanh</h1>
            <span>
              Dựng trang nháp theo từng bước. Sau khi tạo, bạn sẽ được chuyển sang màn chỉnh sửa
              đầy đủ để kiểm tra nội dung và preview trước khi publish.
            </span>
          </div>
          <Link href="/admin/console">Quay lại console</Link>
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
            <div className={`${baseClass}__template-groups`}>
              {groupedTemplates.map((group) => (
                <section key={group.category}>
                  <h3>{categoryLabels[group.category]}</h3>
                  <div className={`${baseClass}__templates`}>
                    {group.items.map((item) => (
                      <button
                        className={template === item.id ? `${baseClass}__template--selected` : ''}
                        key={item.id}
                        onClick={() => setTemplate(item.id)}
                        type="button"
                      >
                        <span className={`${baseClass}__template-icon`} aria-hidden="true">
                          {templateIconLabels[item.category]}
                        </span>
                        <strong>{item.label}</strong>
                        <span>{item.description}</span>
                        <small>{item.sections}</small>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
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
                <dd>{selectedTemplate.label}</dd>
              </div>
              <div>
                <dt>Cấu trúc gợi ý</dt>
                <dd>{selectedTemplate.sections}</dd>
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
