'use client'

import React, { useMemo } from 'react'
import { useAllFormFields } from '@payloadcms/ui'

import {
  getHeroPresentationAdminMeta,
  getHeroRequirementTone,
} from '@/heros/presentations/admin'
import { defaultHeroBehavior, normalizeHeroBehavior } from '@/heros/presentations/registry'
import type { HeroPresentationKey, HeroTransition } from '@/heros/presentations/types'

import './index.scss'

type FormFieldValue = {
  value?: unknown
}

const stringValue = (fields: Record<string, FormFieldValue>, path: string, fallback: string) => {
  const value = fields[path]?.value
  return typeof value === 'string' && value ? value : fallback
}

const booleanValue = (fields: Record<string, FormFieldValue>, path: string, fallback: boolean) => {
  const value = fields[path]?.value
  return typeof value === 'boolean' ? value : fallback
}

const numberValue = (fields: Record<string, FormFieldValue>, path: string, fallback: number) => {
  const value = fields[path]?.value
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export default function HeroPresentationPresetPreviewField() {
  const [fields] = useAllFormFields()
  const values = fields as Record<string, FormFieldValue>

  const name = stringValue(values, 'name', 'Hero presentation preset')
  const description = stringValue(values, 'description', 'Preview live theo base template, slots và visual controls.')
  const baseTemplate = stringValue(values, 'baseTemplate', 'centered-visual') as HeroPresentationKey
  const meta = getHeroPresentationAdminMeta(baseTemplate)
  const slots = {
    showBadge: booleanValue(values, 'slots.showBadge', true),
    showBusinessPanel: booleanValue(values, 'slots.showBusinessPanel', true),
    showPostcards: booleanValue(values, 'slots.showPostcards', true),
  }
  const visual = {
    contentAlign: stringValue(values, 'visual.contentAlign', 'left'),
    contentPosition: stringValue(values, 'visual.contentPosition', 'left'),
    mediaFit: stringValue(values, 'visual.mediaFit', 'cover'),
    overlayStrength: stringValue(values, 'visual.overlayStrength', 'soft'),
  }
  const behavior = normalizeHeroBehavior({
    autoplay: booleanValue(values, 'behavior.autoplay', defaultHeroBehavior.autoplay),
    intervalMs: numberValue(values, 'behavior.intervalMs', defaultHeroBehavior.intervalMs),
    loop: booleanValue(values, 'behavior.loop', defaultHeroBehavior.loop),
    pauseOnHover: booleanValue(values, 'behavior.pauseOnHover', defaultHeroBehavior.pauseOnHover),
    showArrows: booleanValue(values, 'behavior.showArrows', defaultHeroBehavior.showArrows),
    showDots: booleanValue(values, 'behavior.showDots', defaultHeroBehavior.showDots),
    transition: stringValue(
      values,
      'behavior.transition',
      defaultHeroBehavior.transition,
    ) as HeroTransition,
    transitionMs: numberValue(values, 'behavior.transitionMs', defaultHeroBehavior.transitionMs),
  })

  const behaviorSummary = useMemo(
    () => [
      behavior.autoplay ? `Autoplay ${Math.round(behavior.intervalMs / 1000)}s` : 'Không autoplay',
      `${behavior.transition} ${behavior.transitionMs}ms`,
      behavior.showDots ? 'Có dots' : 'Ẩn dots',
      behavior.showArrows ? 'Có arrows' : 'Ẩn arrows',
    ],
    [behavior],
  )

  return (
    <section className="hero-presentation-preset-preview">
      <div className="hero-presentation-preset-preview__intro">
        <h3>Preview hero preset</h3>
        <p>
          Xem nhanh preset này sẽ tổ chức headline, visual, panel và chuyển động như thế nào trước
          khi cho phép editor sử dụng.
        </p>
      </div>

      <div
        className="hero-presentation-preset-preview__canvas"
        data-overlay-strength={visual.overlayStrength}
        data-template={baseTemplate}
      >
        <div
          className="hero-presentation-preset-preview__copy"
          data-align={visual.contentAlign}
          data-position={visual.contentPosition}
        >
          {slots.showBadge ? <span className="hero-presentation-preset-preview__badge">Preset preview</span> : null}
          <h4>{name}</h4>
          <p>{description}</p>
          <div className="hero-presentation-preset-preview__actions">
            <button type="button">CTA chính</button>
            <button type="button">CTA phụ</button>
          </div>
          {slots.showPostcards ? (
            <div className="hero-presentation-preset-preview__postcards">
              <span>Eyebrow</span>
              <span>Support label</span>
            </div>
          ) : null}
        </div>

        <div className="hero-presentation-preset-preview__visual" data-fit={visual.mediaFit}>
          {baseTemplate === 'cinematic-carousel' ? (
            <>
              <div className="hero-presentation-preset-preview__slide hero-presentation-preset-preview__slide--active">
                Slide 1
              </div>
              <div className="hero-presentation-preset-preview__slide">Slide 2</div>
              {behavior.showDots ? (
                <div className="hero-presentation-preset-preview__dots">
                  <i />
                  <i />
                  <i />
                </div>
              ) : null}
              {behavior.showArrows ? (
                <div className="hero-presentation-preset-preview__arrows">
                  <span>←</span>
                  <span>→</span>
                </div>
              ) : null}
            </>
          ) : baseTemplate === 'video-background' ? (
            <>
              <div className="hero-presentation-preset-preview__video">Video background</div>
              <div className="hero-presentation-preset-preview__poster">Poster</div>
            </>
          ) : baseTemplate === 'planner-split' ? (
            <>
              <div className="hero-presentation-preset-preview__media-card">Ảnh hero</div>
              {slots.showBusinessPanel ? (
                <div className="hero-presentation-preset-preview__panel">Planner panel</div>
              ) : null}
            </>
          ) : baseTemplate === 'layered-visuals' ? (
            <>
              <div className="hero-presentation-preset-preview__media-card">Ảnh chính</div>
              <div className="hero-presentation-preset-preview__float hero-presentation-preset-preview__float--one">
                Visual phụ
              </div>
              <div className="hero-presentation-preset-preview__float hero-presentation-preset-preview__float--two">
                Label
              </div>
            </>
          ) : baseTemplate === 'gradient-mesh' ? (
            <div className="hero-presentation-preset-preview__mesh">Gradient mesh</div>
          ) : (
            <div className="hero-presentation-preset-preview__media-card">Ảnh hero</div>
          )}
        </div>

        <div className="hero-presentation-preset-preview__notes">
          <strong>{meta?.label || baseTemplate}</strong>
          <p>{meta?.visualLabel || 'Preview theo base template hiện tại.'}</p>
        </div>
      </div>

      <div className="hero-presentation-preset-preview__meta">
        {(meta?.requirementSummary || []).map((item) => (
          <span
            className={`hero-presentation-preset-preview__chip hero-presentation-preset-preview__chip--${getHeroRequirementTone(
              item.includes('bắt buộc') ? 'ready' : 'recommended-ready',
            )}`}
            key={item}
          >
            {item}
          </span>
        ))}
      </div>

      <div className="hero-presentation-preset-preview__meta">
        {behaviorSummary.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
  )
}
