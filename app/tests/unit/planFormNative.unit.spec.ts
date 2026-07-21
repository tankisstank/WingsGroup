import { afterEach, describe, expect, it } from 'vitest'

import { setNativeInputValue } from '@/components/WingsSideHiFi/planFormNative'

describe('planFormNative setNativeInputValue', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('sets value on a text input and dispatches input/change', () => {
    const input = document.createElement('input')
    input.name = 'country'
    document.body.appendChild(input)

    const events: string[] = []
    input.addEventListener('input', () => events.push('input'))
    input.addEventListener('change', () => events.push('change'))

    expect(setNativeInputValue(input, 'Ha Long')).toBe(true)
    expect(input.value).toBe('Ha Long')
    expect(events).toEqual(['input', 'change'])
  })

  it('sets value on textarea (message) via prototype setter path', () => {
    const area = document.createElement('textarea')
    area.name = 'message'
    document.body.appendChild(area)

    expect(setNativeInputValue(area, 'Destinations: Ha Long')).toBe(true)
    expect(area.value).toBe('Destinations: Ha Long')
  })

  it('returns false for null target', () => {
    expect(setNativeInputValue(null, 'x')).toBe(false)
  })
})
