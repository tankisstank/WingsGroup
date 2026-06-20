'use client'

import React, { useMemo } from 'react'
import { useAllFormFields } from '@payloadcms/ui'

import './index.scss'

type FormFieldValue = {
  value?: unknown
}

const stringValue = (fields: Record<string, FormFieldValue>, path: string, fallback: string) => {
  const value = fields[path]?.value
  return typeof value === 'string' && value ? value : fallback
}

const radiusByScale: Record<string, string> = {
  lg: '16px',
  md: '10px',
  sm: '6px',
  xl: '24px',
}

const spacingByScale: Record<string, { gap: string; pad: string }> = {
  airy: { gap: '1.35rem', pad: '1.65rem' },
  compact: { gap: '0.7rem', pad: '1rem' },
  standard: { gap: '1rem', pad: '1.25rem' },
}

const headingFontByPreset: Record<string, string> = {
  editorial: 'Georgia, serif',
  modern: 'Inter, system-ui, sans-serif',
  premium: 'Georgia, serif',
  retail: 'Arial, system-ui, sans-serif',
  system: 'system-ui, sans-serif',
}

const buttonStyle = (style: string, brand: string, accent: string) => {
  if (style === 'outline') {
    return {
      background: 'transparent',
      border: brand,
      radius: '10px',
      text: brand,
    }
  }

  if (style === 'soft') {
    return {
      background: `color-mix(in oklch, ${brand} 12%, white)`,
      border: `color-mix(in oklch, ${brand} 22%, white)`,
      radius: '14px',
      text: `color-mix(in oklch, ${brand} 84%, black)`,
    }
  }

  if (style === 'pill') {
    return {
      background: `linear-gradient(135deg, ${brand}, ${accent})`,
      border: 'transparent',
      radius: '999px',
      text: 'white',
    }
  }

  return {
    background: `linear-gradient(135deg, ${brand}, ${accent})`,
    border: 'transparent',
    radius: '10px',
    text: 'white',
  }
}

export default function ThemePresetPreviewField() {
  const [fields] = useAllFormFields()
  const values = fields as Record<string, FormFieldValue>

  const tokens = {
    accentColor: stringValue(values, 'tokens.accentColor', '#F59E0B'),
    backgroundStyle: stringValue(values, 'tokens.backgroundStyle', 'soft-gradient'),
    brandColor: stringValue(values, 'tokens.brandColor', '#0F172A'),
    buttonStyle: stringValue(values, 'tokens.buttonStyle', 'solid'),
    fontPreset: stringValue(values, 'tokens.fontPreset', 'system'),
    layoutStyle: stringValue(values, 'tokens.layoutStyle', 'corporate'),
    radius: stringValue(values, 'tokens.radius', 'lg'),
    spacingScale: stringValue(values, 'tokens.spacingScale', 'standard'),
    surfaceColor: stringValue(values, 'tokens.surfaceColor', '#F8FAFC'),
    surfaceStrongColor: stringValue(values, 'tokens.surfaceStrongColor', '#E2E8F0'),
  }
  const presetName = stringValue(values, 'name', 'Theme preset')

  const preview = useMemo(() => {
    const spacing = spacingByScale[tokens.spacingScale] || spacingByScale.standard
    const button = buttonStyle(tokens.buttonStyle, tokens.brandColor, tokens.accentColor)

    return {
      '--preview-accent': tokens.accentColor,
      '--preview-brand': tokens.brandColor,
      '--preview-button-bg': button.background,
      '--preview-button-border': button.border,
      '--preview-button-radius': button.radius,
      '--preview-button-text': button.text,
      '--preview-gap': spacing.gap,
      '--preview-heading-font': headingFontByPreset[tokens.fontPreset] || headingFontByPreset.system,
      '--preview-pad': spacing.pad,
      '--preview-radius': radiusByScale[tokens.radius] || radiusByScale.lg,
      '--preview-surface': tokens.surfaceColor,
      '--preview-surface-strong': tokens.surfaceStrongColor,
    } as React.CSSProperties
  }, [tokens])

  return (
    <section className="theme-preset-preview">
      <div className="theme-preset-preview__intro">
        <h3>Preview giao diện</h3>
        <p>Xem nhanh màu, bo góc, khoảng cách, font và kiểu nút trước khi lưu preset.</p>
      </div>

      <div
        className="theme-preset-preview__canvas"
        data-background-style={tokens.backgroundStyle}
        data-layout-style={tokens.layoutStyle}
        style={preview}
      >
        <div className="theme-preset-preview__nav">
          <strong>{presetName}</strong>
          <span>{tokens.layoutStyle}</span>
        </div>

        <div className="theme-preset-preview__hero">
          <p className="theme-preset-preview__kicker">WingsGroup</p>
          <h4>Trang bán hàng và nội dung sẽ đổi theo preset này</h4>
          <p>
            Preview mô phỏng hero, card nội dung và CTA để người quản trị thấy tác động trực quan
            của token theme.
          </p>
          <div className="theme-preset-preview__actions">
            <button className="theme-preset-preview__button theme-preset-preview__button--primary" type="button">
              Gửi yêu cầu tư vấn
            </button>
            <button className="theme-preset-preview__button theme-preset-preview__button--secondary" type="button">
              Xem chi tiết
            </button>
          </div>
        </div>

        <div className="theme-preset-preview__cards">
          {['Hero', 'Card', 'Form'].map((item) => (
            <div className="theme-preset-preview__card" key={item}>
              <span>{item}</span>
              <strong>{item === 'Hero' ? 'Tiêu đề lớn' : item === 'Card' ? 'Khối nội dung' : 'CTA/Form'}</strong>
              <p>Bo góc, nền và mật độ spacing sẽ thay đổi theo lựa chọn.</p>
            </div>
          ))}
        </div>
      </div>

      <div className="theme-preset-preview__meta">
        <span>Màu chính {tokens.brandColor}</span>
        <span>Màu nhấn {tokens.accentColor}</span>
        <span>Radius {tokens.radius}</span>
        <span>Spacing {tokens.spacingScale}</span>
      </div>
    </section>
  )
}
