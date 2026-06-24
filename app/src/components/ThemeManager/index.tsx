'use client'

import Link from 'next/link'
import React, { useEffect, useMemo, useState } from 'react'

import './index.scss'

import { getSiteThemeTokens } from '@/utilities/siteTheme'
import {
  backgroundStyleOptions,
  buttonStyleOptions,
  defaultThemePresetByKey,
  fontPresetOptions,
  layoutStyleOptions,
  radiusOptions,
  resolveThemePresetTokens,
  spacingScaleOptions,
  themeKeyOptions,
  themePresetKeyOptions,
} from '@/utilities/themeTokens'
import { heroPresentationDefinitions } from '@/heros/presentations/registry'

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
type SpacingScale = (typeof spacingScaleOptions)[number]['value']

const baseClass = 'theme-manager'

const getOptionLabel = <T extends string>(
  options: readonly { label: string; value: T }[],
  value?: string,
) => options.find((option) => option.value === value)?.label || value || ''

const normalizeColorInputValue = (value: string) =>
  /^#(?:[0-9a-fA-F]{6})$/.test(value) ? value : '#000000'

const getPresetLabel = (value: string, presets: ThemePresetDoc[]) => {
  const preset =
    presets.find((item) => String(item.id) === String(value)) ||
    presets.find((item) => item.key === value)

  if (preset) {
    return preset.name || preset.key || `Preset ${preset.id}`
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
  themeKey: 'wings-group',
  themePreset: '',
})

const defaultHeroFormState = (): HeroFormState => ({
  presentationPreset: '',
  variant: 'standard',
})

const fetchJSON = async <T,>(url: string): Promise<T | null> => {
  const response = await fetch(url, {
    credentials: 'include',
  })

  if (!response.ok) {
    return null
  }

  return (await response.json()) as T
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
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [savedSignature, setSavedSignature] = useState('')
  const [savedHeroSignature, setSavedHeroSignature] = useState('')

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

      const siteDocs = siteResult?.docs ?? []
      const presetDocs = presetResult?.docs ?? []
      const siteID = String(siteDocs[0]?.id ?? '')

      setUser(me?.user)
      setSites(siteDocs)
      setPresets(presetDocs)
      setHeroPresets(heroPresetResult?.docs ?? [])
      setSelectedSiteID((current) => current || siteID)
      setIsLoading(false)
    }

    void load()
  }, [])

  useEffect(() => {
    const loadSiteSettings = async () => {
      if (!selectedSiteID) {
        return
      }

      setMessage(null)

      const settingsResult = await fetchJSON<{ docs?: SiteSettingsDoc[] }>(
        `/api/site-settings?depth=1&limit=1&where[site][equals]=${selectedSiteID}`,
      )
      const settings = settingsResult?.docs?.[0]

      if (!settings) {
        setForm(defaultFormState())
        setHeroForm(defaultHeroFormState())
        setSelectedSettingsID(null)
        return
      }

      const themePresetDoc =
        typeof settings.branding?.themePreset === 'object' && settings.branding.themePreset
          ? settings.branding.themePreset
          : null
      const themePresetKey =
        themePresetDoc?.key ||
        (typeof settings.branding?.themePreset === 'string' ? settings.branding.themePreset : 'corporate')
      const matchedPreset =
        presets.find((preset) => String(preset.id) === String(themePresetDoc?.id)) ||
        presets.find((preset) => preset.key === themePresetKey) ||
        presets[0]
      const resolvedPreset = resolveThemePresetTokens(settings.branding?.themeKey || 'wings-group', {
        key: matchedPreset?.key || themePresetKey,
        tokens:
          themePresetDoc?.tokens ||
          matchedPreset?.tokens ||
          defaultThemePresetByKey.corporate,
      })

      setSelectedSettingsID(settings.id)
      const nextForm = {
        accentColor: settings.branding?.accentColor || resolvedPreset.accentColor,
        backgroundStyle: settings.branding?.backgroundStyle || resolvedPreset.backgroundStyle,
        brandColor: settings.branding?.brandColor || resolvedPreset.brandColor,
        buttonStyle: settings.branding?.buttonStyle || resolvedPreset.buttonStyle,
        fontPreset: settings.branding?.fontPreset || resolvedPreset.fontPreset,
        layoutStyle: settings.branding?.layoutStyle || resolvedPreset.layoutStyle,
        logoText: settings.branding?.logoText || settings.siteName || 'WingsGroup',
        radius: settings.branding?.radius || resolvedPreset.radius,
        spacingScale: settings.branding?.spacingScale || resolvedPreset.spacingScale,
        surfaceColor: settings.branding?.surfaceColor || resolvedPreset.surfaceColor,
        surfaceStrongColor: settings.branding?.surfaceStrongColor || resolvedPreset.surfaceStrongColor,
        themeKey: settings.branding?.themeKey || 'wings-group',
        themePreset: String(matchedPreset?.id || ''),
      }

      setForm(nextForm)
      setSavedSignature(JSON.stringify(nextForm))

      const heroPresetDoc =
        typeof settings.heroDefaults?.presentationPreset === 'object' && settings.heroDefaults.presentationPreset
          ? settings.heroDefaults.presentationPreset
          : null
      const matchedHeroPreset =
        heroPresets.find((preset) => String(preset.id) === String(heroPresetDoc?.id)) ||
        heroPresets.find((preset) => preset.key === String(settings.heroDefaults?.presentationPreset || '')) ||
        heroPresets[0]
      const nextHeroForm = {
        presentationPreset: String(matchedHeroPreset?.id || ''),
        variant: settings.heroDefaults?.variant || 'standard',
      }
      setHeroForm(nextHeroForm)
      setSavedHeroSignature(JSON.stringify(nextHeroForm))
    }

    void loadSiteSettings()
  }, [heroPresets, presets, selectedSiteID])

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
  const selectedHeroPreset = heroPresets.find(
    (preset) => String(preset.id) === String(heroForm.presentationPreset),
  )
  const selectedHeroDefinition = heroPresentationDefinitions.find(
    (definition) => definition.value === selectedHeroPreset?.baseTemplate,
  )
  const hasUnsavedChanges = savedSignature !== JSON.stringify(form)
  const hasUnsavedHeroChanges = savedHeroSignature !== JSON.stringify(heroForm)

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

  const save = async () => {
    if (!selectedSettingsID) {
      setMessage('Không tìm thấy site settings cho site đã chọn.')
      return
    }

    setIsSaving(true)
    setMessage(null)

    const response = await fetch(`/api/site-settings/${selectedSettingsID}`, {
      body: JSON.stringify({
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
          themePreset: presets.find((preset) => String(preset.id) === String(form.themePreset))?.id || form.themePreset,
        },
        heroDefaults: {
          presentationPreset:
            heroPresets.find((preset) => String(preset.id) === String(heroForm.presentationPreset))?.id ||
            heroForm.presentationPreset ||
            null,
          variant: heroForm.variant,
        },
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'PATCH',
    })

    const data = (await response.json().catch(() => null)) as { errors?: Array<{ message?: string }>; message?: string } | null

    if (!response.ok) {
      setMessage(data?.message || data?.errors?.[0]?.message || 'Không lưu được theme.')
      setIsSaving(false)
      return
    }

    setSavedSignature(JSON.stringify(form))
    setSavedHeroSignature(JSON.stringify(heroForm))
    setMessage('Đã lưu theme và hero mặc định cho site.')
    setIsSaving(false)
  }

  const role = user?.role || 'editor'
  const canEdit = role === 'super-admin' || role === 'site-manager'

  if (isLoading) {
    return (
      <main className={baseClass}>
        <div className={`${baseClass}__shell`}>
          <p>Đang tải Theme Manager...</p>
        </div>
      </main>
    )
  }

  if (!canEdit) {
    return (
      <main className={baseClass}>
        <div className={`${baseClass}__shell`}>
          <header className={`${baseClass}__header`}>
            <div>
              <p>WingsGroup CMS</p>
              <h1>Theme Manager</h1>
              <span>Chỉ super-admin và site-manager mới được chỉnh theme.</span>
            </div>
            <Link href="/admin/console">Quay lại console</Link>
          </header>
        </div>
      </main>
    )
  }

  return (
    <main className={baseClass}>
      <div className={`${baseClass}__shell`}>
        <header className={`${baseClass}__header`}>
          <div>
            <p>WingsGroup CMS</p>
            <h1>Theme Manager</h1>
            <span>Chọn preset, tinh chỉnh token và lưu trực tiếp vào site-settings.</span>
          </div>
          <div className={`${baseClass}__header-actions`}>
            <Link href="/admin/collections/site-settings">Site settings</Link>
            <Link href="/admin/console">Quay lại console</Link>
          </div>
        </header>

        <section className={`${baseClass}__layout`}>
          <div className={`${baseClass}__panel`}>
            <section className={`${baseClass}__field-group`}>
              <div className={`${baseClass}__field-group-head`}>
                <h2>Preset</h2>
                {hasUnsavedChanges || hasUnsavedHeroChanges ? <span>Chưa lưu</span> : <span>Đã đồng bộ</span>}
              </div>
              <label>
                Site
                <select onChange={(event) => setSelectedSiteID(event.target.value)} value={selectedSiteID}>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name || site.code || `Site ${site.id}`}
                    </option>
                  ))}
                </select>
              </label>
              <div className={`${baseClass}__segments`}>
                <label>
                  Theme key
                  <select onChange={(event) => updateField('themeKey', event.target.value)} value={form.themeKey}>
                    {themeKeyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Preset
                  <select onChange={(event) => updateField('themePreset', event.target.value)} value={form.themePreset}>
                    {presets.length > 0
                      ? presets.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.name || preset.key || `Preset ${preset.id}`}
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
                Logo text
                <input onChange={(event) => updateField('logoText', event.target.value)} value={form.logoText} />
              </label>
            </section>

            <section className={`${baseClass}__field-group`}>
              <div className={`${baseClass}__field-group-head`}>
                <h2>Hero presentation</h2>
                <span>{hasUnsavedHeroChanges ? 'Chưa lưu' : 'Đã đồng bộ'}</span>
              </div>
              <div className={`${baseClass}__segments`}>
                <label>
                  Site default hero
                  <select
                    onChange={(event) => updateHeroField('presentationPreset', event.target.value)}
                    value={heroForm.presentationPreset}
                  >
                    {heroPresets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name || preset.key || `Hero preset ${preset.id}`}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Business behavior
                  <select
                    onChange={(event) => updateHeroField('variant', event.target.value)}
                    value={heroForm.variant}
                  >
                    <option value="standard">Standard</option>
                    <option value="retail-departures">Retail departures</option>
                    <option value="planner">Planner</option>
                    <option value="utility">Utility</option>
                  </select>
                </label>
              </div>
              <p className={`${baseClass}__hint`}>
                Site default chỉ điều khiển presentation và hành vi. Headline, CTA, ảnh, slide
                và video vẫn nằm trong từng page.
              </p>
            </section>

            <section className={`${baseClass}__field-group`}>
              <div className={`${baseClass}__field-group-head`}>
                <h2>Colors</h2>
                <span>{form.backgroundStyle}</span>
              </div>
              <div className={`${baseClass}__swatches`}>
                {[
                  ['brandColor', 'Brand'],
                  ['accentColor', 'Accent'],
                  ['surfaceColor', 'Surface'],
                  ['surfaceStrongColor', 'Surface strong'],
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
                  Background
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
                <h2>Typography, shape & layout</h2>
                <span>{form.layoutStyle}</span>
              </div>
              <div className={`${baseClass}__segments`}>
                <label>
                  Radius
                  <select onChange={(event) => updateField('radius', event.target.value)} value={form.radius}>
                    {radiusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Spacing
                  <select onChange={(event) => updateField('spacingScale', event.target.value)} value={form.spacingScale}>
                    {spacingScaleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Font
                  <select onChange={(event) => updateField('fontPreset', event.target.value)} value={form.fontPreset}>
                    {fontPresetOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Button
                  <select onChange={(event) => updateField('buttonStyle', event.target.value)} value={form.buttonStyle}>
                    {buttonStyleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Layout
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
              <button disabled={isSaving || !selectedSettingsID} onClick={save} type="button">
                {isSaving ? 'Đang lưu...' : 'Lưu theme'}
              </button>
              {selectedSite ? (
                <Link href={`/admin/collections/site-settings/${selectedSettingsID}`}>Mở site settings</Link>
              ) : null}
            </div>

            {message ? <div className={`${baseClass}__message`}>{message}</div> : null}
          </div>

          <aside className={`${baseClass}__preview`} style={previewStyle}>
            <div className={`${baseClass}__preview-head`}>
              <div>
                <p>{selectedSite?.name || selectedSite?.code || 'Chưa chọn site'}</p>
                <strong>{presetLabel}</strong>
              </div>
              <span>{hasUnsavedChanges ? 'Preview chưa lưu' : 'Preview live'}</span>
            </div>

            <div className={`${baseClass}__preview-card`}>
              <span>Header</span>
              <h2>{form.logoText}</h2>
              <p>Brand {previewTokens.brandColor} · Accent {previewTokens.accentColor}</p>
              <button type="button">Primary CTA</button>
            </div>

            <div className={`${baseClass}__preview-card`}>
              <span>Hero default</span>
              <h2>{selectedHeroPreset?.name || 'Chưa chọn'}</h2>
              <p>
                Template {selectedHeroPreset?.baseTemplate || 'n/a'} · {heroForm.variant}
              </p>
            </div>

            <div
              className={`${baseClass}__hero-preview`}
              data-template={selectedHeroPreset?.baseTemplate || 'centered-visual'}
            >
              <div className={`${baseClass}__hero-preview-copy`}>
                <span>{selectedHeroPreset?.name || 'Hero presentation'}</span>
                <h2>Trải nghiệm WingsGroup theo từng thị trường</h2>
                <p>
                  Preview mô phỏng cách template sắp xếp headline, CTA và vùng media. Nội dung thật
                  vẫn lấy từ từng Page.
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
                ) : (
                  <div className={`${baseClass}__hero-media-card`}>Ảnh hero</div>
                )}
              </div>

              <div className={`${baseClass}__hero-preview-notes`}>
                <strong>{selectedHeroDefinition?.label || selectedHeroPreset?.baseTemplate || 'Template'}</strong>
                <p>{selectedHeroDefinition?.description || selectedHeroPreset?.description || 'Chọn preset để xem mô tả.'}</p>
              </div>
            </div>

            <div className={`${baseClass}__preview-row`}>
              <div className={`${baseClass}__preview-chip`}>Card</div>
              <div className={`${baseClass}__preview-chip`}>CTA</div>
              <div className={`${baseClass}__preview-chip`}>Form</div>
            </div>

            <div className={`${baseClass}__preview-form`}>
              <label>
                Lead form
                <input readOnly value="customer@example.com" />
              </label>
              <button type="button">Gửi yêu cầu</button>
            </div>

            <div className={`${baseClass}__preview-summary`}>
              <p>Theme key: {form.themeKey}</p>
              <p>Preset: {previewTheme.themePreset}</p>
              <p>
                Hero templates:{' '}
                {heroPresentationDefinitions.map((definition) => definition.value).join(', ')}
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}
