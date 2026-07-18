import { TourProducts } from '@/collections/TourProducts'
import { defaultTourSectionOrder, defaultTourSectionVisibility } from '@/tours/sectionRegistry'
import { tourSectionIDs } from '@/tours/types'
import type { SelectField } from 'payload'
import { describe, expect, it } from 'vitest'

const getBuilderTabFields = () => {
  const tabsField = TourProducts.fields.find(
    (field) => 'name' in field === false && 'tabs' in field,
  )

  if (!tabsField || !('tabs' in tabsField)) {
    throw new Error('TourProducts tabs field not found.')
  }

  const builderTab = tabsField.tabs.find((tab) => tab.label === 'Builder')

  if (!builderTab) {
    throw new Error('TourProducts Builder tab not found.')
  }

  return builderTab.fields
}

const getBuilderField = (fieldName: string): SelectField => {
  const field = getBuilderTabFields().find(
    (candidate) => 'name' in candidate && candidate.name === fieldName,
  )

  if (!field || !('name' in field) || field.type !== 'select') {
    throw new Error(`TourProducts Builder field ${fieldName} not found.`)
  }

  return field
}

describe('tour detail builder admin contract', () => {
  it('keeps section visibility options inside the governed section registry', () => {
    const field = getBuilderField('sectionVisibility')

    expect(field.type).toBe('select')
    expect(field.hasMany).toBe(true)

    const optionValues =
      'options' in field && Array.isArray(field.options)
        ? field.options.map((option) => (typeof option === 'string' ? option : option.value))
        : []

    expect(optionValues).toEqual([
      'hero',
      'facts',
      'why-choose',
      'route',
      'itinerary',
      'services',
      'departures',
      'faq',
      'related',
      'reviews',
      'sticky-cta',
    ])
    expect(new Set(optionValues)).toEqual(new Set(tourSectionIDs))
    expect(field.defaultValue).toEqual([
      'hero',
      'facts',
      'why-choose',
      'route',
      'itinerary',
      'services',
      'departures',
      'faq',
      'related',
    ])
  })

  it('keeps section order defaults aligned with the renderer registry', () => {
    const field = getBuilderField('sectionOrder')

    expect(field.type).toBe('select')
    expect(field.hasMany).toBe(true)
    expect(field.defaultValue).toEqual(defaultTourSectionOrder)

    const optionValues =
      'options' in field && Array.isArray(field.options)
        ? field.options.map((option) => (typeof option === 'string' ? option : option.value))
        : []

    expect(optionValues).toEqual(defaultTourSectionOrder)
    expect(defaultTourSectionVisibility).toEqual(defaultTourSectionOrder)
  })
})
