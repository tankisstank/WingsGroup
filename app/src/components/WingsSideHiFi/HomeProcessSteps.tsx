'use client'

import React, { useRef, useState } from 'react'

import { getWingsSideHiFiAlt, getWingsSideHiFiPublicUrl } from '@/utilities/wingsSideHiFiMedia'

import './home-process-steps.css'

export type HomeProcessStep = {
  body: string
  label?: string
  title: string
}

type HomeProcessStepsProps = {
  kicker: string
  lede: string
  steps: readonly HomeProcessStep[]
  title: string
  ctaLabel: string
}

const HANDOFFS = [
  { label: 'You send', title: 'A short, useful brief' },
  { label: 'We shape', title: 'Route logic that fits your group' },
  { label: 'You receive', title: 'A route you can react to' },
  { label: 'Together', title: 'Confirm the version that feels right' },
] as const

const TAB_LABELS = ['Brief', 'Match', 'Draft', 'Lock'] as const

export const HomeProcessSteps = ({
  ctaLabel,
  kicker,
  lede,
  steps,
  title,
}: HomeProcessStepsProps) => {
  const [activeStep, setActiveStep] = useState(0)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const visibleSteps = steps.slice(0, 4)

  const activateStep = (index: number, moveFocus = false) => {
    const nextStep = Math.max(0, Math.min(index, visibleSteps.length - 1))
    setActiveStep(nextStep)
    if (moveFocus) tabRefs.current[nextStep]?.focus()
  }

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % visibleSteps.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + visibleSteps.length) % visibleSteps.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = visibleSteps.length - 1

    if (nextIndex !== index) {
      event.preventDefault()
      activateStep(nextIndex, true)
    }
  }

  return (
    <section
      aria-labelledby="home-process-title"
      className="ws-home-process ws-hifi-section section"
      data-od-id="home-pillars"
    >
      <header className="ws-home-process__intro">
        <div>
          <p className="kicker">{kicker}</p>
          <h2 className="h2" id="home-process-title">
            {title}
          </h2>
        </div>
        <p className="lede">{lede}</p>
      </header>

      <div className="ws-home-process__board" data-testid="wingside-home-process-board">
        <aside className="ws-home-process__brief" data-testid="wingside-home-process-brief">
          <span className="ws-home-process__route-line" aria-hidden="true" />
          <p className="ws-home-process__brief-label">Start with what you know</p>
          <h3>A useful brief, not a long form.</h3>
          <p className="ws-home-process__brief-copy">
            Share the essentials. Your planner handles the route logic, pace, and local details.
          </p>
          <ul aria-label="Brief essentials" className="ws-home-process__brief-list">
            <li>Travel month</li>
            <li>Group size</li>
            <li>Region or wish list</li>
            <li>Travel style</li>
          </ul>
          <div className="ws-home-process__planner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={getWingsSideHiFiAlt('planner')}
              decoding="async"
              height={48}
              src={getWingsSideHiFiPublicUrl('planner')}
              width={48}
            />
            <div>
              <strong>One local planning desk</strong>
              <span>Reply within 1 business day · GMT+7</span>
            </div>
          </div>
        </aside>

        <div className="ws-home-process__workflow">
          <div
            aria-label="WingSide planning steps"
            className="ws-home-process__tabs"
            role="tablist"
          >
            {visibleSteps.map((step, index) => {
              const tabId = `home-process-tab-${index}`
              const panelId = `home-process-panel-${index}`
              const selected = index === activeStep
              return (
                <button
                  aria-controls={panelId}
                  aria-selected={selected}
                  className="ws-home-process__tab"
                  data-active={selected}
                  id={tabId}
                  key={`${step.title}-${index}`}
                  onClick={() => activateStep(index)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  ref={(element) => {
                    tabRefs.current[index] = element
                  }}
                  role="tab"
                  tabIndex={selected ? 0 : -1}
                  type="button"
                >
                  <span className="ws-home-process__tab-num" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="ws-home-process__tab-label">
                    {TAB_LABELS[index] || step.label || `Step ${index + 1}`}
                  </span>
                </button>
              )
            })}
          </div>

          <div
            aria-live="polite"
            className="ws-home-process__stage"
            data-testid="wingside-home-process-stage"
          >
            {visibleSteps.map((step, index) => {
              const panelId = `home-process-panel-${index}`
              const tabId = `home-process-tab-${index}`
              const selected = index === activeStep
              const handoff = HANDOFFS[index]
              return (
                <article
                  aria-hidden={!selected}
                  aria-labelledby={tabId}
                  className="ws-home-process__detail"
                  data-active={selected}
                  id={panelId}
                  key={`${step.title}-panel`}
                  role="tabpanel"
                  tabIndex={selected ? 0 : -1}
                >
                  <div className="ws-home-process__detail-copy">
                    <p className="ws-home-process__detail-kicker">
                      {step.label || `Step ${index + 1} · ${TAB_LABELS[index]}`}
                    </p>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                  <aside className="ws-home-process__handoff">
                    <p className="micro">{handoff.label}</p>
                    <strong>{handoff.title}</strong>
                    <p>{step.body}</p>
                  </aside>
                </article>
              )
            })}
          </div>

          <footer className="ws-home-process__footer">
            <span className="ws-home-process__status">No commitment needed for the first brief</span>
            <a className="btn btn-primary" data-od-id="home-process-cta" href="#home-planner">
              {ctaLabel}
            </a>
          </footer>
        </div>
      </div>
    </section>
  )
}
