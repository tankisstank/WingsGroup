'use client'

import React from 'react'
import { useAllFormFields } from '@payloadcms/ui'

import { heroPresentationDefinitions } from '@/heros/presentations/registry'

import './index.scss'

type FormFieldValue = {
  value?: unknown
}

const stringValue = (
  fields: Record<string, FormFieldValue>,
  paths: string[],
  fallback: string,
) => {
  for (const path of paths) {
    const value = fields[path]?.value
    if (typeof value === 'string' && value) return value
  }

  return fallback
}

const templateMediaNotes: Record<string, { fields: string[]; title: string }> = {
  'centered-visual': {
    fields: ['Ảnh hero chính'],
    title: 'Dùng một ảnh lớn dưới phần headline.',
  },
  'cinematic-carousel': {
    fields: ['Slides', 'Ảnh desktop/mobile cho từng slide', 'CTA theo slide nếu cần'],
    title: 'Dùng nhiều ảnh dạng carousel.',
  },
  'gradient-mesh': {
    fields: ['Không bắt buộc media', 'Có thể dùng CTA và badge'],
    title: 'Dùng nền gradient, ít phụ thuộc ảnh.',
  },
  'layered-visuals': {
    fields: ['Ảnh hero chính', 'Visual bổ sung tối đa 3 ảnh'],
    title: 'Dùng một ảnh chính và các ảnh phụ xếp lớp.',
  },
  'planner-split': {
    fields: ['Ảnh hero chính', 'Business behavior = Planner nếu cần panel tư vấn'],
    title: 'Dùng ảnh chính bên cạnh nội dung/planner.',
  },
  'split-visual': {
    fields: ['Ảnh hero chính'],
    title: 'Dùng một ảnh chính ở cạnh phần nội dung.',
  },
  'video-background': {
    fields: ['Video desktop', 'Video mobile nếu có', 'Poster fallback bắt buộc trước publish'],
    title: 'Dùng video nền với poster fallback.',
  },
}

const visualLabels: Record<string, string> = {
  'centered-visual': 'Headline trên · ảnh dưới',
  'cinematic-carousel': 'Slide 1 → Slide 2 → Slide 3',
  'gradient-mesh': 'Gradient motion · không cần ảnh',
  'layered-visuals': 'Ảnh chính + ảnh phụ nổi',
  'planner-split': 'Copy + planner panel + ảnh',
  'split-visual': 'Copy trái · ảnh phải',
  'video-background': 'Poster + video background',
}

export default function HeroPresentationGuide() {
  const [fields] = useAllFormFields()
  const values = fields as Record<string, FormFieldValue>
  const type = stringValue(values, ['hero.type'], 'lowImpact')
  const presentation = stringValue(
    values,
    ['hero.presentation', 'hero.presentationPreset.baseTemplate'],
    'centered-visual',
  )
  const presentationMode = stringValue(values, ['hero.presentationMode'], 'legacy')
  const behaviorMode = stringValue(values, ['hero.behaviorMode'], 'inherit')
  const definition = heroPresentationDefinitions.find((item) => item.value === presentation)
  const mediaNote = templateMediaNotes[presentation] || templateMediaNotes['centered-visual']

  if (type !== 'highImpact') {
    return (
      <section className="hero-presentation-guide hero-presentation-guide--muted">
        <h3>Hero preview</h3>
        <p>Chọn `High Impact` để bật presentation preset, media, slides và video.</p>
      </section>
    )
  }

  return (
    <section className="hero-presentation-guide" data-template={presentation}>
      <div className="hero-presentation-guide__copy">
        <span>Preview cấu trúc hero</span>
        <h3>{definition?.label || visualLabels[presentation] || presentation}</h3>
        <p>{definition?.description || mediaNote.title}</p>
      </div>

      <div className="hero-presentation-guide__canvas" aria-hidden="true">
        <div className="hero-presentation-guide__headline">Headline / CTA</div>
        <div className="hero-presentation-guide__visual">{visualLabels[presentation] || presentation}</div>
      </div>

      <div className="hero-presentation-guide__requirements">
        <strong>Phần cần cấu hình bên dưới</strong>
        <ul>
          {mediaNote.fields.map((field) => (
            <li key={field}>{field}</li>
          ))}
        </ul>
      </div>

      <p className="hero-presentation-guide__meta">
        Nguồn presentation: {presentationMode}. Chuyển động: {behaviorMode}. Nếu page đang kế thừa
        site default, media vẫn phải nhập ở page hiện tại.
      </p>
    </section>
  )
}
