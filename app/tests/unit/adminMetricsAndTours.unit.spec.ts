import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { adminMetricDescriptors } from '../../src/components/AdminMetrics/contract'
import { TourProducts } from '../../src/collections/TourProducts'

const root = path.resolve(__dirname, '../..')
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n')

describe('admin metrics and tours configuration', () => {
  it('includes tours and tourDrafts in admin metric descriptors', () => {
    const keys = adminMetricDescriptors.map((d) => d.key)
    expect(keys).toContain('tours')
    expect(keys).toContain('tourDrafts')

    const tourDescriptor = adminMetricDescriptors.find((d) => d.key === 'tours')
    expect(tourDescriptor?.payloadCollection).toBe('tour-products')
    expect(tourDescriptor?.href).toBe('/admin/collections/tour-products')

    const tourDraftDescriptor = adminMetricDescriptors.find((d) => d.key === 'tourDrafts')
    expect(tourDraftDescriptor?.payloadCollection).toBe('tour-products')
    expect(tourDraftDescriptor?.payloadFilter).toEqual({ _status: { equals: 'draft' } })
  })

  it('configures itineraryDays with initCollapsed: true and informative admin descriptions', () => {
    const findField = (fields: any[], name: string): any => {
      for (const field of fields) {
        if ('name' in field && field.name === name) return field
        if ('fields' in field && Array.isArray(field.fields)) {
          const found = findField(field.fields, name)
          if (found) return found
        }
        if ('tabs' in field && Array.isArray(field.tabs)) {
          for (const tab of field.tabs) {
            if ('fields' in tab && Array.isArray(tab.fields)) {
              const found = findField(tab.fields, name)
              if (found) return found
            }
          }
        }
      }
      return undefined
    }

    const itineraryField = findField(TourProducts.fields as any[], 'itineraryDays')

    expect(itineraryField).toBeDefined()
    expect(itineraryField.admin?.initCollapsed).toBe(true)

    const subFields = itineraryField.fields as any[]
    const summaryField = subFields.find((f) => f.name === 'summary')
    const contentField = subFields.find((f) => f.name === 'content')

    expect(summaryField).toBeDefined()
    expect(summaryField.admin?.description).toBeDefined()
    expect(summaryField.required).toBe(true)

    expect(contentField).toBeDefined()
    expect(contentField.admin?.description).toBeDefined()
    expect(contentField.required).toBe(false)
  })

  it('includes tour-curations in AdminNavIntro content section', () => {
    const navCode = read('src/components/AdminNavIntro/index.tsx')
    expect(navCode).toContain("tourCurations: 'Bộ tour nổi bật'")
    expect(navCode).toContain("{ href: '/admin/collections/tour-curations', Icon: SparklesIcon, key: 'tourCurations' }")
  })
})
