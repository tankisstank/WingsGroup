'use client'

import React, { useEffect, useMemo, useState } from 'react'

import { useSitePath } from '@/utilities/useSitePath'

export type HomePlannerCopy = {
  chips: string[]
  destinationLabel: string
  destinationOptions: Array<{ label: string; value: string }>
  durationLabel: string
  durationOptions: Array<{ label: string; value: string }>
  formTitle: string
  fullBriefLabel: string
  fullBriefPrefix: string
  kicker: string
  monthLabel: string
  monthOptions: Array<{ label: string; value: string }>
  promises: string[]
  styleLabel: string
  submitLabel: string
  title: string
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const HomePlanner = ({ copy }: { copy: HomePlannerCopy }) => {
  const toSitePath = useSitePath()
  const [clientReady, setClientReady] = useState(false)
  const [destination, setDestination] = useState('')
  const [duration, setDuration] = useState('')
  const [month, setMonth] = useState('')
  const [style, setStyle] = useState(copy.chips[0] || '')

  const styleValue = useMemo(() => slugify(style || ''), [style])

  useEffect(() => setClientReady(true), [])

  return (
    <section
      className="ws-hifi-planner-section section-sm"
      data-client-ready={clientReady ? 'true' : 'false'}
      data-od-id="home-planner"
      data-testid="wingsside-hifi-home-planner"
      id="home-planner"
    >
      <div className="planner">
        <div className="planner-copy">
          <p className="kicker">{copy.kicker}</p>
          <h2 className="h2 planner-title">{copy.title}</h2>
          <ul className="promise-list">
            {copy.promises.map((item) => (
              <li key={item}>
                <strong>{item}</strong>
              </li>
            ))}
          </ul>
        </div>
        <form
          action={toSitePath('/plan-your-trip')}
          className="planner-form"
          data-od-id="home-plan-form"
          method="get"
        >
          <h3 className="form-title">{copy.formTitle}</h3>
          <div className="field">
            <label htmlFor="ws-home-destination">{copy.destinationLabel}</label>
            <select
              className="input"
              data-od-id="home-dest"
              id="ws-home-destination"
              name="destination"
              onChange={(event) => setDestination(event.target.value)}
              value={destination}
            >
              <option value="">{copy.destinationLabel}</option>
              {copy.destinationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ws-home-duration">{copy.durationLabel}</label>
            <select
              className="input"
              id="ws-home-duration"
              name="duration"
              onChange={(event) => setDuration(event.target.value)}
              value={duration}
            >
              <option value="">{copy.durationLabel}</option>
              {copy.durationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ws-home-month">{copy.monthLabel}</label>
            <select
              className="input"
              id="ws-home-month"
              name="month"
              onChange={(event) => setMonth(event.target.value)}
              value={month}
            >
              <option value="">{copy.monthLabel}</option>
              {copy.monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <span className="field-label" id="ws-home-style-label">
              {copy.styleLabel}
            </span>
            <div
              aria-labelledby="ws-home-style-label"
              className="chips"
              data-od-id="home-style-chips"
              role="group"
            >
              {copy.chips.map((chip) => (
                <button
                  aria-pressed={style === chip}
                  className={style === chip ? 'chip is-on' : 'chip'}
                  key={chip}
                  onClick={() => setStyle(chip)}
                  type="button"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
          <input name="style" type="hidden" value={styleValue} />
          <button
            className="btn btn-primary"
            data-od-id="home-plan-submit"
            type="submit"
          >
            {copy.submitLabel}
          </button>
          <p className="planner-footnote">
            {copy.fullBriefPrefix}{' '}
            <a className="planner-footnote__link" href={toSitePath('/plan-your-trip')}>
              {copy.fullBriefLabel}
            </a>
          </p>
        </form>
      </div>
    </section>
  )
}
