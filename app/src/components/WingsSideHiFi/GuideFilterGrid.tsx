'use client'

import React, { useMemo, useState } from 'react'

import { SiteLink } from '@/components/SiteLink'
import {
  getWingsSideHiFiAlt,
  getWingsSideHiFiPublicUrl,
  type WingsSideHiFiAssetKey,
} from '@/utilities/wingsSideHiFiMedia'

type GuideNote = { body: string; href: string; title: string }

const categories = ['All', 'Seasons', 'Routes', 'Pacing'] as const

export const GuideFilterGrid = ({ notes }: { notes: GuideNote[] }) => {
  const [active, setActive] = useState<(typeof categories)[number]>('All')
  const enriched = useMemo(
    () =>
      notes.map((note, index) => ({
        ...note,
        asset: (['sapa', 'hue', 'planner'] as WingsSideHiFiAssetKey[])[index] || 'sapa',
        category: (['Seasons', 'Routes', 'Pacing'] as const)[index] || 'Routes',
        readTime: `${5 + index} min read`,
      })),
    [notes],
  )
  const visible = active === 'All' ? enriched : enriched.filter((note) => note.category === active)

  return (
    <>
      <div aria-label="Filter travel notes" className="ws-guide-filters" role="group">
        {categories.map((category) => (
          <button
            aria-pressed={active === category}
            className="ws-guide-filter"
            data-active={active === category}
            key={category}
            onClick={() => setActive(category)}
            type="button"
          >
            {category}
          </button>
        ))}
      </div>
      <div className="ws-guide-grid" data-testid="wingsside-hifi-guide-list">
        {visible.map((note) => (
          <SiteLink
            className="ws-guide-card"
            data-od-id={`note-${enriched.indexOf(note) + 1}`}
            href={note.href}
            key={`${note.href}-${enriched.indexOf(note)}`}
          >
            <span className="ws-guide-card__media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={getWingsSideHiFiAlt(note.asset)}
                loading="lazy"
                src={getWingsSideHiFiPublicUrl(note.asset)}
              />
            </span>
            <span className="ws-guide-card__body">
              <span className="micro">
                {note.category} - {note.readTime}
              </span>
              <strong>{note.title}</strong>
              <span>{note.body}</span>
              <span className="ws-hifi-card__action">Read note -&gt;</span>
            </span>
          </SiteLink>
        ))}
      </div>
      <p className="ws-guide-empty" data-od-id="guide-empty-rule" hidden={visible.length > 0}>
        No notes match this filter yet. Choose another topic or send your planning question.
      </p>
    </>
  )
}
