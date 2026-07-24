import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HomeProcessSteps } from '@/components/WingsSideHiFi/HomeProcessSteps'

const steps = [
  { label: 'Step 1 · Brief', title: 'Tell us the essentials', body: 'Month and group size.' },
  { label: 'Step 2 · Match', title: 'We match place + pace', body: 'Route logic for your group.' },
  { label: 'Step 3 · Draft', title: 'Receive a private draft', body: 'A route you can react to.' },
  { label: 'Step 4 · Lock', title: 'Refine, then lock', body: 'Confirm the version together.' },
]

describe('HomeProcessSteps', () => {
  it('renders all four data-driven tabs and the initial panel', () => {
    render(
      <HomeProcessSteps
        ctaLabel="Start your private brief"
        kicker="How Wingside works"
        lede="A short planning flow."
        steps={steps}
        title="Four steps from brief to private route"
      />,
    )

    expect(screen.getAllByRole('tab')).toHaveLength(4)
    expect(screen.getByRole('tabpanel').textContent).toContain('Tell us the essentials')
    expect(screen.getByRole('link', { name: 'Start your private brief' }).getAttribute('href')).toBe(
      '#home-planner',
    )
  })

  it('changes panels by click and supports the tab keyboard model', () => {
    render(
      <HomeProcessSteps
        ctaLabel="Start your private brief"
        kicker="How Wingside works"
        lede="A short planning flow."
        steps={steps}
        title="Four steps from brief to private route"
      />,
    )

    const tabs = screen.getAllByRole('tab')
    fireEvent.click(tabs[2])
    expect(tabs[2].getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tabpanel', { name: 'Draft' }).textContent).toContain(
      'Receive a private draft',
    )

    fireEvent.keyDown(tabs[2], { key: 'ArrowLeft' })
    expect(tabs[1].getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(tabs[1], { key: 'End' })
    expect(tabs[3].getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(tabs[3], { key: 'Home' })
    expect(tabs[0].getAttribute('aria-selected')).toBe('true')
  })
})
