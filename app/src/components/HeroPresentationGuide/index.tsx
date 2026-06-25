'use client'

import React, { useEffect, useState } from 'react'
import { useAllFormFields } from '@payloadcms/ui'

import {
  evaluateHeroPresentationRequirements,
  getHeroPresentationAdminMeta,
  getHeroRequirementTone,
} from '@/heros/presentations/admin'
import { resolveHeroPresentationConfig } from '@/heros/presentations/resolver'
import type { HeroPresentationKey } from '@/heros/presentations/types'

import './index.scss'

type FormFieldValue = {
  value?: unknown
}

type HeroPresentationPresetDoc = {
  baseTemplate?: HeroPresentationKey
  description?: string
  id: number | string
  key?: string
  name?: string
}

type SiteSettingsDoc = {
  heroDefaults?: {
    presentationPreset?: HeroPresentationPresetDoc | number | string
    variant?: string
  }
}

const fetchJSON = async <T,>(url: string): Promise<T | null> => {
  const response = await fetch(url, {
    credentials: 'include',
  })

  if (!response.ok) {
    return null
  }

  return (await response.json()) as T
}

const getFieldValue = (fields: Record<string, FormFieldValue>, paths: string[]) => {
  for (const path of paths) {
    const value = fields[path]?.value

    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  return undefined
}

const stringValue = (
  fields: Record<string, FormFieldValue>,
  paths: string[],
  fallback: string,
) => {
  const value = getFieldValue(fields, paths)

  return typeof value === 'string' && value ? value : fallback
}

const relationID = (value: unknown): string => {
  if (typeof value === 'number' || typeof value === 'string') {
    return String(value)
  }

  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: number | string }).id

    return id === undefined || id === null ? '' : String(id)
  }

  return ''
}

const asArray = (value: unknown) => (Array.isArray(value) ? value : [])

const asObject = <T extends object>(value: unknown): T | null =>
  value && typeof value === 'object' ? (value as T) : null

export default function HeroPresentationGuide() {
  const [fields] = useAllFormFields()
  const values = fields as Record<string, FormFieldValue>
  const type = stringValue(values, ['hero.type'], 'lowImpact')
  const presentationMode = stringValue(values, ['hero.presentationMode'], 'inherit')
  const behaviorMode = stringValue(values, ['hero.behaviorMode'], 'inherit')
  const variant = stringValue(values, ['hero.variant'], 'standard')
  const legacyPresentation = stringValue(values, ['hero.presentation'], '')
  const siteRaw = getFieldValue(values, ['site', 'site.id'])
  const pagePresetRaw = getFieldValue(values, ['hero.presentationPreset'])
  const visualMedia = getFieldValue(values, ['hero.media'])
  const supportingMedia = asArray(getFieldValue(values, ['hero.supportingMedia']))
  const slides = asArray(getFieldValue(values, ['hero.slides']))
  const video = asObject<{
    desktopVideo?: unknown | null
    mobileVideo?: unknown | null
    poster?: unknown | null
  }>(getFieldValue(values, ['hero.video']))
  const siteID = relationID(siteRaw)
  const overridePresetInline = asObject<HeroPresentationPresetDoc>(pagePresetRaw)
  const overridePresetID = relationID(pagePresetRaw)

  const [siteDefaults, setSiteDefaults] = useState<SiteSettingsDoc['heroDefaults'] | null>(null)
  const [overridePreset, setOverridePreset] = useState<HeroPresentationPresetDoc | null>(null)
  const [siteResolution, setSiteResolution] = useState<'idle' | 'missing' | 'resolved' | 'unresolved'>('idle')

  useEffect(() => {
    const loadSiteDefaults = async () => {
      if (!siteID) {
        setSiteDefaults(null)
        setSiteResolution('unresolved')
        return
      }

      const settingsResult = await fetchJSON<{ docs?: SiteSettingsDoc[] }>(
        `/api/site-settings?depth=1&limit=1&where[site][equals]=${siteID}`,
      )
      const settings = settingsResult?.docs?.[0]

      if (!settings?.heroDefaults) {
        setSiteDefaults(null)
        setSiteResolution('missing')
        return
      }

      setSiteDefaults(settings.heroDefaults)
      setSiteResolution('resolved')
    }

    void loadSiteDefaults()
  }, [siteID])

  useEffect(() => {
    const loadOverridePreset = async () => {
      if (overridePresetInline?.baseTemplate) {
        setOverridePreset(overridePresetInline)
        return
      }

      if (!overridePresetID || presentationMode !== 'override') {
        setOverridePreset(null)
        return
      }

      const preset = await fetchJSON<HeroPresentationPresetDoc>(
        `/api/hero-presentation-presets/${overridePresetID}?depth=0`,
      )

      setOverridePreset(preset)
    }

    void loadOverridePreset()
  }, [overridePresetID, overridePresetInline, presentationMode])

  const resolved = resolveHeroPresentationConfig({
    hero: {
      behaviorMode: behaviorMode === 'override' ? 'override' : 'inherit',
      presentation: legacyPresentation || null,
      presentationMode:
        presentationMode === 'inherit' || presentationMode === 'override' ? presentationMode : null,
      presentationPreset: overridePresetInline?.baseTemplate ? overridePresetInline : overridePreset,
      variant,
    },
    siteDefaults,
  })

  const meta = getHeroPresentationAdminMeta(resolved.key)
  const requirements = evaluateHeroPresentationRequirements({
    key: resolved.key,
    slides: slides as Array<{ media?: unknown | null }>,
    supportingMedia: supportingMedia as unknown[],
    variant: variant || siteDefaults?.variant,
    video,
    visualMedia,
  })
  const priorityRequirements = requirements.filter((item) => item.status !== 'not-needed')
  const secondaryRequirements = requirements.filter((item) => item.status === 'not-needed')
  const overrideSelectionMissing =
    presentationMode === 'override' &&
    !overridePresetInline?.baseTemplate &&
    !overridePreset?.baseTemplate
  const unresolvedSitePreview = presentationMode === 'inherit' && siteResolution !== 'resolved'

  if (type !== 'highImpact') {
    return (
      <section className="hero-presentation-guide hero-presentation-guide--muted">
        <h3>Hero preview</h3>
        <p>Chọn `High Impact` để bật site inheritance, page override và media guide.</p>
      </section>
    )
  }

  return (
    <section className="hero-presentation-guide" data-template={resolved.key}>
      <div className="hero-presentation-guide__copy">
        <span>Preview cấu trúc hero</span>
        <h3>{meta?.label || resolved.key}</h3>
        <p>{meta?.description || 'Preview mô phỏng cấu trúc hero đã resolve.'}</p>
      </div>

      <div className="hero-presentation-guide__canvas" aria-hidden="true">
        <div className="hero-presentation-guide__headline">Headline / CTA</div>
        <div className="hero-presentation-guide__visual">
          {meta?.visualLabel || resolved.key}
        </div>
      </div>

      <div className="hero-presentation-guide__facts">
        <span>
          Nguồn áp dụng:{' '}
          {overrideSelectionMissing
            ? 'page chưa chọn preset'
            : unresolvedSitePreview
              ? 'site chưa resolve'
              : resolved.source}
        </span>
        <span>Presentation mode: {presentationMode}</span>
        <span>Business behavior: {variant || siteDefaults?.variant || 'standard'}</span>
      </div>

      {overrideSelectionMissing ? (
        <div className="hero-presentation-guide__warning">
          Page đang ở chế độ override nhưng chưa chọn preset. Preview hiện tại chỉ là fallback trung
          lập, chưa phải page-level hero thực tế.
        </div>
      ) : null}

      {unresolvedSitePreview ? (
        <div className="hero-presentation-guide__warning">
          Không resolve được site-settings hiện tại, nên preview này chỉ là fallback trung lập chứ
          chưa phản ánh chính xác site default hero.
        </div>
      ) : null}

      <div className="hero-presentation-guide__requirements">
        <div>
          <strong>Cần cấu hình ngay</strong>
          {priorityRequirements.length ? (
            <ul>
              {priorityRequirements.map((item) => (
                <li
                  className={`hero-presentation-guide__requirement hero-presentation-guide__requirement--${getHeroRequirementTone(item.status)}`}
                  key={item.key}
                >
                  <span>{item.label}</span>
                  <small>{item.description}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p>Preset này không yêu cầu thêm media bắt buộc.</p>
          )}
        </div>
        <div>
          <strong>Có thể bỏ qua</strong>
          {secondaryRequirements.length ? (
            <ul>
              {secondaryRequirements.map((item) => (
                <li className="hero-presentation-guide__requirement hero-presentation-guide__requirement--muted" key={item.key}>
                  <span>{item.label}</span>
                  <small>{item.description}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p>Không có nhóm field phụ nào cần hạ ưu tiên.</p>
          )}
        </div>
      </div>

      <p className="hero-presentation-guide__meta">
        Page có thể `inherit` site default hoặc `override` preset riêng. Media luôn thuộc page hiện
        tại, kể cả khi presentation đang lấy từ site.
      </p>
    </section>
  )
}
