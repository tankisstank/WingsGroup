'use client'

import Link from 'next/link'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import AdminThemeBootstrap from '@/components/AdminThemeBootstrap'

import './index.scss'

import {
  evaluateHeroPresentationRequirements,
  getHeroPresentationAdminMeta,
  getHeroRequirementTone,
} from '@/heros/presentations/admin'
import { heroPresentationDefinitions } from '@/heros/presentations/registry'
import { getSiteThemeTokens } from '@/utilities/siteTheme'
import {
  backgroundStyleOptions,
  buttonStyleOptions,
  defaultThemeKey,
  defaultThemePresetByKey,
  fontPresetOptions,
  layoutStyleOptions,
  radiusOptions,
  resolveThemePresetTokens,
  spacingScaleOptions,
  themeKeyOptions,
  themePresetKeyOptions,
} from '@/utilities/themeTokens'

type Role = 'editor' | 'site-manager' | 'super-admin'

type CurrentUser = {
  role?: Role
}

type SiteOption = {
  code?: string
  id: number | string
  name?: string
}

type ThemePresetDoc = {
  id: number | string
  key?: string
  name?: string
  tokens?: Record<string, string>
}

type HeroPresentationPresetDoc = {
  baseTemplate?: string
  description?: string
  id: number | string
  isActive?: boolean
  key?: string
  name?: string
}

type SiteSettingsDoc = {
  branding?: {
    accentColor?: string
    backgroundStyle?: string
    brandColor?: string
    buttonStyle?: string
    fontPreset?: string
    layoutStyle?: string
    logoText?: string
    radius?: string
    spacingScale?: string
    surfaceColor?: string
    surfaceStrongColor?: string
    themeKey?: string
    themePreset?: ThemePresetDoc | number | string
  }
  heroDefaults?: {
    presentationPreset?: HeroPresentationPresetDoc | number | string
    variant?: string
  }
  id: number | string
  site?: SiteOption | number | string
  siteName?: string
}

type PageUsageDoc = {
  hero?: {
    presentation?: string | null
    presentationMode?: 'inherit' | 'override' | null
    presentationPreset?: HeroPresentationPresetDoc | number | string | null
    type?: string | null
  } | null
  id: number | string
  pathname?: string | null
  title?: string | null
}

type ThemeFormState = {
  accentColor: string
  backgroundStyle: string
  brandColor: string
  buttonStyle: string
  fontPreset: string
  layoutStyle: string
  logoText: string
  radius: string
  spacingScale: string
  surfaceColor: string
  surfaceStrongColor: string
  themeKey: string
  themePreset: string
}

type HeroFormState = {
  presentationPreset: string
  variant: string
}

type BackgroundStyle = (typeof backgroundStyleOptions)[number]['value']
type ButtonStyle = (typeof buttonStyleOptions)[number]['value']
type FontPreset = (typeof fontPresetOptions)[number]['value']
type LayoutStyle = (typeof layoutStyleOptions)[number]['value']
type RadiusScale = (typeof radiusOptions)[number]['value']
type SaveScope = 'all' | 'hero' | 'theme'
type SpacingScale = (typeof spacingScaleOptions)[number]['value']

type Notice = {
  scope?: SaveScope
  tone: 'error' | 'info' | 'success'
  text: string
}

type UsageSummary = {
  affectedPages: Array<{ id: number | string; pathname: string; title: string }>
  inheritCount: number
  legacyCount: number
  overrideCount: number
  totalHighImpactPages: number
}

type FetchResult<T> =
  | { data: T; state: 'ready' }
  | { message: string; state: 'no-access' | 'error' | 'unavailable' }

const baseClass = 'theme-manager'

const getOptionLabel = <T extends string>(
  options: readonly { label: string; value: T }[],
  value?: string,
) => options.find((option) => option.value === value)?.label || value || ''

const normalizeColorInputValue = (value: string) =>
  /^#(?:[0-9a-fA-F]{6})$/.test(value) ? value : '#000000'

const knownThemePresetLabels: Record<string, string> = Object.fromEntries(
  [
    ...themePresetKeyOptions,
    { label: 'WingsSide cổ điển (WingsSide Classic)', value: 'wings-side-classic' },
    { label: 'WingsSide biên tập (WingsSide Editorial)', value: 'wings-side-editorial' },
    { label: 'WingsSide inbound biên tập v2 (WingsSide Editorial Inbound v2)', value: 'wings-side-editorial-inbound-v2' },
  ].map((option) => [option.value, option.label]),
)

const heroVariantLabels: Record<string, string> = {
  planner: 'Lập hành trình (Planner)',
  'retail-departures': 'Lịch khởi hành bán lẻ (Retail departures)',
  standard: 'Tiêu chuẩn (Standard)',
  utility: 'Tiện ích (Utility)',
}

const displayThemePreset = (preset?: Pick<ThemePresetDoc, 'id' | 'key' | 'name'>) => {
  const key = preset?.key || preset?.name?.toLowerCase()

  if (key && knownThemePresetLabels[key]) {
    return knownThemePresetLabels[key]
  }

  return preset?.name || preset?.key || (preset ? `Preset ${preset.id}` : 'Chưa chọn preset')
}

const displayHeroPreset = (
  preset?: Pick<HeroPresentationPresetDoc, 'baseTemplate' | 'id' | 'key' | 'name'>,
) => {
  const meta = getHeroPresentationAdminMeta(preset?.baseTemplate)

  return meta?.label || preset?.name || preset?.key || (preset ? `Preset hero ${preset.id}` : 'Chưa chọn')
}

const getPresetLabel = (value: string, presets: ThemePresetDoc[]) => {
  const preset =
    presets.find((item) => String(item.id) === String(value)) ||
    presets.find((item) => item.key === value)

  if (preset) {
    return displayThemePreset(preset)
  }

  return getOptionLabel(themePresetKeyOptions, value) || 'Chưa chọn preset'
}

const defaultFormState = (siteName = 'WingsGroup'): ThemeFormState => ({
  accentColor: defaultThemePresetByKey.corporate.accentColor,
  backgroundStyle: defaultThemePresetByKey.corporate.backgroundStyle,
  brandColor: defaultThemePresetByKey.corporate.brandColor,
  buttonStyle: defaultThemePresetByKey.corporate.buttonStyle,
  fontPreset: defaultThemePresetByKey.corporate.fontPreset,
  layoutStyle: defaultThemePresetByKey.corporate.layoutStyle,
  logoText: siteName,
  radius: defaultThemePresetByKey.corporate.radius,
  spacingScale: defaultThemePresetByKey.corporate.spacingScale,
  surfaceColor: defaultThemePresetByKey.corporate.surfaceColor,
  surfaceStrongColor: defaultThemePresetByKey.corporate.surfaceStrongColor,
  themeKey: defaultThemeKey,
  themePreset: '',
})

const defaultHeroFormState = (heroPresetID = ''): HeroFormState => ({
  presentationPreset: heroPresetID,
  variant: 'standard',
})

const fetchJSON = async <T,>(url: string): Promise<FetchResult<T>> => {
  try {
    const response = await fetch(url, { credentials: 'include' })

    if (response.status === 401 || response.status === 403) {
      return { message: 'Bạn không có quyền truy cập dữ liệu này.', state: 'no-access' }
    }

    if (!response.ok) {
      return { message: `Không tải được dữ liệu (HTTP ${response.status}).`, state: 'error' }
    }

    return { data: (await response.json()) as T, state: 'ready' }
  } catch {
    return { message: 'Không thể kết nối để tải dữ liệu.', state: 'error' }
  }
}

const resultMessage = (label: string, result: FetchResult<unknown>) =>
  result.state === 'ready' ? null : `${label}: ${result.message}`

const getUsageSummary = (pages: PageUsageDoc[]): UsageSummary => {
  const highImpactPages = pages.filter((page) => page.hero?.type === 'highImpact')
  const inheritPages = highImpactPages.filter((page) => page.hero?.presentationMode === 'inherit')
  const overridePages = highImpactPages.filter((page) => page.hero?.presentationMode === 'override')
  const legacyPages = highImpactPages.filter(
    (page) => !page.hero?.presentationMode && typeof page.hero?.presentation === 'string',
  )

  return {
    affectedPages: inheritPages.slice(0, 5).map((page) => ({
      id: page.id,
      pathname: page.pathname || '/',
      title: page.title || `Trang ${page.id}`,
    })),
    inheritCount: inheritPages.length,
    legacyCount: legacyPages.length,
    overrideCount: overridePages.length,
    totalHighImpactPages: highImpactPages.length,
  }
}

export default function ThemeManagerView() {
  const [user, setUser] = useState<CurrentUser>()
  const [sites, setSites] = useState<SiteOption[]>([])
  const [presets, setPresets] = useState<ThemePresetDoc[]>([])
  const [heroPresets, setHeroPresets] = useState<HeroPresentationPresetDoc[]>([])
  const [selectedSiteID, setSelectedSiteID] = useState('')
  const [selectedSettingsID, setSelectedSettingsID] = useState<string | number | null>(null)
  const [form, setForm] = useState<ThemeFormState>(defaultFormState())
  const [heroForm, setHeroForm] = useState<HeroFormState>(defaultHeroFormState())
  const [notice, setNotice] = useState<Notice | null>(null)
  const [loadIssues, setLoadIssues] = useState<string[]>([])
  const [siteContextIssues, setSiteContextIssues] = useState<string[]>([])
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSiteContextLoading, setIsSiteContextLoading] = useState(false)
  const [savingScope, setSavingScope] = useState<SaveScope | null>(null)
  const [savedSignature, setSavedSignature] = useState('')
  const [savedHeroSignature, setSavedHeroSignature] = useState('')
  const siteContextRequest = useRef(0)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)

      const [me, siteResult, presetResult, heroPresetResult] = await Promise.all([
        fetchJSON<{ user?: CurrentUser }>('/api/users/me'),
        fetchJSON<{ docs?: SiteOption[] }>('/api/sites?depth=0&limit=100&sort=name'),
        fetchJSON<{ docs?: ThemePresetDoc[] }>('/api/theme-presets?depth=0&limit=100&sort=name'),
        fetchJSON<{ docs?: HeroPresentationPresetDoc[] }>(
          '/api/hero-presentation-presets?depth=0&limit=100&sort=name&where[isActive][equals]=true',
        ),
      ])

      const siteDocs = siteResult.state === 'ready' ? siteResult.data.docs ?? [] : []
      const presetDocs = presetResult.state === 'ready' ? presetResult.data.docs ?? [] : []
      const heroPresetDocs =
        heroPresetResult.state === 'ready' ? heroPresetResult.data.docs ?? [] : []
      const siteID = String(siteDocs[0]?.id ?? '')

      // Do not replace a panel's known-good data when an unrelated resource
      // fails. Each resource remains independently observable and retryable.
      if (me.state === 'ready') setUser(me.data.user)
      if (siteResult.state === 'ready') setSites(siteDocs)
      if (presetResult.state === 'ready') setPresets(presetDocs)
      if (heroPresetResult.state === 'ready') setHeroPresets(heroPresetDocs)
      setSelectedSiteID((current) => current || siteID)
      if (heroPresetResult.state === 'ready') {
        setHeroForm((current) =>
          current.presentationPreset
            ? current
            : defaultHeroFormState(String(heroPresetDocs[0]?.id || '')),
        )
      }
      setLoadIssues(
        [
          resultMessage('Phiên người dùng', me),
          resultMessage('Danh sách site', siteResult),
          resultMessage('Preset giao diện', presetResult),
          resultMessage('Preset hero', heroPresetResult),
        ].filter((message): message is string => Boolean(message)),
      )
      setIsLoading(false)
    }

    void load()
  }, [])

  useEffect(() => {
    const requestID = ++siteContextRequest.current
    let cancelled = false

    const loadSiteContext = async () => {
      if (!selectedSiteID) {
        setUsageSummary(null)
        setSelectedSettingsID(null)
        return
      }

      setNotice(null)
      setSiteContextIssues([])
      setIsSiteContextLoading(true)
      setUsageSummary(null)

      const [settingsResult, pagesResult] = await Promise.all([
        fetchJSON<{ docs?: SiteSettingsDoc[] }>(
          `/api/site-settings?depth=1&limit=1&where[site][equals]=${selectedSiteID}`,
        ),
        fetchJSON<{ docs?: PageUsageDoc[] }>(
          `/api/pages?depth=0&draft=true&limit=100&where[site][equals]=${selectedSiteID}`,
        ),
      ])

      if (cancelled || requestID !== siteContextRequest.current) return

      const issues = [
        resultMessage('Cấu hình site', settingsResult),
        resultMessage('Phân tích tác động theo trang', pagesResult),
      ].filter((message): message is string => Boolean(message))
      setSiteContextIssues(issues)

      if (pagesResult.state === 'ready') {
        setUsageSummary(getUsageSummary(pagesResult.data.docs ?? []))
      }

      if (settingsResult.state !== 'ready') {
        setIsSiteContextLoading(false)
        return
      }

      const settings = settingsResult.data.docs?.[0]
      const selectedSiteName =
        sites.find((site) => String(site.id) === selectedSiteID)?.name || 'WingsGroup'

      if (!settings) {
        const nextThemeForm = defaultFormState(selectedSiteName)
        const nextHeroForm = defaultHeroFormState(String(heroPresets[0]?.id || ''))

        setForm(nextThemeForm)
        setHeroForm(nextHeroForm)
        setSavedSignature(JSON.stringify(nextThemeForm))
        setSavedHeroSignature(JSON.stringify(nextHeroForm))
        setSelectedSettingsID(null)
        setIsSiteContextLoading(false)
        return
      }

      const themePresetDoc =
        typeof settings.branding?.themePreset === 'object' && settings.branding.themePreset
          ? settings.branding.themePreset
          : null
      const themePresetKey =
        themePresetDoc?.key ||
        (typeof settings.branding?.themePreset === 'string'
          ? settings.branding.themePreset
          : 'corporate')
      const matchedPreset =
        presets.find((preset) => String(preset.id) === String(themePresetDoc?.id)) ||
        presets.find((preset) => preset.key === themePresetKey) ||
        presets[0]
      const resolvedPreset = resolveThemePresetTokens(settings.branding?.themeKey || defaultThemeKey, {
        key: matchedPreset?.key || themePresetKey,
        tokens: themePresetDoc?.tokens || matchedPreset?.tokens || defaultThemePresetByKey.corporate,
      })

      const nextForm = {
        accentColor: settings.branding?.accentColor || resolvedPreset.accentColor,
        backgroundStyle: settings.branding?.backgroundStyle || resolvedPreset.backgroundStyle,
        brandColor: settings.branding?.brandColor || resolvedPreset.brandColor,
        buttonStyle: settings.branding?.buttonStyle || resolvedPreset.buttonStyle,
        fontPreset: settings.branding?.fontPreset || resolvedPreset.fontPreset,
        layoutStyle: settings.branding?.layoutStyle || resolvedPreset.layoutStyle,
        logoText: settings.branding?.logoText || settings.siteName || selectedSiteName,
        radius: settings.branding?.radius || resolvedPreset.radius,
        spacingScale: settings.branding?.spacingScale || resolvedPreset.spacingScale,
        surfaceColor: settings.branding?.surfaceColor || resolvedPreset.surfaceColor,
        surfaceStrongColor: settings.branding?.surfaceStrongColor || resolvedPreset.surfaceStrongColor,
        themeKey: settings.branding?.themeKey || defaultThemeKey,
        themePreset: String(matchedPreset?.id || ''),
      }

      const heroPresetDoc =
        typeof settings.heroDefaults?.presentationPreset === 'object' &&
        settings.heroDefaults.presentationPreset
          ? settings.heroDefaults.presentationPreset
          : null
      const matchedHeroPreset =
        heroPresets.find((preset) => String(preset.id) === String(heroPresetDoc?.id)) ||
        heroPresets.find(
          (preset) => preset.key === String(settings.heroDefaults?.presentationPreset || ''),
        ) ||
        heroPresets[0]
      const nextHeroForm = {
        presentationPreset: String(matchedHeroPreset?.id || heroPresets[0]?.id || ''),
        variant: settings.heroDefaults?.variant || 'standard',
      }

      setSelectedSettingsID(settings.id)
      setForm(nextForm)
      setHeroForm(nextHeroForm)
      setSavedSignature(JSON.stringify(nextForm))
      setSavedHeroSignature(JSON.stringify(nextHeroForm))
      setIsSiteContextLoading(false)
    }

    void loadSiteContext()
    return () => {
      cancelled = true
    }
  }, [heroPresets, presets, selectedSiteID, sites])

  const selectedSite = useMemo(
    () => sites.find((site) => String(site.id) === selectedSiteID),
    [selectedSiteID, sites],
  )

  const previewTokens = useMemo(
    () =>
      resolveThemePresetTokens(form.themeKey, {
        key:
          presets.find((preset) => String(preset.id) === String(form.themePreset))?.key ||
          presets.find((preset) => preset.key === form.themePreset)?.key ||
          form.themePreset,
        tokens: {
          accentColor: form.accentColor,
          backgroundStyle: form.backgroundStyle as BackgroundStyle,
          brandColor: form.brandColor,
          buttonStyle: form.buttonStyle as ButtonStyle,
          fontPreset: form.fontPreset as FontPreset,
          layoutStyle: form.layoutStyle as LayoutStyle,
          radius: form.radius as RadiusScale,
          spacingScale: form.spacingScale as SpacingScale,
          surfaceColor: form.surfaceColor,
          surfaceStrongColor: form.surfaceStrongColor,
        },
      }),
    [form, presets],
  )

  const previewTheme = useMemo(
    () =>
      getSiteThemeTokens({
        branding: {
          accentColor: form.accentColor,
          backgroundStyle: form.backgroundStyle as BackgroundStyle,
          brandColor: form.brandColor,
          buttonStyle: form.buttonStyle as ButtonStyle,
          fontPreset: form.fontPreset as FontPreset,
          layoutStyle: form.layoutStyle as LayoutStyle,
          radius: form.radius as RadiusScale,
          spacingScale: form.spacingScale as SpacingScale,
          surfaceColor: form.surfaceColor,
          surfaceStrongColor: form.surfaceStrongColor,
          themeKey: form.themeKey,
          themePreset: {
            key:
              presets.find((preset) => String(preset.id) === String(form.themePreset))?.key ||
              presets.find((preset) => preset.key === form.themePreset)?.key ||
              form.themePreset,
            tokens: previewTokens,
          },
        },
        siteName: selectedSite?.name || form.logoText,
      }),
    [form, presets, previewTokens, selectedSite],
  )

  const previewStyle = previewTheme.style
  const presetLabel = getPresetLabel(form.themePreset, presets)
  const selectedHeroPreset =
    heroPresets.find((preset) => String(preset.id) === String(heroForm.presentationPreset)) ||
    heroPresets[0]
  const selectedHeroMeta = getHeroPresentationAdminMeta(selectedHeroPreset?.baseTemplate)
  const selectedHeroDefinition = heroPresentationDefinitions.find(
    (definition) => definition.value === selectedHeroPreset?.baseTemplate,
  )
  const hasUnsavedChanges = savedSignature !== JSON.stringify(form)
  const hasUnsavedHeroChanges = savedHeroSignature !== JSON.stringify(heroForm)
  const role = user?.role || 'editor'
  const canEdit = role === 'super-admin' || role === 'site-manager'
  const heroRequirements = evaluateHeroPresentationRequirements({
    key: selectedHeroMeta?.key,
    variant: heroForm.variant,
  })

  const hasUnsavedWork = hasUnsavedChanges || hasUnsavedHeroChanges

  useEffect(() => {
    if (!hasUnsavedWork) return

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    const warnBeforeNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) {
        return
      }
      const anchor = (event.target as HTMLElement | null)?.closest('a[href]')
      if (anchor && !window.confirm('Bạn có thay đổi chưa lưu. Rời trang và bỏ thay đổi?')) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    window.addEventListener('beforeunload', warnBeforeUnload)
    document.addEventListener('click', warnBeforeNavigation, true)
    return () => {
      window.removeEventListener('beforeunload', warnBeforeUnload)
      document.removeEventListener('click', warnBeforeNavigation, true)
    }
  }, [hasUnsavedWork])

  const changeSite = (nextSiteID: string) => {
    if (nextSiteID === selectedSiteID) return
    if (hasUnsavedWork && !window.confirm('Bạn có thay đổi chưa lưu. Đổi site và bỏ thay đổi?')) {
      return
    }
    setSelectedSiteID(nextSiteID)
  }

  const updateField = (field: keyof ThemeFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const updateHeroField = (field: keyof HeroFormState, value: string) => {
    setHeroForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const save = async (scope: SaveScope) => {
    if (!selectedSettingsID) {
      setNotice({
        tone: 'error',
        text: 'Không tìm thấy site settings cho site đã chọn.',
      })
      return
    }

    const impact =
      scope === 'hero'
        ? `Hero mặc định áp dụng theo thứ tự toàn hệ → site ${selectedSite?.name || ''} → page. Chỉ page kế thừa site default mới thay đổi.`
        : `Giao diện site áp dụng theo thứ tự toàn hệ → site ${selectedSite?.name || ''} → trang. Hãy kiểm tra lại xem trước của các trang liên quan.`
    if (!window.confirm(`${impact}\n\nBạn muốn lưu thay đổi này?`)) return

    setSavingScope(scope)
    setNotice(null)

    const body =
      scope === 'theme'
        ? {
            branding: {
              accentColor: form.accentColor,
              backgroundStyle: form.backgroundStyle,
              brandColor: form.brandColor,
              buttonStyle: form.buttonStyle,
              fontPreset: form.fontPreset,
              layoutStyle: form.layoutStyle,
              logoText: form.logoText,
              radius: form.radius,
              spacingScale: form.spacingScale,
              surfaceColor: form.surfaceColor,
              surfaceStrongColor: form.surfaceStrongColor,
              themeKey: form.themeKey,
              themePreset:
                presets.find((preset) => String(preset.id) === String(form.themePreset))?.id ||
                form.themePreset,
            },
          }
        : scope === 'hero'
          ? {
              heroDefaults: {
                presentationPreset:
                  heroPresets.find(
                    (preset) => String(preset.id) === String(heroForm.presentationPreset),
                  )?.id ||
                  heroForm.presentationPreset ||
                  null,
                variant: heroForm.variant,
              },
            }
          : {
              branding: {
                accentColor: form.accentColor,
                backgroundStyle: form.backgroundStyle,
                brandColor: form.brandColor,
                buttonStyle: form.buttonStyle,
                fontPreset: form.fontPreset,
                layoutStyle: form.layoutStyle,
                logoText: form.logoText,
                radius: form.radius,
                spacingScale: form.spacingScale,
                surfaceColor: form.surfaceColor,
                surfaceStrongColor: form.surfaceStrongColor,
                themeKey: form.themeKey,
                themePreset:
                  presets.find((preset) => String(preset.id) === String(form.themePreset))?.id ||
                  form.themePreset,
              },
              heroDefaults: {
                presentationPreset:
                  heroPresets.find(
                    (preset) => String(preset.id) === String(heroForm.presentationPreset),
                  )?.id ||
                  heroForm.presentationPreset ||
                  null,
                variant: heroForm.variant,
              },
            }

    const response = await fetch(`/api/site-settings/${selectedSettingsID}`, {
      body: JSON.stringify(body),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'PATCH',
    })

    const data = (await response.json().catch(() => null)) as
      | { errors?: Array<{ message?: string }>; message?: string }
      | null

    if (!response.ok) {
      setNotice({
        scope,
        tone: 'error',
        text: data?.message || data?.errors?.[0]?.message || 'Không lưu được cấu hình.',
      })
      setSavingScope(null)
      return
    }

    if (scope === 'theme' || scope === 'all') {
      setSavedSignature(JSON.stringify(form))
    }

    if (scope === 'hero' || scope === 'all') {
      setSavedHeroSignature(JSON.stringify(heroForm))
    }

    setNotice({
      scope,
      tone: 'success',
      text:
        scope === 'theme'
          ? 'Đã lưu theme shell cho site.'
          : scope === 'hero'
            ? 'Đã lưu hero mặc định cho site.'
            : 'Đã lưu theme và hero mặc định cho site.',
    })
    setSavingScope(null)
  }

  if (isLoading) {
    return (
      <main className={baseClass}>
        <AdminThemeBootstrap />
        <div className={`${baseClass}__shell`}>
          <header className={`${baseClass}__header`}>
            <div>
              <nav className={`${baseClass}__breadcrumbs`} aria-label="Điều hướng admin">
                <Link href="/admin">Bảng điều hành admin</Link>
                <span aria-hidden="true">/</span>
                <span>Quản lý giao diện</span>
              </nav>
              <p>WingsGroup CMS</p>
              <h1>Quản lý giao diện</h1>
              <span>Đang tải cấu hình giao diện...</span>
            </div>
            <div className={`${baseClass}__header-actions`}>
              <Link className={`${baseClass}__admin-home`} href="/admin">
                ← Về admin
              </Link>
            </div>
          </header>
        </div>
      </main>
    )
  }

  if (!canEdit) {
    return (
      <main className={baseClass}>
        <AdminThemeBootstrap />
        <div className={`${baseClass}__shell`}>
          <header className={`${baseClass}__header`}>
            <div>
              <nav className={`${baseClass}__breadcrumbs`} aria-label="Điều hướng admin">
                <Link href="/admin">Bảng điều hành admin</Link>
                <span aria-hidden="true">/</span>
                <span>Quản lý giao diện</span>
              </nav>
              <p>WingsGroup CMS</p>
              <h1>Quản lý giao diện</h1>
              <span>Chỉ quản trị toàn hệ và quản lý site mới được chỉnh giao diện.</span>
            </div>
            <div className={`${baseClass}__header-actions`}>
              <Link className={`${baseClass}__admin-home`} href="/admin">
                ← Về admin
              </Link>
              <Link href="/admin/console">Quay lại console</Link>
            </div>
          </header>
        </div>
      </main>
    )
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
              <span>Quản lý giao diện</span>
            </nav>
            <p>WingsGroup CMS</p>
            <h1>Quản lý giao diện</h1>
            <span>
              Cấu hình giao diện theo thứ tự toàn hệ → site → page. Nội dung và locale của page
              vẫn được quản lý độc lập trong editor.
            </span>
          </div>
          <div className={`${baseClass}__header-actions`}>
            <Link className={`${baseClass}__admin-home`} href="/admin">
              ← Về admin
            </Link>
            <Link href="/admin/collections/site-settings">Cấu hình site</Link>
            <Link href="/admin/console">Quay lại console</Link>
          </div>
        </header>

        {loadIssues.length > 0 ? (
          <div className={`${baseClass}__message ${baseClass}__message--error`} role="alert">
            <strong>Một số dữ liệu chưa tải được.</strong>
            <ul>{loadIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
            <button onClick={() => window.location.reload()} type="button">Tải lại dữ liệu</button>
          </div>
        ) : null}

        <section className={`${baseClass}__layout`}>
          <div className={`${baseClass}__panel`}>
            <section className={`${baseClass}__field-group`}>
              <div className={`${baseClass}__field-group-head`}>
                <h2>Phạm vi site</h2>
                {hasUnsavedWork ? <span>Chưa lưu</span> : <span>Đã đồng bộ</span>}
              </div>
              <label>
                Site
                <select onChange={(event) => changeSite(event.target.value)} value={selectedSiteID}>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name || site.code || `Site ${site.id}`}
                    </option>
                  ))}
                </select>
              </label>
              <div className={`${baseClass}__usage-grid`}>
                <article>
                  <strong>{usageSummary ? usageSummary.inheritCount : '—'}</strong>
                  <span>Trang kế thừa hero site</span>
                </article>
                <article>
                  <strong>{usageSummary ? usageSummary.overrideCount : '—'}</strong>
                  <span>Trang ghi đè riêng</span>
                </article>
                <article>
                  <strong>{usageSummary ? usageSummary.legacyCount : '—'}</strong>
                  <span>Trang dùng phương án tương thích</span>
                </article>
              </div>
              <div className={`${baseClass}__impact`}>
                <strong>Tác động: toàn hệ → site → page</strong>
                {isSiteContextLoading ? <p>Đang phân tích tác động theo page...</p> : null}
                {siteContextIssues.length > 0 ? (
                  <p role="alert">{siteContextIssues.join(' ')}</p>
                ) : usageSummary ? (
                  <p>
                    Chỉ {usageSummary.inheritCount} trang đang kế thừa sẽ đổi theo.{' '}
                    {usageSummary.overrideCount} trang ghi đè riêng không bị ảnh hưởng.
                  </p>
                ) : (
                  <p>Chưa có dữ liệu để xác nhận phạm vi tác động.</p>
                )}
                {usageSummary?.affectedPages?.length ? (
                  <ul>
                    {usageSummary.affectedPages.map((page) => (
                      <li key={page.id}>
                        <Link href={`/admin/collections/pages/${page.id}`}>{page.title}</Link>
                        <span>{page.pathname}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Chưa có trang high-impact nào đang kế thừa hero mặc định của site.</p>
                )}
              </div>
            </section>

            <section className={`${baseClass}__field-group`}>
              <div className={`${baseClass}__field-group-head`}>
                <h2>Giao diện site</h2>
                <span>{hasUnsavedChanges ? 'Chưa lưu' : 'Đã đồng bộ'}</span>
              </div>
              <div className={`${baseClass}__segments`}>
                <label>
                  Mã giao diện
                  <select onChange={(event) => updateField('themeKey', event.target.value)} value={form.themeKey}>
                    {themeKeyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Preset giao diện
                  <select onChange={(event) => updateField('themePreset', event.target.value)} value={form.themePreset}>
                    {presets.length > 0
                      ? presets.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {displayThemePreset(preset)}
                          </option>
                        ))
                      : themePresetKeyOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                  </select>
                </label>
              </div>
              <label>
                Chữ logo
                <input onChange={(event) => updateField('logoText', event.target.value)} value={form.logoText} />
              </label>
            </section>

            <section className={`${baseClass}__field-group`}>
              <div className={`${baseClass}__field-group-head`}>
                <h2>Trình bày hero</h2>
                <span>{hasUnsavedHeroChanges ? 'Chưa lưu' : 'Đã đồng bộ'}</span>
              </div>
              <p className={`${baseClass}__hint`}>
                Mặc định của site chỉ điều khiển preset và hành vi. Tiêu đề, CTA, ảnh, slide và
                video vẫn được nhập ở từng trang.
              </p>
              <div className={`${baseClass}__preset-grid`}>
                {heroPresets.map((preset) => {
                  const meta = getHeroPresentationAdminMeta(preset.baseTemplate)
                  const isSelected = String(preset.id) === String(heroForm.presentationPreset)

                  return (
                    <button
                      className={`${baseClass}__preset-card${isSelected ? ` ${baseClass}__preset-card--selected` : ''}`}
                      key={preset.id}
                      onClick={() => updateHeroField('presentationPreset', String(preset.id))}
                      type="button"
                    >
                      <div
                        className={`${baseClass}__preset-canvas`}
                        data-template={preset.baseTemplate || 'centered-visual'}
                      >
                        <span>{meta?.visualLabel || 'Preset hero'}</span>
                      </div>
                      <div className={`${baseClass}__preset-copy`}>
                        <strong>{displayHeroPreset(preset)}</strong>
                        <p>{meta?.description || preset.description || 'Chọn preset để xem chi tiết.'}</p>
                      </div>
                      <div className={`${baseClass}__preset-chips`}>
                        {(meta?.businessFit || []).map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </div>
                      <ul className={`${baseClass}__preset-summary`}>
                        {(meta?.requirementSummary || []).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </button>
                  )
                })}
              </div>
              <div className={`${baseClass}__segments`}>
                <label>
                  Hành vi nghiệp vụ
                  <select
                    onChange={(event) => updateHeroField('variant', event.target.value)}
                    value={heroForm.variant}
                  >
                    <option value="standard">Tiêu chuẩn</option>
                    <option value="retail-departures">Lịch khởi hành bán lẻ</option>
                    <option value="planner">Lập hành trình</option>
                    <option value="utility">Tiện ích</option>
                  </select>
                </label>
              </div>
              <div className={`${baseClass}__requirement-list`}>
                {heroRequirements.map((item) => (
                  <div
                    className={`${baseClass}__requirement ${baseClass}__requirement--${getHeroRequirementTone(item.status)}`}
                    key={item.key}
                  >
                    <strong>{item.label}</strong>
                    <p>{item.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className={`${baseClass}__field-group`}>
              <div className={`${baseClass}__field-group-head`}>
                <h2>Màu sắc</h2>
                <span>{form.backgroundStyle}</span>
              </div>
              <div className={`${baseClass}__swatches`}>
                {[
                  ['brandColor', 'Màu thương hiệu'],
                  ['accentColor', 'Màu nhấn'],
                  ['surfaceColor', 'Màu bề mặt'],
                  ['surfaceStrongColor', 'Màu bề mặt đậm'],
                ].map(([field, label]) => (
                  <label className={`${baseClass}__color-field`} key={field}>
                    {label}
                    <span>
                      <input
                        aria-label={`${label} color picker`}
                        onChange={(event) => updateField(field as keyof ThemeFormState, event.target.value)}
                        type="color"
                        value={normalizeColorInputValue(form[field as keyof ThemeFormState])}
                      />
                      <input
                        onChange={(event) => updateField(field as keyof ThemeFormState, event.target.value)}
                        value={form[field as keyof ThemeFormState]}
                      />
                    </span>
                  </label>
                ))}
                <label>
                  Nền
                  <select
                    onChange={(event) => updateField('backgroundStyle', event.target.value)}
                    value={form.backgroundStyle}
                  >
                    {backgroundStyleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className={`${baseClass}__field-group`}>
              <div className={`${baseClass}__field-group-head`}>
                <h2>Chữ, hình khối và bố cục</h2>
                <span>{form.layoutStyle}</span>
              </div>
              <div className={`${baseClass}__segments`}>
                <label>
                  Bo góc
                  <select onChange={(event) => updateField('radius', event.target.value)} value={form.radius}>
                    {radiusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Khoảng cách
                  <select onChange={(event) => updateField('spacingScale', event.target.value)} value={form.spacingScale}>
                    {spacingScaleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Phông chữ
                  <select onChange={(event) => updateField('fontPreset', event.target.value)} value={form.fontPreset}>
                    {fontPresetOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Nút bấm
                  <select onChange={(event) => updateField('buttonStyle', event.target.value)} value={form.buttonStyle}>
                    {buttonStyleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Bố cục
                  <select onChange={(event) => updateField('layoutStyle', event.target.value)} value={form.layoutStyle}>
                    {layoutStyleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <div className={`${baseClass}__actions`}>
              <button disabled={savingScope !== null || !selectedSettingsID || !hasUnsavedChanges} onClick={() => save('theme')} type="button">
                {savingScope === 'theme' ? 'Đang lưu giao diện...' : 'Lưu giao diện'}
              </button>
              <button disabled={savingScope !== null || !selectedSettingsID || !hasUnsavedHeroChanges} onClick={() => save('hero')} type="button">
                {savingScope === 'hero' ? 'Đang lưu hero...' : 'Lưu hero mặc định'}
              </button>
              <button
                disabled={
                  savingScope !== null ||
                  !selectedSettingsID ||
                  (!hasUnsavedChanges && !hasUnsavedHeroChanges)
                }
                onClick={() => save('all')}
                type="button"
              >
                {savingScope === 'all' ? 'Đang lưu tất cả...' : 'Lưu tất cả'}
              </button>
              {selectedSite ? (
                <Link href={`/admin/collections/site-settings/${selectedSettingsID}`}>Mở cấu hình site</Link>
              ) : null}
            </div>

            {notice ? (
              <div className={`${baseClass}__message ${baseClass}__message--${notice.tone}`}>
                {notice.text}
              </div>
            ) : null}
          </div>

          <aside className={`${baseClass}__preview`} style={previewStyle}>
            <div className={`${baseClass}__preview-head`}>
              <div>
                <p>{selectedSite?.name || selectedSite?.code || 'Chưa chọn site'}</p>
                <strong>{presetLabel}</strong>
              </div>
              <span>{hasUnsavedWork ? 'Xem trước chưa lưu' : 'Xem trước đang áp dụng'}</span>
            </div>

            <div className={`${baseClass}__preview-card`}>
              <span>Giao diện site</span>
              <h2>{form.logoText}</h2>
              <p>Thương hiệu {previewTokens.brandColor} · Nhấn {previewTokens.accentColor}</p>
              <button type="button">CTA chính</button>
            </div>

            <div className={`${baseClass}__preview-card`}>
              <span>Hero mặc định của site</span>
              <h2>{displayHeroPreset(selectedHeroPreset)}</h2>
              <p>
                Mẫu {selectedHeroDefinition?.label || 'không áp dụng'} · Biến thể{' '}
                {heroVariantLabels[heroForm.variant] || heroForm.variant}
              </p>
            </div>

            <div
              className={`${baseClass}__hero-preview`}
              data-template={selectedHeroPreset?.baseTemplate || 'centered-visual'}
            >
              <div className={`${baseClass}__hero-preview-copy`}>
                <span>{displayHeroPreset(selectedHeroPreset)}</span>
                <h2>Trải nghiệm WingsGroup theo từng thị trường</h2>
                <p>
                  Xem trước mô phỏng cách mẫu sắp xếp tiêu đề, CTA và vùng media. Nội dung thật
                  vẫn lấy từ từng trang.
                </p>
                <div className={`${baseClass}__hero-preview-actions`}>
                  <button type="button">Tư vấn hành trình</button>
                  <button type="button">Xem dịch vụ</button>
                </div>
              </div>

              <div className={`${baseClass}__hero-preview-visual`} aria-hidden="true">
                {selectedHeroPreset?.baseTemplate === 'cinematic-carousel' ? (
                  <>
                    <div className={`${baseClass}__hero-slide ${baseClass}__hero-slide--active`}>
                      Slide ảnh 1
                    </div>
                    <div className={`${baseClass}__hero-slide`}>Slide ảnh 2</div>
                    <div className={`${baseClass}__hero-dots`}>
                      <i />
                      <i />
                      <i />
                    </div>
                  </>
                ) : selectedHeroPreset?.baseTemplate === 'video-background' ? (
                  <>
                    <div className={`${baseClass}__hero-video`}>Video nền</div>
                    <div className={`${baseClass}__hero-poster`}>Poster fallback</div>
                  </>
                ) : selectedHeroPreset?.baseTemplate === 'planner-split' ? (
                  <>
                    <div className={`${baseClass}__hero-media-card`}>Ảnh hero</div>
                    <div className={`${baseClass}__hero-panel`}>Planner panel</div>
                  </>
                ) : selectedHeroPreset?.baseTemplate === 'layered-visuals' ? (
                  <>
                    <div className={`${baseClass}__hero-media-card`}>Ảnh chính</div>
                    <div className={`${baseClass}__hero-float ${baseClass}__hero-float--one`}>Ảnh phụ</div>
                    <div className={`${baseClass}__hero-float ${baseClass}__hero-float--two`}>Nhãn</div>
                  </>
                ) : selectedHeroPreset?.baseTemplate === 'gradient-mesh' ? (
                  <div className={`${baseClass}__hero-mesh`}>Gradient mesh</div>
                ) : (
                  <div className={`${baseClass}__hero-media-card`}>Ảnh hero</div>
                )}
              </div>

              <div className={`${baseClass}__hero-preview-notes`}>
                <strong>{selectedHeroDefinition?.label || selectedHeroPreset?.baseTemplate || 'Mẫu'}</strong>
                <p>{selectedHeroMeta?.visualLabel || selectedHeroPreset?.description || 'Chọn preset để xem mô tả.'}</p>
              </div>
            </div>

            <div className={`${baseClass}__preview-summary`}>
              <p>Mã giao diện: {form.themeKey}</p>
              <p>Preset: {previewTheme.themePreset}</p>
              <p>Nguồn hero cho trang kế thừa: mặc định của site</p>
              <p>Mẫu hiện chọn: {selectedHeroDefinition?.label || 'không áp dụng'}</p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}
