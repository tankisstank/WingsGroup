'use client'

import React, { useEffect } from 'react'
import { FieldError, FieldLabel, useDocumentInfo, useField, useLocale } from '@payloadcms/ui'
import {
  resolveNearestEditorialBadgeLabel,
  setEditorialBadgeStoredLabel,
} from '@/tours/editorialBadges'
import { tourAuthoringRelationID, type TourAuthoringRelation } from '@/utilities/tourAuthoring'

type Props = {
  field?: {
    admin?: { description?: string }
    label?: string
    required?: boolean
  }
  path: string
  readOnly?: boolean
}

export default function EditorialBadgeKindField({ field, path, readOnly }: Props) {
  const localeContext = useLocale?.()
  const currentLocale = localeContext?.code || 'vi'
  const { errorMessage, setValue: setKind, showError, value: kindValue } = useField<string>({ path })
  const labelPath = path.replace(/\.kind$/, '.label')
  const { setValue: setLabel, value: currentLabelValue } = useField<string>({ path: labelPath })

  const { data } = useDocumentInfo()
  const { value: siteFieldValue } = useField<TourAuthoringRelation>({ path: 'site' })
  const siteRelation = (siteFieldValue ?? data?.site) as TourAuthoringRelation
  const siteId = tourAuthoringRelationID(siteRelation)
  const siteKey = siteId !== undefined && siteId !== null ? String(siteId) : 'default'

  const label = field?.label || 'Loại nhãn'
  const currentKind = typeof kindValue === 'string' ? kindValue : ''

  // Whenever the editor enters or modifies the label for an active kind, persist it as the last-used label
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      currentKind &&
      typeof currentLabelValue === 'string' &&
      currentLabelValue.trim()
    ) {
      setEditorialBadgeStoredLabel(
        window.localStorage,
        siteKey,
        currentLocale,
        currentKind,
        currentLabelValue.trim(),
      )
    }
  }, [currentKind, currentLabelValue, currentLocale, siteKey])

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedKind = event.target.value
    setKind(selectedKind)
    if (selectedKind) {
      const nearestLabel = resolveNearestEditorialBadgeLabel({
        docBadges: (data as { editorialBadges?: unknown } | undefined)?.editorialBadges,
        kind: selectedKind,
        locale: currentLocale,
        siteKey,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      })
      if (nearestLabel && typeof setLabel === 'function') {
        setLabel(nearestLabel)
      }
    }
  }

  return (
    <div id={`field-${path.replace(/\./g, '-')}`} style={{ marginBottom: '1rem' }}>
      <FieldLabel htmlFor={path} label={label} path={path} required={field?.required} />
      <select
        aria-invalid={showError || undefined}
        className="form-control"
        disabled={readOnly}
        id={path}
        onChange={handleChange}
        style={{
          background: 'var(--theme-input-bg)',
          border: '1px solid var(--theme-elevation-200)',
          borderRadius: 'var(--style-radius-s, 4px)',
          color: 'var(--theme-elevation-800)',
          fontSize: '0.875rem',
          padding: '0.5rem 0.75rem',
          width: '100%',
        }}
        value={currentKind}
      >
        <option value="">-- Chọn loại nhãn --</option>
        <option value="hot">Tour hot (hot)</option>
        <option value="specialized">Chuyên biệt (specialized)</option>
        <option value="vip">VIP (vip)</option>
      </select>
      <p style={{ color: 'var(--theme-elevation-600)', fontSize: '0.8rem', margin: '0.35rem 0 0' }}>
        {field?.admin?.description ||
          'Chọn loại nhãn biên tập. Khi chọn, CMS tự động điền nhãn đã dùng gần nhất hoặc nhãn mặc định theo locale và có thể tùy chỉnh.'}
      </p>
      <FieldError message={errorMessage} path={path} showError={showError} />
    </div>
  )
}

