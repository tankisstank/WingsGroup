'use client'

import { formatAdminURL } from 'payload/shared'
import type { Locale } from 'payload'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useConfig, useDocumentInfo, useLocale, useRouteTransition } from '@payloadcms/ui'

import { cmsEnabledLocaleMetadata, type SupportedLocaleCode } from '@/utilities/locales'

type LocaleStatus = 'draft' | 'published' | 'unknown' | 'uncreated'

type StatusResponse = {
  statuses?: Partial<Record<SupportedLocaleCode, LocaleStatus>>
}

const statusLabel: Record<LocaleStatus, string> = {
  draft: 'Bản nháp',
  published: 'Đã xuất bản',
  unknown: 'Chưa xác định',
  uncreated: 'Chưa tạo',
}

const useLocaleLinks = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { startRouteTransition } = useRouteTransition()
  const { config } = useConfig()
  const locale = useLocale()
  const locales: Locale[] = useMemo(
    () => (config.localization ? config.localization.locales : []),
    [config.localization],
  )

  const options = useMemo(
    () =>
      locales.map((option) => {
        const code = option.code as SupportedLocaleCode
        const known = cmsEnabledLocaleMetadata.find((item) => item.code === code)
        return {
          code,
          label: known?.label || (typeof option.label === 'string' ? option.label : code),
        }
      }),
    [locales],
  )

  const hrefFor = useCallback(
    (code: string) => {
      const next = new URLSearchParams(searchParams.toString())
      next.set('locale', code)
      const query = next.toString()
      return `${pathname}${query ? `?${query}` : ''}`
    },
    [pathname, searchParams],
  )

  const selectLocale = useCallback(
    (code: string) => {
      const href = hrefFor(code)
      startRouteTransition(() => router.push(href))
    },
    [hrefFor, router, startRouteTransition],
  )

  return { config, hrefFor, locale, options, selectLocale }
}

const LocaleLinks = ({
  currentCode,
  hrefFor,
  onSelect,
  options,
}: {
  currentCode: string
  hrefFor: (code: string) => string
  onSelect?: (code: string) => void
  options: Array<{ code: SupportedLocaleCode; label: string }>
}) => (
  <div className="wings-content-locale-control__options" role="list">
    {options.map((option) => (
      <div key={option.code} role="listitem">
        <a
          aria-current={option.code === currentCode ? 'true' : undefined}
          className={option.code === currentCode ? 'is-active' : undefined}
          href={hrefFor(option.code)}
          onClick={(event) => {
            if (!onSelect) return
            event.preventDefault()
            onSelect(option.code)
          }}
        >
          {option.label}
        </a>
      </div>
    ))}
  </div>
)

const ControlShell = ({
  children,
  currentLabel,
  scope,
}: {
  children: ReactNode
  currentLabel: string
  scope: string
}) => (
  <section aria-label="Ngôn ngữ nội dung" className="wings-content-locale-control">
    <div className="wings-content-locale-control__heading">
      <strong>Ngôn ngữ nội dung · {currentLabel}</strong>
      <span>{scope}</span>
    </div>
    {children}
  </section>
)

export function ContentLocaleListControl() {
  const { hrefFor, locale, options, selectLocale } = useLocaleLinks()
  const current = options.find((option) => option.code === locale.code)

  return (
    <ControlShell
      currentLabel={current?.label || `Locale (${locale.code})`}
      scope="Áp dụng cho các bản ghi hiện tại"
    >
      <LocaleLinks
        currentCode={locale.code}
        hrefFor={hrefFor}
        onSelect={selectLocale}
        options={options}
      />
      <p className="wings-content-locale-control__hint">
        Trạng thái dịch chỉ được xác định khi mở bản ghi.
      </p>
    </ControlShell>
  )
}

export function ContentLocaleDocumentControl() {
  const { collectionSlug, id } = useDocumentInfo()
  const { hrefFor, locale, options, selectLocale } = useLocaleLinks()
  const [statuses, setStatuses] = useState<Partial<Record<SupportedLocaleCode, LocaleStatus>>>({})
  const current = options.find((option) => option.code === locale.code)
  const { config } = useConfig()

  useEffect(() => {
    if (!collectionSlug || !id) return

    const apiURL = formatAdminURL({
      apiRoute: config.routes.api,
      path: '/localization-status',
    })
    const params = new URLSearchParams({
      collection: collectionSlug,
      id: String(id),
    })
    let cancelled = false

    void fetch(`${apiURL}?${params.toString()}`, { credentials: 'include' })
      .then(async (response) => (response.ok ? ((await response.json()) as StatusResponse) : null))
      .then((result) => {
        if (!cancelled && result?.statuses) setStatuses(result.statuses)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [collectionSlug, config.routes.api, id])

  return (
    <ControlShell
      currentLabel={current?.label || `Locale (${locale.code})`}
      scope="Áp dụng cho bản ghi hiện tại"
    >
      <LocaleLinks
        currentCode={locale.code}
        hrefFor={hrefFor}
        onSelect={selectLocale}
        options={options}
      />
      <div aria-label="Trạng thái dịch" className="wings-content-locale-control__statuses">
        {options.map((option) => (
          <span key={option.code}>
            <b>{option.label}</b>
            <em data-status={statuses[option.code] || (id ? 'uncreated' : 'unknown')}>
              {statusLabel[statuses[option.code] || (id ? 'uncreated' : 'unknown')]}
            </em>
          </span>
        ))}
      </div>
    </ControlShell>
  )
}
