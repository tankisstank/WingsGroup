import type { StatsBlock as StatsBlockProps } from '@/payload-types'

import { CountUp } from '@/components/CountUp'
import { Media } from '@/components/Media'
import React from 'react'

const splitCountValue = (value: unknown) => {
  const text = String(value || '').trim()
  const match = text.match(/^([+-]?\d[\d\s.,]*)(.*)$/)

  if (!match) return null

  const rawNumber = match[1].trim().replace(/\s/g, '')
  const suffix = match[2] || ''
  const separatorMatches = Array.from(rawNumber.matchAll(/[.,]/g))
  let normalized = rawNumber

  if (separatorMatches.length > 0) {
    const lastSeparator = separatorMatches[separatorMatches.length - 1]
    const lastIndex = lastSeparator.index || 0
    const decimals = rawNumber.slice(lastIndex + 1)
    const integer = rawNumber.slice(0, lastIndex)
    const isGroupedThousands = decimals.length === 3 && /^\d+$/.test(integer.replace(/[.,]/g, ''))

    normalized = isGroupedThousands
      ? rawNumber.replace(/[.,]/g, '')
      : `${integer.replace(/[.,]/g, '')}.${decimals}`
  }

  const numericValue = Number(normalized)

  return Number.isFinite(numericValue) ? { suffix, value: numericValue } : null
}

export const StatsBlock: React.FC<StatsBlockProps> = ({
  description,
  eyebrow,
  items,
  presentation = 'inline-bar',
  title,
}) => (
  <section
    className={`container theme-section layout-block layout-block--stats layout-block--${presentation}`}
    data-block-presentation={presentation}
  >
    {(eyebrow || title || description) && (
      <header className="layout-block__header">
        {eyebrow ? <p className="site-brand-kicker">{eyebrow}</p> : null}
        {title ? <h2>{title}</h2> : null}
        {description ? <p>{description}</p> : null}
      </header>
    )}
    <div className="layout-stats">
      {items?.map((item, index) => {
        const countValue = splitCountValue(item.value)

        return (
          <article className="layout-stat" key={`${item.label}-${index}`}>
            {item.logo && typeof item.logo === 'object' ? (
              <Media imgClassName="layout-stat__logo" resource={item.logo} />
            ) : null}
            <strong>
              {countValue ? (
                <CountUp
                  className="layout-stat__count"
                  durationMs={1100 + index * 120}
                  suffix={countValue.suffix}
                  value={countValue.value}
                />
              ) : (
                item.value
              )}
            </strong>
            <h3>{item.label}</h3>
            {item.description ? <p>{item.description}</p> : null}
            {presentation === 'progress' ? (
              <div
                aria-label={`${item.label}: ${item.progress || 0}%`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={item.progress || 0}
                className="layout-stat__progress"
                role="progressbar"
              >
                <span style={{ width: `${item.progress || 0}%` }} />
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  </section>
)
