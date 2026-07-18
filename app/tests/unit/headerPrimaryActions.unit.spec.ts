import { describe, expect, it } from 'vitest'

import {
  headerPrimaryActionsByThemeKey,
  resolveHeaderPrimaryAction,
} from '@/utilities/headerPrimaryActions'

describe('header primary action registry', () => {
  it('keeps theme-specific CTA registries explicit', () => {
    expect(Object.keys(headerPrimaryActionsByThemeKey).sort()).toEqual([
      'wings-care',
      'wings-go',
      'wings-group',
      'wings-pass',
      'wings-plus',
      'wings-side',
    ])
  })

  it('resolves locale-specific CTAs with copy-locale fallback', () => {
    expect(resolveHeaderPrimaryAction('wings-side', 'it')).toEqual({
      label: 'Pianifica il viaggio',
      url: '/plan-your-trip',
    })
    expect(resolveHeaderPrimaryAction('wings-side', 'ja')).toEqual({
      label: 'Plan your trip',
      url: '/plan-your-trip',
    })
    expect(resolveHeaderPrimaryAction('wings-go', 'en')).toEqual({
      label: 'Reserve',
      url: '/lien-he',
    })
    expect(resolveHeaderPrimaryAction('wings-go', 'pt')).toEqual({
      label: 'Reserve',
      url: '/lien-he',
    })
    expect(resolveHeaderPrimaryAction('wings-group', 'vi')).toEqual({
      label: 'Liên hệ',
      url: '/lien-he',
    })
  })

  it('falls back to the default CTA registry for unknown theme keys', () => {
    expect(resolveHeaderPrimaryAction('unknown-theme', 'vi')).toEqual({
      label: 'Liên hệ',
      url: '/lien-he',
    })
    expect(resolveHeaderPrimaryAction(null, 'it')).toEqual({
      label: 'Contact',
      url: '/lien-he',
    })
  })
})
