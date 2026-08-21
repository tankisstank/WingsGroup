import { describe, expect, it } from 'vitest'

import {
  headerPrimaryActionsBySiteCode,
  resolveHeaderPrimaryAction,
} from '@/utilities/headerPrimaryActions'
import { WINGSGROUP_HOME_NAV } from '@/Header/Nav'

describe('header primary action registry', () => {
  it('keeps theme-specific CTA registries explicit', () => {
    expect(Object.keys(headerPrimaryActionsBySiteCode).sort()).toEqual([
      'wing-side',
      'wings-care',
      'wings-go',
      'wings-group',
      'wings-pass',
      'wings-plus',
    ])
  })

  it('resolves locale-specific CTAs with copy-locale fallback', () => {
    expect(resolveHeaderPrimaryAction('wing-side', 'it')).toEqual({
      label: 'Pianifica',
      url: '/plan-your-trip',
    })
    expect(resolveHeaderPrimaryAction('wing-side', 'ja')).toEqual({
      label: 'Plan trip',
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

  it('falls back to the default CTA registry for unknown site codes', () => {
    expect(resolveHeaderPrimaryAction('unknown-theme', 'vi')).toEqual({
      label: 'Liên hệ',
      url: '/lien-he',
    })
    expect(resolveHeaderPrimaryAction(null, 'it')).toEqual({
      label: 'Contact',
      url: '/lien-he',
    })
  })

  it('keeps the mobile WingsGroup contact route separate from the consultation CTA', () => {
    expect(WINGSGROUP_HOME_NAV).toContainEqual({ href: '#contact', label: 'Liên hệ' })
    expect(WINGSGROUP_HOME_NAV).not.toContainEqual({ href: '#contact', label: 'Trao đổi nhu cầu' })
  })
})
