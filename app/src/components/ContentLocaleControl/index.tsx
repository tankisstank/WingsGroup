'use client'

import { formatAdminURL } from 'payload/shared'
import type { Locale } from 'payload'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useConfig, useDocumentInfo, useLocale, useRouteTransition } from '@payloadcms/ui'

import { cmsEnabledLocaleMetadata, type SupportedLocaleCode } from '@/utilities/locales'

type LocaleStatus = 'draft' | 'published' | 'unknown' | 'uncreated'
type DisplayLocaleStatus = LocaleStatus | 'error' | 'loading'
type StatusLoadState = 'error' | 'idle' | 'loading' | 'ready'

type StatusResponse = {
  statuses?: Partial<Record<SupportedLocaleCode, LocaleStatus>>
}

const statusLabel: Record<DisplayLocaleStatus, string> = {
  draft: 'Bản nháp',
  error: 'Lỗi tải',
  loading: 'Đang tải',
  published: 'Đã xuất bản',
  unknown: 'Chưa xác định',
  uncreated: 'Chưa tạo',
}

const localeLabelWithCode = (option: { code: string; label: string }) =>
  option.label.endsWith(` (${option.code})`) ? option.label : `${option.label} (${option.code})`

const getDisplayStatus = (
  status: LocaleStatus | undefined,
  hasDocument: boolean,
  loadState: StatusLoadState,
): DisplayLocaleStatus => {
  if (status) return status
  if (!hasDocument) return 'unknown'
  if (loadState === 'error') return 'error'
  if (loadState !== 'ready') return 'loading'
  return 'uncreated'
}

const useDocumentLocaleStatuses = () => {
  const { collectionSlug, id } = useDocumentInfo()
  const { config } = useConfig()
  const [statuses, setStatuses] = useState<Partial<Record<SupportedLocaleCode, LocaleStatus>>>({})
  const [loadState, setLoadState] = useState<StatusLoadState>('idle')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!collectionSlug || !id) {
      setStatuses({})
      setLoadState('idle')
      return undefined
    }

    const apiURL = formatAdminURL({ apiRoute: config.routes.api, path: '/localization-status' })
    const params = new URLSearchParams({ collection: collectionSlug, id: String(id) })
    let cancelled = false
    setStatuses({})
    setLoadState('loading')

    void fetch(`${apiURL}?${params.toString()}`, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Locale status request failed: ${response.status}`)
        return (await response.json()) as StatusResponse
      })
      .then((result) => {
        if (cancelled) return
        setStatuses(result.statuses || {})
        setLoadState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setStatuses({})
        setLoadState('error')
      })

    return () => {
      cancelled = true
    }
  }, [collectionSlug, config.routes.api, id, retryCount])

  const statusFor = useCallback(
    (code: SupportedLocaleCode): DisplayLocaleStatus =>
      getDisplayStatus(statuses[code], Boolean(id), loadState),
    [id, loadState, statuses],
  )

  return {
    loadState,
    retryStatuses: () => setRetryCount((current) => current + 1),
    statusFor,
  }
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
  // Payload can briefly expose an empty locale object while the admin
  // preferences request is resolving. Keep the content control usable and
  // avoid rendering `undefined` during that short hydration window.
  const localeCode =
    locale?.code ||
    (config.localization && config.localization.defaultLocale) ||
    options[0]?.code ||
    cmsEnabledLocaleMetadata[0].code

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

  return { config, hrefFor, localeCode, options, selectLocale }
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
  const { hrefFor, localeCode, options, selectLocale } = useLocaleLinks()
  const current = options.find((option) => option.code === localeCode)

  return (
    <ControlShell
      currentLabel={current?.label || `Locale (${localeCode})`}
      scope="Áp dụng cho các bản ghi hiện tại"
    >
      <LocaleLinks
        currentCode={localeCode}
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
  const { hrefFor, localeCode, options, selectLocale } = useLocaleLinks()
  const current = options.find((option) => option.code === localeCode)
  const { loadState, retryStatuses, statusFor } = useDocumentLocaleStatuses()

  return (
    <ControlShell
      currentLabel={current?.label || `Locale (${localeCode})`}
      scope="Áp dụng cho bản ghi hiện tại"
    >
      <LocaleLinks
        currentCode={localeCode}
        hrefFor={hrefFor}
        onSelect={selectLocale}
        options={options}
      />
      <div aria-label="Trạng thái dịch" className="wings-content-locale-control__statuses">
        {options.map((option) => {
          const status = statusFor(option.code)
          return (
            <span key={option.code}>
              <b>{option.label}</b>
              <em
                aria-label={`${localeLabelWithCode(option)}: ${statusLabel[status]}`}
                data-status={status}
              >
                {statusLabel[status]}
              </em>
            </span>
          )
        })}
      </div>
      {loadState === 'error' ? (
        <p className="wings-content-locale-control__error" role="alert">
          Không tải được trạng thái bản dịch.{' '}
          <button onClick={retryStatuses} type="button">
            Thử lại
          </button>
        </p>
      ) : null}
    </ControlShell>
  )
}

/** A toolbar-safe alternative to the full document locale panel. */
export function ContentLocaleCompactDocumentControl() {
  const { hrefFor, localeCode, options, selectLocale } = useLocaleLinks()
  const { loadState, retryStatuses, statusFor } = useDocumentLocaleStatuses()

  return (
    <nav aria-label="Ngôn ngữ nội dung" className="wings-content-locale-compact">
      <span className="wings-content-locale-compact__label">Ngôn ngữ</span>
      <LocaleLinks currentCode={localeCode} hrefFor={hrefFor} onSelect={selectLocale} options={options} />
      <span aria-label="Trạng thái locale" className="wings-content-locale-compact__status" role="list">
        {options.map((option) => {
          const status = statusFor(option.code)
          return (
            <span
              aria-label={`${localeLabelWithCode(option)}: ${statusLabel[status]}`}
              data-status={status}
              key={option.code}
              role="listitem"
            >
              {option.code}: {statusLabel[status]}
            </span>
          )
        })}
      </span>
      {loadState === 'error' ? (
        <>
          <span className="wings-content-locale-compact__error" role="alert">
            Lỗi tải trạng thái locale
          </span>
          <button aria-label="Thử lại trạng thái locale" onClick={retryStatuses} type="button">
            Thử lại
          </button>
        </>
      ) : null}
    </nav>
  )
}
